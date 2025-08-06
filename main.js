const { Plugin, Setting, Notice, Modal, MarkdownView, TFile, PluginSettingTab, ButtonComponent } = require('obsidian');

// Default configurations
const DEFAULT_TASK_STATES = [
  { id: 'todo', name: 'To Do', icon: '⭕', color: '#64748b', group: 'default' },
  { id: 'in-progress', name: 'In Progress', icon: '🔄', color: '#3b82f6', group: 'default' },
  { id: 'blocked', name: 'Blocked', icon: '🚫', color: '#ef4444', group: 'default' },
  { id: 'review', name: 'Review', icon: '👀', color: '#f59e0b', group: 'default' },
  { id: 'done', name: 'Done', icon: '✅', color: '#10b981', group: 'default' }
];

const DEFAULT_STATE_GROUPS = [
  { id: 'default', name: 'Default', stateOrder: ['todo', 'in-progress', 'blocked', 'review', 'done'] }
];

const DEFAULT_PEOPLE = [];

// Logging utility class
class TaskMasterLogger {
  constructor(plugin) {
    this.plugin = plugin;
    this.logLevels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
  }

  get isDebugEnabled() {
    return this.plugin.settings?.enableDebugLogging || false;
  }

  get logLevel() {
    return this.plugin.settings?.logLevel || 'INFO';
  }

  shouldLog(level) {
    if (!this.isDebugEnabled && level === 'DEBUG') {
      return false;
    }
    return this.logLevels[level] <= this.logLevels[this.logLevel];
  }

  log(level, component, message, data = null) {
    if (!this.shouldLog(level)) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[TaskMaster] [${timestamp}] [${level}] [${component}]`;
    
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }

    // Store logs in plugin data for debugging
    if (this.isDebugEnabled) {
      this.storeLog(level, component, message, data);
    }
  }

  error(component, message, data = null) {
    this.log('ERROR', component, message, data);
  }

  warn(component, message, data = null) {
    this.log('WARN', component, message, data);
  }

  info(component, message, data = null) {
    this.log('INFO', component, message, data);
  }

  debug(component, message, data = null) {
    this.log('DEBUG', component, message, data);
  }

  storeLog(level, component, message, data) {
    if (!this.plugin.debugLogs) {
      this.plugin.debugLogs = [];
    }
    
    this.plugin.debugLogs.push({
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      data: data ? JSON.stringify(data) : null
    });

    // Keep only last 1000 log entries
    if (this.plugin.debugLogs.length > 1000) {
      this.plugin.debugLogs = this.plugin.debugLogs.slice(-1000);
    }
  }

  exportLogs() {
    if (!this.plugin.debugLogs) return '';
    
    return this.plugin.debugLogs
      .map(log => `${log.timestamp} [${log.level}] [${log.component}] ${log.message}${log.data ? ` - ${log.data}` : ''}`)
      .join('\n');
  }

  clearLogs() {
    this.plugin.debugLogs = [];
    this.info('Logger', 'Debug logs cleared');
  }
}

class TaskMasterPlugin extends Plugin {
  async onload() {
    // Initialize logger first
    this.logger = new TaskMasterLogger(this);
    this.logger.info('Plugin', 'Starting TaskMaster plugin initialization...');
    
    // Load settings
    await this.loadSettings();
    this.logger.info('Plugin', 'Settings loaded', { settingsKeys: Object.keys(this.settings) });
    
    // Initialize components
    this.taskManager = new TaskManager(this);
    this.timeTracker = new TimeTracker(this);
    this.peopleManager = new PeopleManager(this);
    this.projectManager = new ProjectManager(this);
    this.logger.info('Plugin', 'Core components initialized');
    
    // Add settings tab
    this.addSettingTab(new TaskMasterSettingTab(this.app, this));
    this.logger.debug('Plugin', 'Settings tab added');
    
    // Register commands
    this.addCommands();
    this.logger.debug('Plugin', 'Commands registered');
    
    // Register markdown post processor for both reading and live preview modes
    this.registerMarkdownPostProcessor((element, context) => {
      // Check if plugin is fully initialized
      if (!this.taskManager || !this.projectManager) {
        console.warn('TaskMaster: Plugin not fully initialized yet');
        return;
      }
      
      try {
        // Process both task elements and multi-state buttons
        this.taskManager.processTaskElements(element, context);
        this.projectManager.processCollapsibleSections(element, context);
      } catch (error) {
        console.error('TaskMaster: Error in markdown post processor:', error);
      }
    });
    this.logger.debug('Plugin', 'Markdown post processor registered');
    
    // Register for workspace events to handle editor changes
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => {
        this.setupEditModeSupport();
      })
    );
    
    this.registerEvent(
      this.app.workspace.on('layout-change', () => {
        this.setupEditModeSupport();
      })
    );
    
    this.logger.debug('Plugin', 'Editor support events registered');
    
    // Register events
    this.registerEvents();
    this.logger.debug('Plugin', 'Events registered');
    
    this.logger.info('Plugin', 'TaskMaster plugin loaded successfully');
  }

  async onunload() {
    this.logger?.info('Plugin', 'Unloading TaskMaster plugin...');
  }

  async loadSettings() {
    this.settings = Object.assign({
      taskStates: DEFAULT_TASK_STATES,
      stateGroups: DEFAULT_STATE_GROUPS,
      people: DEFAULT_PEOPLE,
      defaultState: 'todo',
      defaultGroup: 'default',
      showProgressBars: true,
      enableTimeTracking: true,
      autoSaveInterval: 30000, // 30 seconds
      showLabelsOnCreation: true,
      buttonIdCounter: 1, // For generating unique button IDs
      enableDebugLogging: false,
      logLevel: 'INFO'
    }, await this.loadData());
    
    // Initialize logger after settings are loaded
    if (this.logger) {
      this.logger.debug('Settings', 'Settings loaded successfully', { settings: this.settings });
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  addCommands() {
    // Add command to create new project
    this.addCommand({
      id: 'create-new-project',
      name: 'Create New Project',
      callback: () => {
        new ProjectModal(this.app, this).open();
      }
    });

    // Add command to create multi-state button
    this.addCommand({
      id: 'create-multi-state-button',
      name: 'Create Multi-State Button',
      editorCallback: (editor, view) => {
        this.taskManager.createMultiStateButtonAtCursor(editor, view);
      }
    });

    // Add command to toggle task state
    this.addCommand({
      id: 'toggle-task-state',
      name: 'Toggle Task State',
      editorCallback: (editor, view) => {
        this.taskManager.toggleTaskStateAtCursor(editor, view);
      }
    });

    // Add command to start/stop time tracking
    this.addCommand({
      id: 'toggle-time-tracking',
      name: 'Toggle Time Tracking',
      editorCallback: (editor, view) => {
        this.timeTracker.toggleTimeTracking(editor, view);
      }
    });

    // Add command to show dashboard
    this.addCommand({
      id: 'show-dashboard',
      name: 'Show Dashboard',
      callback: () => {
        new DashboardModal(this.app, this).open();
      }
    });

    // Add command to assign people to task
    this.addCommand({
      id: 'assign-people-to-task',
      name: 'Assign People to Task',
      editorCallback: (editor, view) => {
        this.peopleManager.assignPeopleToTask(editor, view);
      }
    });

    // Add command to filter tasks by assignee
    this.addCommand({
      id: 'filter-tasks-by-assignee',
      name: 'Filter Tasks by Assignee',
      callback: () => {
        new AssigneeFilterModal(this.app, this).open();
      }
    });

    // Add command to toggle project view
    this.addCommand({
      id: 'toggle-project-view',
      name: 'Toggle Project View (List/Kanban/Calendar)',
      editorCallback: (editor, view) => {
        this.projectManager.toggleProjectView(editor, view);
      }
    });

    // Add command to force refresh TaskMaster rendering
    this.addCommand({
      id: 'refresh-taskmaster-rendering',
      name: 'Refresh TaskMaster Rendering',
      callback: () => {
        console.log('TaskMaster: Manual refresh triggered');
        this.refreshAllMarkdownViews();
      }
    });

    // Add command to test button creation directly
    this.addCommand({
      id: 'test-button-creation',
      name: 'Test: Create Button in Active View',
      callback: () => {
        console.log('TaskMaster: Testing direct button creation');
        this.testDirectButtonCreation();
      }
    });

    // Add command to cycle multi-state button at cursor (works in edit mode)
    this.addCommand({
      id: 'cycle-multi-state-button-at-cursor',
      name: 'Cycle Multi-State Button at Cursor',
      hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 't' }],
      editorCallback: (editor, view) => {
        this.cycleButtonAtCursor(editor, view);
      }
    });

    // Add command to render buttons inline in edit mode
    this.addCommand({
      id: 'render-buttons-inline',
      name: 'Render Buttons Inline (Edit Mode)',
      editorCallback: (editor, view) => {
        this.renderButtonsInlineForEditMode(editor, view);
      }
    });

    // Add debugging command to force reprocess current view
    this.addCommand({
      id: 'debug-reprocess-current-view',
      name: 'Debug: Reprocess Current View for Buttons',
      callback: () => {
        this.debugReprocessCurrentView();
      }
    });
  }

  debugReprocessCurrentView() {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) {
      new Notice('No active markdown view found');
      return;
    }

    console.log('TaskMaster: Debug reprocessing current view');
    console.log('TaskMaster: View mode:', activeView.getMode());
    
    // Get the appropriate container based on the mode
    let container;
    if (activeView.getMode() === 'preview') {
      container = activeView.previewMode?.containerEl;
      console.log('TaskMaster: Using preview mode container');
    } else {
      // For source/live preview mode
      container = activeView.contentEl;
      console.log('TaskMaster: Using source mode container');
    }
    
    if (!container) {
      new Notice('Could not find view container');
      return;
    }

    // Create a mock context
    const context = {
      sourcePath: activeView.file?.path,
      frontmatter: {}
    };

    console.log('TaskMaster: Processing container with context:', context);
    
    // Force reprocess
    try {
      this.taskManager.processTaskElements(container, context);
      new Notice('Reprocessed current view for TaskMaster buttons');
    } catch (error) {
      console.error('TaskMaster: Error reprocessing view:', error);
      new Notice('Error reprocessing view: ' + error.message);
    }
  }

  testDirectButtonCreation() {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView || !activeView.previewMode) {
      new Notice('Please switch to reading mode to test button creation');
      return;
    }

    // Find the preview element
    const previewEl = activeView.previewMode.containerEl.querySelector('.markdown-preview-view');
    if (!previewEl) {
      new Notice('Could not find preview element');
      return;
    }

    // Create a test button
    const testButton = this.taskManager.createMultiStateButton('test-direct', 'todo', null);
    
    // Add it to a test div
    const testDiv = document.createElement('div');
    testDiv.style.cssText = 'background: yellow; padding: 8px; margin: 8px; border: 2px solid red;';
    testDiv.appendChild(document.createTextNode('Direct button test: '));
    testDiv.appendChild(testButton);
    
    previewEl.appendChild(testDiv);
    
    new Notice('Test button created directly in DOM');
    console.log('TaskMaster: Test button created and added to DOM');
  }

  cycleButtonAtCursor(editor, view) {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    
    // Check if current line contains a button pattern
    const buttonPattern = /\{\{multi-state-button:([^:]+):([^}]+)\}\}/g;
    let match;
    
    while ((match = buttonPattern.exec(line)) !== null) {
      const [fullMatch, buttonId, currentState] = match;
      const matchStart = match.index;
      const matchEnd = matchStart + fullMatch.length;
      
      // Check if cursor is within this button pattern (with some tolerance)
      if (cursor.ch >= matchStart - 5 && cursor.ch <= matchEnd + 5) {
        // Found the button at cursor, cycle it
        const stateGroup = this.settings.stateGroups.find(g => g.id === this.settings.defaultGroup);
        const stateOrder = stateGroup ? stateGroup.stateOrder : this.settings.taskStates.map(s => s.id);
        
        const currentIndex = stateOrder.indexOf(currentState);
        const nextIndex = (currentIndex + 1) % stateOrder.length;
        const nextStateId = stateOrder[nextIndex];
        
        // Update the line
        const oldPattern = new RegExp(`\\{\\{multi-state-button:${buttonId}:[^}]+\\}\\}`, 'g');
        const newButtonText = `{{multi-state-button:${buttonId}:${nextStateId}}}`;
        const updatedLine = line.replace(oldPattern, newButtonText);
        
        editor.setLine(cursor.line, updatedLine);
        
        // Show feedback
        const nextState = this.settings.taskStates.find(s => s.id === nextStateId);
        if (nextState) {
          new Notice(`${nextState.icon} ${nextState.name}`, 1000);
        }
        
        console.log('TaskMaster: Cycled button at cursor:', { buttonId, newState: nextStateId });
        return;
      }
    }
    
    new Notice('No multi-state button found at cursor position');
  }

  renderButtonsInlineForEditMode(editor, view) {
    // This creates a visual overlay showing button states in edit mode
    const content = editor.getValue();
    const lines = content.split('\n');
    let buttonsFound = 0;
    
    lines.forEach((line, lineIndex) => {
      const buttonPattern = /\{\{multi-state-button:([^:]+):([^}]+)\}\}/g;
      let match;
      
      while ((match = buttonPattern.exec(line)) !== null) {
        const [fullMatch, buttonId, currentState] = match;
        const stateConfig = this.settings.taskStates.find(s => s.id === currentState);
        
        if (stateConfig) {
          // Create a temporary notice showing the button state
          const stateInfo = `${stateConfig.icon} ${stateConfig.name} (${buttonId})`;
          console.log(`Line ${lineIndex + 1}: ${stateInfo}`);
          buttonsFound++;
        }
      }
    });
    
    if (buttonsFound > 0) {
      new Notice(`Found ${buttonsFound} multi-state buttons. Use Ctrl+Shift+T to cycle the button at cursor.`);
      console.log(`TaskMaster: Found ${buttonsFound} buttons in edit mode`);
    } else {
      new Notice('No multi-state buttons found in current document');
    }
  }

  refreshAllMarkdownViews() {
    // Force refresh all open markdown views
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view instanceof MarkdownView) {
        console.log('TaskMaster: Refreshing markdown view:', leaf.view.file?.name);
        // Force re-render by triggering a state change
        const view = leaf.view;
        if (view.previewMode) {
          view.previewMode.rerender(true);
        }
      }
    });
    
    new Notice('TaskMaster rendering refreshed');
  }

  processMultiStateButtonsUniversal(element, context, isLivePreview = false) {
    console.log('TaskMaster: Universal processor called', { 
      element: element.tagName, 
      text: element.textContent?.substring(0, 100),
      context: context,
      isLivePreview: isLivePreview
    });
    
    // Check if plugin is fully initialized
    if (!this.taskManager || !this.projectManager) {
      console.warn('TaskMaster: Plugin not fully initialized yet');
      return;
    }
    
    try {
      // Process both task elements and multi-state buttons
      this.taskManager.processTaskElements(element, context, isLivePreview);
      this.projectManager.processCollapsibleSections(element, context);
    } catch (error) {
      console.error('TaskMaster: Error in universal processor:', error);
    }
  }

  setupEditModeSupport() {
    console.log('TaskMaster: Setting up edit mode support');
    
    // Listen for editor changes to process buttons in live preview
    this.registerEvent(
      this.app.workspace.on('editor-change', (editor, view) => {
        // Debounce to avoid excessive processing
        clearTimeout(this.editModeTimeout);
        this.editModeTimeout = setTimeout(() => {
          this.processEditModeButtons(editor, view);
        }, 300);
      })
    );
    
    // Also process when switching to/from edit mode
    this.registerEvent(
      this.app.workspace.on('layout-change', () => {
        setTimeout(() => {
          this.processCurrentEditMode();
        }, 100);
      })
    );
    
    // Initial processing
    this.processCurrentEditMode();
  }

  processCurrentEditMode() {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) return;
    
    if (activeView.getMode() === 'source') {
      // We're in edit mode, try to process the editor content
      const editor = activeView.editor;
      this.processEditModeButtons(editor, activeView);
    }
  }

  processEditModeButtons(editor, view) {
    if (!editor || !view) return;
    
    console.log('TaskMaster: Processing edit mode buttons');
    
    // Get the editor container
    const editorContainer = view.containerEl.querySelector('.cm-editor');
    if (!editorContainer) {
      console.log('TaskMaster: No editor container found');
      return;
    }
    
    // Create a mock context for processing
    const context = {
      sourcePath: view.file?.path,
      frontmatter: {}
    };
    
    // Process the editor container as if it were a markdown element
    this.taskManager.processTaskElements(editorContainer, context, true);
  }

  registerEvents() {
    // Register file modification events for auto-save
    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (file instanceof TFile && file.extension === 'md') {
          this.projectManager.onFileModified(file);
        }
      })
    );
  }
}

// Task Manager - handles multi-state task tracking
class TaskManager {
  constructor(plugin) {
    this.plugin = plugin;
    this.logger = plugin.logger;
    this.logger?.debug('TaskManager', 'TaskManager initialized');
  }

  processTaskElements(element, context, isLivePreview = false) {
    // Better live preview detection
    const actuallyLivePreview = this.isInLivePreviewMode(element, context);
    
    console.log('TaskMaster: processTaskElements called', { 
      element: element.tagName, 
      contextPath: context?.sourcePath,
      passedLivePreview: isLivePreview,
      detectedLivePreview: actuallyLivePreview 
    });
    
    this.logger?.debug('TaskManager', 'Processing task elements', { 
      elementTag: element.tagName, 
      isLivePreview: actuallyLivePreview 
    });
    
    // Find all task list items and enhance them with TaskMaster functionality
    const taskItems = element.querySelectorAll('li[data-task]');
    this.logger?.debug('TaskManager', `Found ${taskItems.length} task items to process`);
    
    taskItems.forEach((item, index) => {
      this.logger?.debug('TaskManager', `Processing task item ${index + 1}/${taskItems.length}`);
      this.enhanceTaskItem(item, context);
    });

    // Also process multi-state buttons with the new syntax
    console.log('TaskMaster: About to process multi-state buttons', { isLivePreview: actuallyLivePreview });
    this.processMultiStateButtons(element, context, actuallyLivePreview);
  }

  isInLivePreviewMode(element, context) {
    // Multiple ways to detect live preview mode
    
    // Method 1: Check if we're inside a CodeMirror editor
    if (element.closest?.('.cm-editor') || element.closest?.('.cm-content') || element.closest?.('.cm-line')) {
      console.log('TaskMaster: Detected live preview via CodeMirror classes');
      return true;
    }
    
    // Method 2: Check for source view classes
    if (element.closest?.('.markdown-source-view')) {
      console.log('TaskMaster: Detected live preview via source view class');
      return true;
    }
    
    // Method 3: Check current view mode
    const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView && activeView.getMode() === 'source') {
      console.log('TaskMaster: Detected live preview via view mode check');
      return true;
    }
    
    // Method 4: Check if we have a source path (indicates we're in an editor context)
    if (context?.sourcePath && !element.closest?.('.markdown-preview-view')) {
      console.log('TaskMaster: Detected live preview via source path and no preview class');
      return true;
    }
    
    // Method 5: Check for specific CodeMirror content classes
    if (element.classList?.contains('cm-line') || 
        element.classList?.contains('cm-content') ||
        element.querySelector?.('.cm-line')) {
      console.log('TaskMaster: Detected live preview via direct CM classes');
      return true;
    }
    
    console.log('TaskMaster: Not in live preview mode');
    return false;
  }

  processMultiStateButtons(element, context, isLivePreview = false) {
    console.log('TaskMaster: processMultiStateButtons called', { element, isLivePreview });
    this.logger?.debug('TaskManager', 'Processing multi-state buttons', { isLivePreview });
    
    // Find all multi-state button patterns: {{multi-state-button:button_id:status}}
    const buttonPattern = /\{\{multi-state-button:([^:]+):([^}]+)\}\}/g;
    
    // First, let's check if there are any patterns in the entire element
    const elementText = element.textContent || element.innerText || '';
    console.log('TaskMaster: Element text content:', elementText);
    
    if (!buttonPattern.test(elementText)) {
      console.log('TaskMaster: No multi-state button patterns found');
      this.logger?.debug('TaskManager', 'No multi-state button patterns found');
      return;
    }
    
    console.log('TaskMaster: Found multi-state button patterns, processing...', { isLivePreview });
    this.logger?.debug('TaskManager', 'Found multi-state button patterns, processing...', { isLivePreview });
    
    // In live preview mode, we need to be more aggressive about processing
    if (isLivePreview) {
      this.processButtonsForLivePreview(element, context);
    } else {
      this.processButtonsForReadingMode(element, context);
    }
  }

  replaceButtonsInElement(element) {
    const html = element.innerHTML;
    const buttonPattern = /\{\{multi-state-button:([^:]+):([^}]+)\}\}/g;
    
    let updatedHtml = html;
    let match;
    
    while ((match = buttonPattern.exec(html)) !== null) {
      const [fullMatch, buttonId, currentState] = match;
      console.log('TaskMaster: Replacing button in HTML:', { buttonId, currentState });
      
      // Create button HTML
      const buttonHtml = this.createMultiStateButtonHTML(buttonId, currentState);
      updatedHtml = updatedHtml.replace(fullMatch, buttonHtml);
    }
    
    if (updatedHtml !== html) {
      element.innerHTML = updatedHtml;
      console.log('TaskMaster: Updated element HTML with buttons');
      
      // Re-attach event listeners to the newly created buttons
      element.querySelectorAll('.taskmaster-multi-state-button').forEach(button => {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.cycleMultiStateButton(button, null);
        });
      });
    }
  }

  createMultiStateButtonHTML(buttonId, currentState) {
    const stateConfig = this.plugin.settings.taskStates.find(s => s.id === currentState);
    
    let icon = '📝';
    let name = currentState;
    let color = '#666';
    
    if (stateConfig) {
      icon = stateConfig.icon;
      name = stateConfig.name;
      color = stateConfig.color;
    } else {
      const defaultState = this.plugin.settings.taskStates.find(s => s.id === this.plugin.settings.defaultState) || this.plugin.settings.taskStates[0];
      if (defaultState) {
        icon = defaultState.icon;
        name = defaultState.name;
        color = defaultState.color;
      }
    }
    
    return `<button class="taskmaster-multi-state-button" data-button-id="${buttonId}" data-current-state="${currentState}" style="background-color: transparent; border-radius: 4px; padding: 2px 8px; font-size: 12px; cursor: pointer; margin: 0 4px; transition: all 0.2s ease; vertical-align: middle; display: inline-block; color: ${color}; border: 1px solid ${color};">${icon} ${name}</button>`;
  }

  createMultiStateButton(buttonId, currentState, context) {
    console.log('TaskMaster: Creating multi-state button', { buttonId, currentState, settings: this.plugin.settings });
    this.logger?.debug('TaskManager', `Creating multi-state button: ${buttonId} with state: ${currentState}`);
    
    const button = document.createElement('button');
    button.className = 'taskmaster-multi-state-button';
    button.dataset.buttonId = buttonId;
    button.dataset.currentState = currentState;

    // Find the state configuration
    const stateConfig = this.plugin.settings.taskStates.find(s => s.id === currentState);
    console.log('TaskMaster: State config found:', stateConfig);
    
    if (!stateConfig) {
      console.warn('TaskMaster: State not found:', currentState, 'Available states:', this.plugin.settings.taskStates);
      this.logger?.warn('TaskManager', `State not found: ${currentState}, using default`);
      // Fallback to default state if not found
      const defaultState = this.plugin.settings.taskStates.find(s => s.id === this.plugin.settings.defaultState) || this.plugin.settings.taskStates[0];
      if (defaultState) {
        button.innerHTML = `${defaultState.icon} ${defaultState.name}`;
        button.style.color = defaultState.color;
        button.style.border = `1px solid ${defaultState.color}`;
        button.dataset.currentState = defaultState.id;
      } else {
        // Ultimate fallback
        button.innerHTML = `📝 ${currentState}`;
        button.style.color = '#666';
        button.style.border = '1px solid #666';
      }
    } else {
      button.innerHTML = `${stateConfig.icon} ${stateConfig.name}`;
      button.style.color = stateConfig.color;
      button.style.border = `1px solid ${stateConfig.color}`;
    }

    // Common button styling
    button.style.backgroundColor = 'transparent';
    button.style.borderRadius = '4px';
    button.style.padding = '2px 8px';
    button.style.fontSize = '12px';
    button.style.cursor = 'pointer';
    button.style.margin = '0 4px';
    button.style.transition = 'all 0.2s ease';
    button.style.verticalAlign = 'middle';
    button.style.display = 'inline-block';

    // Add hover effects
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = button.style.color + '20';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'transparent';
    });

    // Add click handler for state cycling
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.cycleMultiStateButton(button, context);
    });

    this.logger?.debug('TaskManager', `Multi-state button created successfully`);
    return button;
  }

  cycleMultiStateButton(button, context) {
    const buttonId = button.dataset.buttonId;
    const currentState = button.dataset.currentState;
    
    // Find the state group for this button (default to 'default' group for now)
    const stateGroup = this.plugin.settings.stateGroups.find(g => g.id === this.plugin.settings.defaultGroup);
    const stateOrder = stateGroup ? stateGroup.stateOrder : this.plugin.settings.taskStates.map(s => s.id);
    
    // Find current state index and get next state
    const currentIndex = stateOrder.indexOf(currentState);
    const nextIndex = (currentIndex + 1) % stateOrder.length;
    const nextStateId = stateOrder[nextIndex];
    const nextState = this.plugin.settings.taskStates.find(s => s.id === nextStateId);

    if (nextState) {
      // Update button appearance
      button.innerHTML = `${nextState.icon} ${nextState.name}`;
      button.style.color = nextState.color;
      button.style.border = `1px solid ${nextState.color}`;
      button.dataset.currentState = nextState.id;

      // Update the text in the editor
      this.updateMultiStateButtonInEditor(buttonId, nextStateId);
    }
  }

  updateMultiStateButtonInEditor(buttonId, newStateId) {
    const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) return;

    const editor = activeView.editor;
    const content = editor.getValue();
    
    // Create the pattern to find this specific button
    const oldPattern = new RegExp(`\\{\\{multi-state-button:${buttonId}:[^}]+\\}\\}`, 'g');
    const newButtonText = `{{multi-state-button:${buttonId}:${newStateId}}}`;
    
    // Replace the button text
    const updatedContent = content.replace(oldPattern, newButtonText);
    
    if (updatedContent !== content) {
      editor.setValue(updatedContent);
    }
  }

  processButtonsForLivePreview(element, context) {
    console.log('TaskMaster: Processing buttons for live preview');
    
    // In live preview, we need to be more comprehensive and handle CodeMirror DOM structure
    const buttonPattern = /\{\{multi-state-button:([^:]+):([^}]+)\}\}/g;
    
    // First, try to process the element itself if it contains buttons
    const elementText = element.textContent || '';
    if (buttonPattern.test(elementText)) {
      console.log('TaskMaster: Element itself contains buttons, processing directly');
      this.replaceButtonsInElement(element);
      return; // If we processed the main element, we're done
    }
    
    // Reset pattern
    buttonPattern.lastIndex = 0;
    
    // Check all possible container elements more aggressively for live preview
    const containers = [
      ...element.querySelectorAll('p'),
      ...element.querySelectorAll('td'),
      ...element.querySelectorAll('li'),
      ...element.querySelectorAll('div'),
      ...element.querySelectorAll('span'),
      ...element.querySelectorAll('.cm-line'), // CodeMirror lines
      ...element.querySelectorAll('[class*="cm-"]'), // Any CodeMirror elements
      ...element.querySelectorAll('.HyperMD-codeblock'), // HyperMD elements
      ...element.querySelectorAll('.cm-content'), // CM6 content
      ...element.querySelectorAll('.cm-editor .cm-line') // Nested CM lines
    ];
    
    // Also add the element itself to containers if it has text
    if (elementText.trim()) {
      containers.unshift(element);
    }
    
    // Try to find CodeMirror containers specifically
    const cmContainers = element.querySelectorAll('.cm-line, .cm-content');
    cmContainers.forEach(cmEl => {
      if (!containers.includes(cmEl)) {
        containers.push(cmEl);
      }
    });
    
    console.log(`TaskMaster: Checking ${containers.length} containers for buttons in live preview`);
    
    containers.forEach((container, index) => {
      const containerText = container.textContent || '';
      const testPattern = /\{\{multi-state-button:([^:]+):([^}]+)\}\}/g;
      
      if (testPattern.test(containerText)) {
        console.log(`TaskMaster: Processing live preview container ${index}:`, {
          tagName: container.tagName,
          className: container.className,
          text: containerText.substring(0, 100)
        });
        
        // For CodeMirror elements, we need a different approach
        if (container.classList.contains('cm-line') || container.closest('.cm-editor')) {
          this.processCodeMirrorElement(container, context);
        } else {
          this.replaceButtonsInElement(container);
        }
      }
    });
    
    // Also try the text node approach for live preview
    this.processTextNodesForButtons(element, context);
  }

  processCodeMirrorElement(cmElement, context) {
    console.log('TaskMaster: Processing CodeMirror element for buttons');
    
    // For CodeMirror elements, we need to be more careful about replacing content
    // as it might interfere with the editor's internal state
    const text = cmElement.textContent || '';
    const buttonPattern = /\{\{multi-state-button:([^:]+):([^}]+)\}\}/g;
    
    let match;
    const replacements = [];
    
    while ((match = buttonPattern.exec(text)) !== null) {
      const [fullMatch, buttonId, currentState] = match;
      replacements.push({
        start: match.index,
        end: match.index + fullMatch.length,
        buttonId,
        currentState,
        fullMatch
      });
    }
    
    if (replacements.length > 0) {
      console.log(`TaskMaster: Found ${replacements.length} button patterns in CM element`);
      
      // Create buttons and insert them as adjacent elements rather than replacing text
      replacements.forEach((replacement, index) => {
        const button = this.createMultiStateButton(replacement.buttonId, replacement.currentState, context);
        button.style.cssText += 'position: absolute; z-index: 1000; margin-left: 4px;';
        
        // Try to position the button near the text
        const rect = cmElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          button.style.top = rect.top + 'px';
          button.style.left = (rect.left + rect.width) + 'px';
          document.body.appendChild(button);
          
          // Clean up the button after a delay
          setTimeout(() => {
            if (button.parentNode) {
              button.parentNode.removeChild(button);
            }
          }, 5000);
        }
      });
    }
  }

  processButtonsForReadingMode(element, context) {
    console.log('TaskMaster: Processing buttons for reading mode');
    
    const buttonPattern = /\{\{multi-state-button:([^:]+):([^}]+)\}\}/g;
    
    // Alternative approach: find all paragraph elements and process their HTML
    const paragraphs = element.querySelectorAll('p, td, li, div');
    console.log('TaskMaster: Found paragraphs/cells:', paragraphs.length);
    
    paragraphs.forEach((para, index) => {
      const paraText = para.textContent || '';
      if (buttonPattern.test(paraText)) {
        console.log(`TaskMaster: Processing paragraph ${index} with buttons:`, paraText);
        this.replaceButtonsInElement(para);
      }
    });
    
    // Reset the regex
    buttonPattern.lastIndex = 0;
    
    // Get all text nodes that might contain our pattern
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      // Reset pattern for each node check
      const testPattern = /\{\{multi-state-button:([^:]+):([^}]+)\}\}/g;
      if (testPattern.test(node.textContent)) {
        textNodes.push(node);
      }
    }

    this.logger?.debug('TaskManager', `Found ${textNodes.length} text nodes with button patterns`);
    console.log('TaskMaster: Found text nodes with button patterns:', textNodes.length);

    // Process each text node that contains button patterns
    textNodes.forEach((textNode, index) => {
      this.logger?.debug('TaskManager', `Processing text node ${index + 1}/${textNodes.length}:`, textNode.textContent);
      console.log(`TaskMaster: Processing text node ${index + 1}:`, textNode.textContent);
      
      const content = textNode.textContent;
      // Create a fresh regex for matching
      const matchPattern = /\{\{multi-state-button:([^:]+):([^}]+)\}\}/g;
      const matches = Array.from(content.matchAll(matchPattern));
      
      if (matches.length > 0) {
        this.logger?.debug('TaskManager', `Found ${matches.length} button patterns in text node`);
        console.log(`TaskMaster: Found ${matches.length} button patterns in text node`);
        
        // Create a document fragment to hold the replacement content
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        matches.forEach((match, matchIndex) => {
          const [fullMatch, buttonId, currentState] = match;
          const matchStart = match.index;

          this.logger?.debug('TaskManager', `Processing match ${matchIndex + 1}: buttonId="${buttonId}", state="${currentState}"`);
          console.log(`TaskMaster: Processing match ${matchIndex + 1}:`, { buttonId, currentState });

          // Add text before the match
          if (matchStart > lastIndex) {
            fragment.appendChild(document.createTextNode(content.slice(lastIndex, matchStart)));
          }

          // Create the multi-state button
          const button = this.createMultiStateButton(buttonId, currentState, context);
          fragment.appendChild(button);

          lastIndex = matchStart + fullMatch.length;
        });

        // Add remaining text after the last match
        if (lastIndex < content.length) {
          fragment.appendChild(document.createTextNode(content.slice(lastIndex)));
        }

        // Replace the text node with our fragment
        if (textNode.parentNode) {
          textNode.parentNode.replaceChild(fragment, textNode);
          this.logger?.debug('TaskManager', 'Text node replaced with button fragment');
          console.log('TaskMaster: Text node replaced with button fragment');
        }
      }
    });
  }

  processTextNodesForButtons(element, context) {
    console.log('TaskMaster: Processing text nodes for buttons in live preview');
    
    // Get all text nodes that might contain our pattern
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      // Reset pattern for each node check
      const testPattern = /\{\{multi-state-button:([^:]+):([^}]+)\}\}/g;
      if (testPattern.test(node.textContent)) {
        textNodes.push(node);
      }
    }

    console.log(`TaskMaster: Found ${textNodes.length} text nodes with button patterns`);

    // Process each text node that contains button patterns
    textNodes.forEach((textNode, index) => {
      console.log(`TaskMaster: Processing text node ${index + 1}:`, textNode.textContent);
      
      const content = textNode.textContent;
      // Create a fresh regex for matching
      const matchPattern = /\{\{multi-state-button:([^:]+):([^}]+)\}\}/g;
      const matches = Array.from(content.matchAll(matchPattern));
      
      if (matches.length > 0) {
        console.log(`TaskMaster: Found ${matches.length} button patterns in text node`);
        
        // Create a document fragment to hold the replacement content
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        matches.forEach((match, matchIndex) => {
          const [fullMatch, buttonId, currentState] = match;
          const matchStart = match.index;

          console.log(`TaskMaster: Processing match ${matchIndex + 1}:`, { buttonId, currentState });

          // Add text before the match
          if (matchStart > lastIndex) {
            fragment.appendChild(document.createTextNode(content.slice(lastIndex, matchStart)));
          }

          // Create the multi-state button
          const button = this.createMultiStateButton(buttonId, currentState, context);
          fragment.appendChild(button);

          lastIndex = matchStart + fullMatch.length;
        });

        // Add remaining text after the last match
        if (lastIndex < content.length) {
          fragment.appendChild(document.createTextNode(content.slice(lastIndex)));
        }

        // Replace the text node with our fragment
        if (textNode.parentNode) {
          textNode.parentNode.replaceChild(fragment, textNode);
          console.log('TaskMaster: Text node replaced with button fragment');
        }
      }
    });
  }

  enhanceTaskItem(item, context) {
    const taskText = item.textContent;
    const checkbox = item.querySelector('input[type="checkbox"]');
    
    if (!checkbox) return;

    // Create custom task state button
    const stateButton = this.createTaskStateButton(taskText, checkbox.checked);
    
    // Replace checkbox with state button
    checkbox.style.display = 'none';
    checkbox.parentNode.insertBefore(stateButton, checkbox);

    // Add assignment and time tracking elements
    this.addTaskEnhancements(item, taskText);
  }

  createTaskStateButton(taskText, isCompleted) {
    const button = document.createElement('button');
    button.className = 'taskmaster-state-button';
    
    // Determine current state
    const currentState = this.getCurrentTaskState(taskText, isCompleted);
    const stateConfig = this.plugin.settings.taskStates.find(s => s.id === currentState);
    
    button.innerHTML = `${stateConfig.icon} ${stateConfig.name}`;
    button.style.color = stateConfig.color;
    button.style.border = `1px solid ${stateConfig.color}`;
    button.style.backgroundColor = 'transparent';
    button.style.borderRadius = '4px';
    button.style.padding = '2px 8px';
    button.style.fontSize = '12px';
    button.style.cursor = 'pointer';
    
    button.addEventListener('click', (e) => {
      e.preventDefault();
      this.cycleTaskState(button, taskText);
    });
    
    return button;
  }

  getCurrentTaskState(taskText, isCompleted) {
    // Parse task text for state indicators
    const stateMatch = taskText.match(/\[([^\]]+)\]/);
    if (stateMatch) {
      const stateId = stateMatch[1].toLowerCase().replace(/\s+/g, '-');
      if (this.plugin.settings.taskStates.find(s => s.id === stateId)) {
        return stateId;
      }
    }
    
    return isCompleted ? 'done' : this.plugin.settings.defaultState;
  }

  cycleTaskState(button, taskText) {
    const currentStateId = this.getCurrentTaskState(taskText, false);
    const currentIndex = this.plugin.settings.taskStates.findIndex(s => s.id === currentStateId);
    const nextIndex = (currentIndex + 1) % this.plugin.settings.taskStates.length;
    const nextState = this.plugin.settings.taskStates[nextIndex];
    
    // Update button appearance
    button.innerHTML = `${nextState.icon} ${nextState.name}`;
    button.style.color = nextState.color;
    button.style.border = `1px solid ${nextState.color}`;
    
    // Update task text in editor
    this.updateTaskStateInEditor(taskText, nextState.id);
  }

  updateTaskStateInEditor(taskText, newStateId) {
    const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) return;
    
    const editor = activeView.editor;
    const content = editor.getValue();
    
    // Find and update the task line
    const lines = content.split('\n');
    const taskLineIndex = lines.findIndex(line => line.includes(taskText));
    
    if (taskLineIndex >= 0) {
      const newState = this.plugin.settings.taskStates.find(s => s.id === newStateId);
      let updatedLine = lines[taskLineIndex];
      
      // Remove existing state indicator
      updatedLine = updatedLine.replace(/\[([^\]]+)\]/, '');
      
      // Add new state indicator if not done
      if (newStateId !== 'done') {
        updatedLine = updatedLine.replace(/^(\s*[-*+]\s*)/, `$1[${newState.name}] `);
      }
      
      lines[taskLineIndex] = updatedLine;
      editor.setValue(lines.join('\n'));
    }
  }

  addTaskEnhancements(item, taskText) {
    // Add assignment display
    const assignmentSpan = document.createElement('span');
    assignmentSpan.className = 'taskmaster-assignments';
    assignmentSpan.style.marginLeft = '8px';
    assignmentSpan.style.fontSize = '11px';
    assignmentSpan.style.color = '#666';
    
    // Parse assignments from task text
    const assignments = this.parseAssignments(taskText);
    if (assignments.length > 0) {
      assignmentSpan.textContent = `@${assignments.join(', @')}`;
    }
    
    item.appendChild(assignmentSpan);

    // Add time tracking display
    const timeSpan = document.createElement('span');
    timeSpan.className = 'taskmaster-time';
    timeSpan.style.marginLeft = '8px';
    timeSpan.style.fontSize = '11px';
    timeSpan.style.color = '#666';
    
    const timeData = this.parseTimeData(taskText);
    if (timeData.logged > 0) {
      timeSpan.textContent = `⏱️ ${this.formatTime(timeData.logged)}`;
      if (timeData.estimated > 0) {
        timeSpan.textContent += ` / ${this.formatTime(timeData.estimated)}`;
      }
    }
    
    item.appendChild(timeSpan);
  }

  parseAssignments(taskText) {
    const assignmentRegex = /@(\w+)/g;
    const assignments = [];
    let match;
    
    while ((match = assignmentRegex.exec(taskText)) !== null) {
      assignments.push(match[1]);
    }
    
    return assignments;
  }

  parseTimeData(taskText) {
    const timeRegex = /⏱️\s*(\d+(?:\.\d+)?h|\d+m)/g;
    const estimateRegex = /est:\s*(\d+(?:\.\d+)?h|\d+m)/i;
    
    let logged = 0;
    let estimated = 0;
    
    // Parse logged time
    let match;
    while ((match = timeRegex.exec(taskText)) !== null) {
      logged += this.parseTimeValue(match[1]);
    }
    
    // Parse estimated time
    const estimateMatch = estimateRegex.exec(taskText);
    if (estimateMatch) {
      estimated = this.parseTimeValue(estimateMatch[1]);
    }
    
    return { logged, estimated };
  }

  parseTimeValue(timeStr) {
    const hours = timeStr.match(/(\d+(?:\.\d+)?)h/);
    const minutes = timeStr.match(/(\d+)m/);
    
    let totalMinutes = 0;
    if (hours) totalMinutes += parseFloat(hours[1]) * 60;
    if (minutes) totalMinutes += parseInt(minutes[1]);
    
    return totalMinutes;
  }

  formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  }

  toggleTaskStateAtCursor(editor, view) {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    
    if (line.match(/^\s*[-*+]\s*\[.\]\s/)) {
      // This is a task line, cycle its state
      const taskText = line.trim();
      const currentState = this.getCurrentTaskState(taskText, false);
      const currentIndex = this.plugin.settings.taskStates.findIndex(s => s.id === currentState);
      const nextIndex = (currentIndex + 1) % this.plugin.settings.taskStates.length;
      const nextState = this.plugin.settings.taskStates[nextIndex];
      
      this.updateTaskStateInEditor(taskText, nextState.id);
    }
  }

  createMultiStateButtonAtCursor(editor, view) {
    const cursor = editor.getCursor();
    
    // Generate unique button ID
    const buttonId = `btn_${this.plugin.settings.buttonIdCounter}`;
    this.plugin.settings.buttonIdCounter += 1;
    this.plugin.saveSettings();

    // Get the default state
    const defaultState = this.plugin.settings.defaultState;
    
    // Create the button text
    let buttonText = `{{multi-state-button:${buttonId}:${defaultState}}}`;
    
    // If showLabelsOnCreation is enabled, show a modal to get button details
    if (this.plugin.settings.showLabelsOnCreation) {
      new MultiStateButtonCreationModal(this.plugin.app, this.plugin, (buttonConfig) => {
        if (buttonConfig.label) {
          buttonText = `${buttonConfig.label} {{multi-state-button:${buttonId}:${buttonConfig.initialState}}}`;
        } else {
          buttonText = `{{multi-state-button:${buttonId}:${buttonConfig.initialState}}}`;
        }
        editor.replaceRange(buttonText, cursor);
      }).open();
    } else {
      // Insert the button directly
      editor.replaceRange(buttonText, cursor);
    }
  }
}

// Time Tracker - handles time logging and tracking
class TimeTracker {
  constructor(plugin) {
    this.plugin = plugin;
    this.activeTimers = new Map(); // taskId -> { startTime, taskText, file }
  }

  toggleTimeTracking(editor, view) {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    
    if (!line.match(/^\s*[-*+]\s*\[.\]\s/)) {
      new Notice('Place cursor on a task line to track time');
      return;
    }
    
    const taskId = this.generateTaskId(line, view.file.path);
    
    if (this.activeTimers.has(taskId)) {
      this.stopTimer(taskId, editor, cursor.line);
    } else {
      this.startTimer(taskId, line, view.file);
    }
  }

  generateTaskId(taskText, filePath) {
    return `${filePath}:${taskText.trim()}`;
  }

  startTimer(taskId, taskText, file) {
    this.activeTimers.set(taskId, {
      startTime: Date.now(),
      taskText: taskText,
      file: file
    });
    
    new Notice(`⏱️ Started tracking time for task`);
  }

  stopTimer(taskId, editor, lineNumber) {
    const timerData = this.activeTimers.get(taskId);
    if (!timerData) return;
    
    const duration = Date.now() - timerData.startTime;
    const minutes = Math.round(duration / 60000);
    
    this.activeTimers.delete(taskId);
    
    // Update the task line with logged time
    const line = editor.getLine(lineNumber);
    const timeStr = this.formatTimeForTask(minutes);
    const updatedLine = line + ` ⏱️${timeStr}`;
    
    editor.setLine(lineNumber, updatedLine);
    
    new Notice(`⏹️ Logged ${timeStr} for task`);
  }

  formatTimeForTask(minutes) {
    if (minutes < 60) {
      return `${minutes}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h${remainingMinutes}m` : `${hours}h`;
    }
  }
}

// People Manager - handles people and assignments
class PeopleManager {
  constructor(plugin) {
    this.plugin = plugin;
  }

  assignPeopleToTask(editor, view) {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    
    if (!line.match(/^\s*[-*+]\s*\[.\]\s/)) {
      new Notice('Place cursor on a task line to assign people');
      return;
    }
    
    new AssignmentModal(this.plugin.app, this.plugin, (selectedPeople) => {
      this.updateTaskAssignments(editor, cursor.line, selectedPeople);
    }).open();
  }

  updateTaskAssignments(editor, lineNumber, assignments) {
    const line = editor.getLine(lineNumber);
    
    // Remove existing assignments
    let updatedLine = line.replace(/@\w+/g, '').trim();
    
    // Add new assignments
    if (assignments.length > 0) {
      const assignmentText = assignments.map(p => `@${p.name}`).join(' ');
      updatedLine = `${updatedLine} ${assignmentText}`;
    }
    
    editor.setLine(lineNumber, updatedLine);
  }
}

// Project Manager - handles project structure and organization
class ProjectManager {
  constructor(plugin) {
    this.plugin = plugin;
    this.logger = plugin.logger;
    this.logger?.debug('ProjectManager', 'ProjectManager initialized');
  }

  processCollapsibleSections(element, context) {
    this.logger?.debug('ProjectManager', 'Processing collapsible sections');
    
    // Find headings that should be collapsible
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    headings.forEach(heading => {
      // Check if heading text contains collapsible markers
      const headingText = heading.textContent;
      const isCollapsibleMarker = headingText.includes('[+]') || headingText.includes('[-]');
      const isPhaseMarker = headingText.toLowerCase().includes('phase') || 
                           headingText.toLowerCase().includes('milestone') || 
                           headingText.toLowerCase().includes('epic');
      
      if (isCollapsibleMarker || isPhaseMarker) {
        this.makeHeadingCollapsible(heading, context);
      }
    });
  }

  makeHeadingCollapsible(heading, context) {
    // Don't process if already processed
    if (heading.classList.contains('taskmaster-collapsible')) return;
    
    heading.classList.add('taskmaster-collapsible');
    
    // Determine initial state
    const headingText = heading.textContent;
    const isCollapsed = headingText.includes('[+]');
    const isExpanded = headingText.includes('[-]');
    
    // Clean up the heading text
    let cleanText = headingText.replace(/\[\+\]|\[-\]/g, '').trim();
    
    // Create toggle button
    const toggleButton = document.createElement('span');
    toggleButton.className = 'taskmaster-collapse-toggle';
    toggleButton.style.cssText = `
      margin-right: 8px;
      cursor: pointer;
      user-select: none;
      font-family: monospace;
      color: var(--text-muted);
      font-size: 0.8em;
    `;
    
    // Set initial state
    let collapsed = isCollapsed;
    if (!isCollapsed && !isExpanded) {
      // Default to expanded for phase/milestone/epic headings
      collapsed = false;
    }
    
    toggleButton.textContent = collapsed ? '[+]' : '[-]';
    
    // Update heading text
    heading.textContent = cleanText;
    heading.prepend(toggleButton);
    
    // Find content to collapse (everything until next heading of same or higher level)
    const contentElements = this.findSectionContent(heading);
    
    // Set initial visibility
    if (collapsed) {
      contentElements.forEach(el => {
        el.style.display = 'none';
      });
    }
    
    // Add click handler
    toggleButton.addEventListener('click', (e) => {
      e.preventDefault();
      collapsed = !collapsed;
      toggleButton.textContent = collapsed ? '[+]' : '[-]';
      
      contentElements.forEach(el => {
        el.style.display = collapsed ? 'none' : '';
      });
      
      // Update the source text if this is in edit mode
      this.updateCollapsibleMarkerInEditor(heading, collapsed);
      
      this.logger?.debug('ProjectManager', `Section ${collapsed ? 'collapsed' : 'expanded'}`, { headingText: cleanText });
    });
  }

  findSectionContent(heading) {
    const headingLevel = parseInt(heading.tagName.substring(1)); // h1 -> 1, h2 -> 2, etc.
    const contentElements = [];
    let currentElement = heading.nextElementSibling;
    
    while (currentElement) {
      // Stop if we hit another heading of the same or higher level
      if (currentElement.tagName && currentElement.tagName.match(/^H[1-6]$/)) {
        const currentLevel = parseInt(currentElement.tagName.substring(1));
        if (currentLevel <= headingLevel) {
          break;
        }
      }
      
      contentElements.push(currentElement);
      currentElement = currentElement.nextElementSibling;
    }
    
    return contentElements;
  }

  updateCollapsibleMarkerInEditor(heading, collapsed) {
    const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) return;
    
    const editor = activeView.editor;
    const content = editor.getValue();
    const headingText = heading.textContent;
    
    // Find the heading line and update the marker
    const lines = content.split('\n');
    const headingLineIndex = lines.findIndex(line => {
      const cleanLine = line.replace(/^#+\s*/, '').replace(/\[\+\]|\[-\]/g, '').trim();
      return cleanLine === headingText;
    });
    
    if (headingLineIndex >= 0) {
      const line = lines[headingLineIndex];
      const marker = collapsed ? '[+]' : '[-]';
      
      // Remove existing markers and add new one
      const updatedLine = line.replace(/\[\+\]|\[-\]/g, '').replace(/^(#+\s*)/, `$1${marker} `);
      lines[headingLineIndex] = updatedLine;
      
      editor.setValue(lines.join('\n'));
    }
  }

  toggleProjectView(editor, view) {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    
    // Check if we're in a project file or if there's a view marker
    const currentView = this.detectCurrentView(editor);
    const nextView = this.getNextView(currentView);
    
    this.applyProjectView(editor, nextView);
    new Notice(`Switched to ${nextView} view`);
  }

  detectCurrentView(editor) {
    const content = editor.getValue();
    
    // Look for view markers
    if (content.includes('<!-- VIEW: kanban -->')) return 'kanban';
    if (content.includes('<!-- VIEW: calendar -->')) return 'calendar';
    if (content.includes('<!-- VIEW: list -->')) return 'list';
    
    // Default to list view
    return 'list';
  }

  getNextView(currentView) {
    const views = ['list', 'kanban', 'calendar'];
    const currentIndex = views.indexOf(currentView);
    return views[(currentIndex + 1) % views.length];
  }

  applyProjectView(editor, viewType) {
    const content = editor.getValue();
    let updatedContent = content;
    
    // Remove existing view markers
    updatedContent = updatedContent.replace(/<!-- VIEW: \w+ -->\n?/g, '');
    
    // Add new view marker at the top
    const lines = updatedContent.split('\n');
    
    // Find a good place to insert the view marker (after title)
    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('#') && !lines[i].includes('VIEW:')) {
        insertIndex = i + 1;
        break;
      }
    }
    
    lines.splice(insertIndex, 0, `<!-- VIEW: ${viewType} -->`);
    
    // Transform content based on view type
    if (viewType === 'kanban') {
      updatedContent = this.transformToKanban(lines.join('\n'));
    } else if (viewType === 'calendar') {
      updatedContent = this.transformToCalendar(lines.join('\n'));
    } else {
      updatedContent = this.transformToList(lines.join('\n'));
    }
    
    editor.setValue(updatedContent);
  }

  transformToKanban(content) {
    // Convert task lists into Kanban columns
    const lines = content.split('\n');
    const kanbanSections = {
      'To Do': [],
      'In Progress': [],
      'Review': [],
      'Done': []
    };
    
    lines.forEach(line => {
      if (line.match(/^\s*[-*+]\s*\[.\]\s/) || line.includes('{{multi-state-button:')) {
        // Determine which column this task belongs to
        let column = 'To Do';
        
        if (line.includes('in-progress') || line.includes('In Progress')) {
          column = 'In Progress';
        } else if (line.includes('review') || line.includes('Review')) {
          column = 'Review';
        } else if (line.includes('done') || line.includes('Done') || line.includes('[x]')) {
          column = 'Done';
        }
        
        kanbanSections[column].push(line);
      }
    });
    
    // Build Kanban board structure
    let kanbanContent = content;
    
    // Add Kanban board section if it doesn't exist
    if (!content.includes('## Kanban Board')) {
      const kanbanBoard = `

## Kanban Board

### 📋 To Do
${kanbanSections['To Do'].join('\n')}

### 🔄 In Progress
${kanbanSections['In Progress'].join('\n')}

### 👀 Review
${kanbanSections['Review'].join('\n')}

### ✅ Done
${kanbanSections['Done'].join('\n')}
`;
      kanbanContent += kanbanBoard;
    }
    
    return kanbanContent;
  }

  transformToCalendar(content) {
    // Add calendar view structure
    const today = new Date();
    const currentMonth = today.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const calendarSection = `

## Calendar View - ${currentMonth}

*Calendar integration coming soon - this will show tasks by due date*

| Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|-----|-----|-----|-----|-----|-----|-----|
|     |     |     |     |     |     |     |
|     |     |     |     |     |     |     |
|     |     |     |     |     |     |     |
|     |     |     |     |     |     |     |

`;
    
    return content + calendarSection;
  }

  transformToList(content) {
    // Ensure we have a clean list structure
    if (!content.includes('## Tasks') && !content.includes('## Task List')) {
      const listSection = `

## Task List

*Tasks will be organized in list format*

`;
      return content + listSection;
    }
    
    return content;
  }

  onFileModified(file) {
    // Auto-save project data when markdown files are modified
    // This could be used to update project statistics, time tracking, etc.
    this.logger?.debug('ProjectManager', 'File modified', { fileName: file.name });
  }
}

// Settings Tab
class TaskMasterSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'TaskMaster Settings' });

    // State Groups Section
    this.displayStateGroupsSection(containerEl);

    // Task States Section
    this.displayTaskStatesSection(containerEl);
    
    // People Section
    this.displayPeopleSection(containerEl);
    
    // General Settings Section
    this.displayGeneralSettings(containerEl);
  }

  displayStateGroupsSection(containerEl) {
    containerEl.createEl('h3', { text: 'State Groups' });
    containerEl.createEl('p', { 
      text: 'Create different groups of states with custom ordering. Each button can cycle through states in its assigned group.',
      cls: 'setting-item-description'
    });

    // State groups list
    const groupsContainer = containerEl.createDiv('taskmaster-groups-container');
    this.refreshStateGroupsList(groupsContainer);

    // Add new group button
    new Setting(containerEl)
      .setName('Add State Group')
      .setDesc('Add a new state group with custom state ordering')
      .addButton(button => {
        button
          .setButtonText('Add Group')
          .setCta()
          .onClick(() => {
            new StateGroupModal(this.app, this.plugin, null, () => {
              this.refreshStateGroupsList(groupsContainer);
            }).open();
          });
      });
  }

  refreshStateGroupsList(container) {
    container.empty();

    this.plugin.settings.stateGroups.forEach((group, index) => {
      const groupEl = container.createDiv('taskmaster-group-item');
      groupEl.style.cssText = `
        display: flex;
        align-items: center;
        padding: 12px;
        margin: 8px 0;
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        background: var(--background-secondary);
      `;

      // Group info
      const infoEl = groupEl.createDiv();
      infoEl.style.flex = '1';
      
      const nameEl = infoEl.createEl('div', { text: group.name });
      nameEl.style.fontWeight = '500';
      
      const statesEl = infoEl.createEl('div');
      statesEl.style.fontSize = '12px';
      statesEl.style.color = 'var(--text-muted)';
      statesEl.style.marginTop = '4px';
      
      // Show state order with icons
      const stateOrder = group.stateOrder.map(stateId => {
        const state = this.plugin.settings.taskStates.find(s => s.id === stateId);
        return state ? `${state.icon} ${state.name}` : stateId;
      }).join(' → ');
      statesEl.textContent = `Order: ${stateOrder}`;

      // Action buttons
      const actionsEl = groupEl.createDiv();
      actionsEl.style.cssText = 'display: flex; gap: 8px;';

      // Edit button
      const editBtn = actionsEl.createEl('button', { text: 'Edit' });
      editBtn.onclick = () => {
        new StateGroupModal(this.app, this.plugin, group, () => {
          this.refreshStateGroupsList(container);
        }).open();
      };

      // Delete button (don't allow deleting the default group)
      if (group.id !== 'default') {
        const deleteBtn = actionsEl.createEl('button', { text: 'Delete' });
        deleteBtn.style.color = 'var(--text-error)';
        deleteBtn.onclick = () => {
          this.deleteStateGroup(index);
          this.refreshStateGroupsList(container);
        };
      }
    });
  }

  deleteStateGroup(index) {
    this.plugin.settings.stateGroups.splice(index, 1);
    this.plugin.saveSettings();
  }

  displayTaskStatesSection(containerEl) {
    containerEl.createEl('h3', { text: 'Task States' });
    containerEl.createEl('p', { 
      text: 'Configure the different states a task can have. Tasks will cycle through these states when clicked.',
      cls: 'setting-item-description'
    });

    // Task states list
    const statesContainer = containerEl.createDiv('taskmaster-states-container');
    this.refreshTaskStatesList(statesContainer);

    // Add new state button
    new Setting(containerEl)
      .setName('Add Task State')
      .setDesc('Add a new task state')
      .addButton(button => {
        button
          .setButtonText('Add State')
          .setCta()
          .onClick(() => {
            new TaskStateModal(this.app, this.plugin, null, () => {
              this.refreshTaskStatesList(statesContainer);
            }).open();
          });
      });
  }

  refreshTaskStatesList(container) {
    container.empty();

    this.plugin.settings.taskStates.forEach((state, index) => {
      const stateEl = container.createDiv('taskmaster-state-item');
      stateEl.style.cssText = `
        display: flex;
        align-items: center;
        padding: 8px;
        margin: 4px 0;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        background: var(--background-secondary);
      `;

      // State preview
      const preview = stateEl.createSpan();
      preview.innerHTML = `${state.icon} ${state.name}`;
      preview.style.cssText = `
        color: ${state.color};
        font-weight: 500;
        flex: 1;
      `;

      // Action buttons
      const actionsEl = stateEl.createDiv();
      actionsEl.style.cssText = 'display: flex; gap: 8px;';

      // Move up button
      if (index > 0) {
        const upBtn = actionsEl.createEl('button', { text: '↑' });
        upBtn.onclick = () => {
          this.moveTaskState(index, index - 1);
          this.refreshTaskStatesList(container);
        };
      }

      // Move down button
      if (index < this.plugin.settings.taskStates.length - 1) {
        const downBtn = actionsEl.createEl('button', { text: '↓' });
        downBtn.onclick = () => {
          this.moveTaskState(index, index + 1);
          this.refreshTaskStatesList(container);
        };
      }

      // Edit button
      const editBtn = actionsEl.createEl('button', { text: 'Edit' });
      editBtn.onclick = () => {
        new TaskStateModal(this.app, this.plugin, state, () => {
          this.refreshTaskStatesList(container);
        }).open();
      };

      // Delete button
      if (this.plugin.settings.taskStates.length > 1) {
        const deleteBtn = actionsEl.createEl('button', { text: 'Delete' });
        deleteBtn.style.color = 'var(--text-error)';
        deleteBtn.onclick = () => {
          this.deleteTaskState(index);
          this.refreshTaskStatesList(container);
        };
      }
    });
  }

  moveTaskState(fromIndex, toIndex) {
    const states = this.plugin.settings.taskStates;
    const [movedState] = states.splice(fromIndex, 1);
    states.splice(toIndex, 0, movedState);
    this.plugin.saveSettings();
  }

  deleteTaskState(index) {
    this.plugin.settings.taskStates.splice(index, 1);
    this.plugin.saveSettings();
  }

  displayPeopleSection(containerEl) {
    containerEl.createEl('h3', { text: 'People' });
    containerEl.createEl('p', { 
      text: 'Manage the people who can be assigned to tasks and projects.',
      cls: 'setting-item-description'
    });

    // People list
    const peopleContainer = containerEl.createDiv('taskmaster-people-container');
    this.refreshPeopleList(peopleContainer);

    // Add new person button
    new Setting(containerEl)
      .setName('Add Person')
      .setDesc('Add a new person to the team')
      .addButton(button => {
        button
          .setButtonText('Add Person')
          .setCta()
          .onClick(() => {
            new PersonModal(this.app, this.plugin, null, () => {
              this.refreshPeopleList(peopleContainer);
            }).open();
          });
      });
  }

  refreshPeopleList(container) {
    container.empty();

    if (this.plugin.settings.people.length === 0) {
      container.createEl('p', { 
        text: 'No people added yet. Add people to assign them to tasks.',
        cls: 'setting-item-description'
      });
      return;
    }

    this.plugin.settings.people.forEach((person, index) => {
      const personEl = container.createDiv('taskmaster-person-item');
      personEl.style.cssText = `
        display: flex;
        align-items: center;
        padding: 8px;
        margin: 4px 0;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        background: var(--background-secondary);
      `;

      // Person info
      const infoEl = personEl.createDiv();
      infoEl.style.flex = '1';
      
      const nameEl = infoEl.createEl('div', { text: person.name });
      nameEl.style.fontWeight = '500';
      
      if (person.email) {
        const emailEl = infoEl.createEl('div', { text: person.email });
        emailEl.style.fontSize = '12px';
        emailEl.style.color = 'var(--text-muted)';
      }
      
      if (person.role) {
        const roleEl = infoEl.createEl('div', { text: person.role });
        roleEl.style.fontSize = '12px';
        roleEl.style.color = 'var(--text-accent)';
      }

      // Action buttons
      const actionsEl = personEl.createDiv();
      actionsEl.style.cssText = 'display: flex; gap: 8px;';

      // Edit button
      const editBtn = actionsEl.createEl('button', { text: 'Edit' });
      editBtn.onclick = () => {
        new PersonModal(this.app, this.plugin, person, () => {
          this.refreshPeopleList(container);
        }).open();
      };

      // Delete button
      const deleteBtn = actionsEl.createEl('button', { text: 'Delete' });
      deleteBtn.style.color = 'var(--text-error)';
      deleteBtn.onclick = () => {
        this.deletePerson(index);
        this.refreshPeopleList(container);
      };
    });
  }

  deletePerson(index) {
    this.plugin.settings.people.splice(index, 1);
    this.plugin.saveSettings();
  }

  displayGeneralSettings(containerEl) {
    containerEl.createEl('h3', { text: 'General Settings' });

    new Setting(containerEl)
      .setName('Default Task State')
      .setDesc('The default state for new tasks')
      .addDropdown(dropdown => {
        this.plugin.settings.taskStates.forEach(state => {
          dropdown.addOption(state.id, state.name);
        });
        dropdown.setValue(this.plugin.settings.defaultState);
        dropdown.onChange(async (value) => {
          this.plugin.settings.defaultState = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Default State Group')
      .setDesc('The default group for new multi-state buttons')
      .addDropdown(dropdown => {
        this.plugin.settings.stateGroups.forEach(group => {
          dropdown.addOption(group.id, group.name);
        });
        dropdown.setValue(this.plugin.settings.defaultGroup);
        dropdown.onChange(async (value) => {
          this.plugin.settings.defaultGroup = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Show Labels on Creation')
      .setDesc('Show a dialog to add labels when creating multi-state buttons')
      .addToggle(toggle => {
        toggle.setValue(this.plugin.settings.showLabelsOnCreation);
        toggle.onChange(async (value) => {
          this.plugin.settings.showLabelsOnCreation = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Show Progress Bars')
      .setDesc('Display progress bars for projects')
      .addToggle(toggle => {
        toggle.setValue(this.plugin.settings.showProgressBars);
        toggle.onChange(async (value) => {
          this.plugin.settings.showProgressBars = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Enable Time Tracking')
      .setDesc('Enable time tracking features')
      .addToggle(toggle => {
        toggle.setValue(this.plugin.settings.enableTimeTracking);
        toggle.onChange(async (value) => {
          this.plugin.settings.enableTimeTracking = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Auto-save Interval')
      .setDesc('How often to auto-save data (in seconds)')
      .addText(text => {
        text.setValue(String(this.plugin.settings.autoSaveInterval / 1000));
        text.onChange(async (value) => {
          const seconds = parseInt(value) || 30;
          this.plugin.settings.autoSaveInterval = seconds * 1000;
          await this.plugin.saveSettings();
        });
      });

    // Debug Settings Section
    containerEl.createEl('h3', { text: 'Debug Settings' });

    new Setting(containerEl)
      .setName('Enable Debug Logging')
      .setDesc('Enable detailed logging for debugging (check console)')
      .addToggle(toggle => {
        toggle.setValue(this.plugin.settings.enableDebugLogging);
        toggle.onChange(async (value) => {
          this.plugin.settings.enableDebugLogging = value;
          await this.plugin.saveSettings();
          this.plugin.logger.info('Settings', `Debug logging ${value ? 'enabled' : 'disabled'}`);
        });
      });

    new Setting(containerEl)
      .setName('Log Level')
      .setDesc('Set the minimum log level to display')
      .addDropdown(dropdown => {
        dropdown.addOption('ERROR', 'Error');
        dropdown.addOption('WARN', 'Warning');
        dropdown.addOption('INFO', 'Info');
        dropdown.addOption('DEBUG', 'Debug');
        dropdown.setValue(this.plugin.settings.logLevel);
        dropdown.onChange(async (value) => {
          this.plugin.settings.logLevel = value;
          await this.plugin.saveSettings();
          this.plugin.logger.info('Settings', `Log level set to ${value}`);
        });
      });

    new Setting(containerEl)
      .setName('Export Debug Logs')
      .setDesc('Export all debug logs to a file')
      .addButton(button => {
        button
          .setButtonText('Export Logs')
          .onClick(async () => {
            const logs = this.plugin.logger.exportLogs();
            if (!logs) {
              new Notice('No debug logs to export');
              return;
            }
            
            const filename = `TaskMaster-Debug-Logs-${new Date().toISOString().split('T')[0]}.txt`;
            try {
              await this.app.vault.create(filename, logs);
              new Notice(`Debug logs exported to ${filename}`);
            } catch (error) {
              new Notice(`Failed to export logs: ${error.message}`);
            }
          });
      });

    new Setting(containerEl)
      .setName('Clear Debug Logs')
      .setDesc('Clear all stored debug logs')
      .addButton(button => {
        button
          .setButtonText('Clear Logs')
          .setWarning()
          .onClick(() => {
            this.plugin.logger.clearLogs();
            new Notice('Debug logs cleared');
          });
      });
  }
}

// State Group Modal
class StateGroupModal extends Modal {
  constructor(app, plugin, group, onSave) {
    super(app);
    this.plugin = plugin;
    this.group = group;
    this.onSave = onSave;
    this.isEditing = !!group;
    
    if (!this.isEditing) {
      this.group = {
        id: '',
        name: '',
        stateOrder: [...this.plugin.settings.taskStates.map(s => s.id)]
      };
    } else {
      // Make a copy to avoid modifying the original
      this.group = {
        ...group,
        stateOrder: [...group.stateOrder]
      };
    }
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: this.isEditing ? 'Edit State Group' : 'Add State Group' });

    // Name input
    new Setting(contentEl)
      .setName('Group Name')
      .setDesc('Name for this state group')
      .addText(text => {
        text.setValue(this.group.name);
        text.onChange(value => {
          this.group.name = value;
          this.group.id = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        });
      });

    // State order section
    contentEl.createEl('h3', { text: 'State Order' });
    contentEl.createEl('p', { 
      text: 'Drag to reorder states. Buttons using this group will cycle through states in this order.',
      cls: 'setting-item-description'
    });

    const stateOrderContainer = contentEl.createDiv('taskmaster-state-order-container');
    this.refreshStateOrder(stateOrderContainer);

    // Buttons
    const buttonContainer = contentEl.createDiv();
    buttonContainer.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;';

    const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelBtn.onclick = () => this.close();

    const saveBtn = buttonContainer.createEl('button', { text: 'Save' });
    saveBtn.classList.add('mod-cta');
    saveBtn.onclick = () => this.save();
  }

  refreshStateOrder(container) {
    container.empty();
    container.style.cssText = `
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      padding: 8px;
      background: var(--background-primary);
    `;

    this.group.stateOrder.forEach((stateId, index) => {
      const state = this.plugin.settings.taskStates.find(s => s.id === stateId);
      if (!state) return;

      const stateEl = container.createDiv('taskmaster-state-order-item');
      stateEl.style.cssText = `
        display: flex;
        align-items: center;
        padding: 8px;
        margin: 4px 0;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        background: var(--background-secondary);
        cursor: move;
      `;

      // State preview
      const preview = stateEl.createSpan();
      preview.innerHTML = `${state.icon} ${state.name}`;
      preview.style.cssText = `
        color: ${state.color};
        font-weight: 500;
        flex: 1;
      `;

      // Move buttons
      const actionsEl = stateEl.createDiv();
      actionsEl.style.cssText = 'display: flex; gap: 4px;';

      if (index > 0) {
        const upBtn = actionsEl.createEl('button', { text: '↑' });
        upBtn.style.cssText = 'padding: 2px 6px; font-size: 12px;';
        upBtn.onclick = () => {
          [this.group.stateOrder[index - 1], this.group.stateOrder[index]] = 
          [this.group.stateOrder[index], this.group.stateOrder[index - 1]];
          this.refreshStateOrder(container);
        };
      }

      if (index < this.group.stateOrder.length - 1) {
        const downBtn = actionsEl.createEl('button', { text: '↓' });
        downBtn.style.cssText = 'padding: 2px 6px; font-size: 12px;';
        downBtn.onclick = () => {
          [this.group.stateOrder[index], this.group.stateOrder[index + 1]] = 
          [this.group.stateOrder[index + 1], this.group.stateOrder[index]];
          this.refreshStateOrder(container);
        };
      }
    });
  }

  save() {
    if (!this.group.name.trim()) {
      new Notice('Please enter a name for the state group');
      return;
    }

    if (!this.isEditing) {
      // Check for duplicate IDs
      if (this.plugin.settings.stateGroups.find(g => g.id === this.group.id)) {
        new Notice('A state group with this name already exists');
        return;
      }
      this.plugin.settings.stateGroups.push({ ...this.group });
    } else {
      // Update existing group
      const index = this.plugin.settings.stateGroups.findIndex(g => g.id === this.group.id);
      if (index >= 0) {
        this.plugin.settings.stateGroups[index] = { ...this.group };
      }
    }

    this.plugin.saveSettings();
    this.onSave();
    this.close();
  }
}

// Task State Modal
class TaskStateModal extends Modal {
  constructor(app, plugin, state, onSave) {
    super(app);
    this.plugin = plugin;
    this.state = state;
    this.onSave = onSave;
    this.isEditing = !!state;
    
    if (!this.isEditing) {
      this.state = {
        id: '',
        name: '',
        icon: '⭕',
        color: '#64748b'
      };
    }
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: this.isEditing ? 'Edit Task State' : 'Add Task State' });

    // Name input
    new Setting(contentEl)
      .setName('Name')
      .setDesc('Display name for this task state')
      .addText(text => {
        text.setValue(this.state.name);
        text.onChange(value => {
          this.state.name = value;
          this.state.id = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        });
      });

    // Icon input
    new Setting(contentEl)
      .setName('Icon')
      .setDesc('Emoji or symbol to represent this state')
      .addText(text => {
        text.setValue(this.state.icon);
        text.onChange(value => this.state.icon = value);
      });

    // Color input with color picker
    const colorSetting = new Setting(contentEl)
      .setName('Color')
      .setDesc('Color for this task state');

    // Create a container for color input and picker
    const colorContainer = colorSetting.controlEl.createDiv();
    colorContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';

    // Text input for hex color
    const colorInput = colorContainer.createEl('input', { type: 'text' });
    colorInput.value = this.state.color;
    colorInput.style.cssText = 'flex: 1; padding: 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px;';
    colorInput.onchange = () => {
      this.state.color = colorInput.value;
      colorPreview.style.backgroundColor = this.state.color;
    };

    // Color picker input
    const colorPicker = colorContainer.createEl('input', { type: 'color' });
    colorPicker.value = this.state.color;
    colorPicker.style.cssText = 'width: 40px; height: 32px; border: none; border-radius: 4px; cursor: pointer;';
    colorPicker.onchange = () => {
      this.state.color = colorPicker.value;
      colorInput.value = colorPicker.value;
      colorPreview.style.backgroundColor = this.state.color;
    };

    // Color preview
    const colorPreview = colorContainer.createEl('div');
    colorPreview.style.cssText = `
      width: 32px; 
      height: 32px; 
      border: 1px solid var(--background-modifier-border); 
      border-radius: 4px; 
      background-color: ${this.state.color};
    `;

    // Group assignment
    new Setting(contentEl)
      .setName('Default Group')
      .setDesc('Which state group this state belongs to by default')
      .addDropdown(dropdown => {
        this.plugin.settings.stateGroups.forEach(group => {
          dropdown.addOption(group.id, group.name);
        });
        dropdown.setValue(this.state.group || this.plugin.settings.defaultGroup);
        dropdown.onChange(value => this.state.group = value);
      });

    // Buttons
    const buttonContainer = contentEl.createDiv();
    buttonContainer.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;';

    const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelBtn.onclick = () => this.close();

    const saveBtn = buttonContainer.createEl('button', { text: 'Save' });
    saveBtn.classList.add('mod-cta');
    saveBtn.onclick = () => this.save();
  }

  save() {
    if (!this.state.name.trim()) {
      new Notice('Please enter a name for the task state');
      return;
    }

    if (!this.isEditing) {
      // Check for duplicate IDs
      if (this.plugin.settings.taskStates.find(s => s.id === this.state.id)) {
        new Notice('A task state with this name already exists');
        return;
      }
      this.plugin.settings.taskStates.push({ ...this.state });
    } else {
      // Update existing state
      const index = this.plugin.settings.taskStates.findIndex(s => s.id === this.state.id);
      if (index >= 0) {
        this.plugin.settings.taskStates[index] = { ...this.state };
      }
    }

    this.plugin.saveSettings();
    this.onSave();
    this.close();
  }
}

// Person Modal
class PersonModal extends Modal {
  constructor(app, plugin, person, onSave) {
    super(app);
    this.plugin = plugin;
    this.person = person;
    this.onSave = onSave;
    this.isEditing = !!person;
    
    if (!this.isEditing) {
      this.person = {
        id: '',
        name: '',
        email: '',
        role: '',
        avatar: ''
      };
    }
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: this.isEditing ? 'Edit Person' : 'Add Person' });

    // Name input
    new Setting(contentEl)
      .setName('Name')
      .setDesc('Full name of the person')
      .addText(text => {
        text.setValue(this.person.name);
        text.onChange(value => {
          this.person.name = value;
          this.person.id = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        });
      });

    // Email input
    new Setting(contentEl)
      .setName('Email')
      .setDesc('Email address (optional)')
      .addText(text => {
        text.setValue(this.person.email);
        text.onChange(value => this.person.email = value);
      });

    // Role input
    new Setting(contentEl)
      .setName('Role')
      .setDesc('Role or title (optional)')
      .addText(text => {
        text.setValue(this.person.role);
        text.onChange(value => this.person.role = value);
      });

    // Avatar input
    new Setting(contentEl)
      .setName('Avatar')
      .setDesc('Avatar emoji or initials (optional)')
      .addText(text => {
        text.setValue(this.person.avatar);
        text.onChange(value => this.person.avatar = value);
      });

    // Buttons
    const buttonContainer = contentEl.createDiv();
    buttonContainer.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;';

    const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelBtn.onclick = () => this.close();

    const saveBtn = buttonContainer.createEl('button', { text: 'Save' });
    saveBtn.classList.add('mod-cta');
    saveBtn.onclick = () => this.save();
  }

  save() {
    if (!this.person.name.trim()) {
      new Notice('Please enter a name for the person');
      return;
    }

    if (!this.isEditing) {
      // Check for duplicate IDs
      if (this.plugin.settings.people.find(p => p.id === this.person.id)) {
        new Notice('A person with this name already exists');
        return;
      }
      this.plugin.settings.people.push({ ...this.person });
    } else {
      // Update existing person
      const index = this.plugin.settings.people.findIndex(p => p.id === this.person.id);
      if (index >= 0) {
        this.plugin.settings.people[index] = { ...this.person };
      }
    }

    this.plugin.saveSettings();
    this.onSave();
    this.close();
  }
}

// Assignment Modal
class AssignmentModal extends Modal {
  constructor(app, plugin, onAssign) {
    super(app);
    this.plugin = plugin;
    this.onAssign = onAssign;
    this.selectedPeople = [];
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Assign People to Task' });

    if (this.plugin.settings.people.length === 0) {
      contentEl.createEl('p', { text: 'No people configured. Add people in the plugin settings first.' });
      return;
    }

    contentEl.createEl('p', { text: 'Select people to assign to this task:' });

    // People checkboxes
    this.plugin.settings.people.forEach(person => {
      const checkboxContainer = contentEl.createDiv();
      checkboxContainer.style.cssText = 'display: flex; align-items: center; margin: 8px 0;';

      const checkbox = checkboxContainer.createEl('input', { type: 'checkbox' });
      checkbox.style.marginRight = '8px';
      checkbox.onchange = () => {
        if (checkbox.checked) {
          this.selectedPeople.push(person);
        } else {
          const index = this.selectedPeople.findIndex(p => p.id === person.id);
          if (index >= 0) {
            this.selectedPeople.splice(index, 1);
          }
        }
      };

      const label = checkboxContainer.createEl('label', { text: person.name });
      if (person.role) {
        label.textContent += ` (${person.role})`;
      }
      label.style.cursor = 'pointer';
      label.onclick = () => checkbox.click();
    });

    // Buttons
    const buttonContainer = contentEl.createDiv();
    buttonContainer.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;';

    const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelBtn.onclick = () => this.close();

    const assignBtn = buttonContainer.createEl('button', { text: 'Assign' });
    assignBtn.classList.add('mod-cta');
    assignBtn.onclick = () => {
      this.onAssign(this.selectedPeople);
      this.close();
    };
  }
}

// Project Modal
class ProjectModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Create New Project' });

    // Project name
    let projectName = '';
    new Setting(contentEl)
      .setName('Project Name')
      .setDesc('Name of the new project')
      .addText(text => {
        text.onChange(value => projectName = value);
      });

    // Project template
    let template = 'basic';
    new Setting(contentEl)
      .setName('Template')
      .setDesc('Choose a project template')
      .addDropdown(dropdown => {
        dropdown.addOption('basic', 'Basic Project');
        dropdown.addOption('kanban', 'Kanban Board');
        dropdown.addOption('sprint', 'Sprint Planning');
        dropdown.onChange(value => template = value);
      });

    // Buttons
    const buttonContainer = contentEl.createDiv();
    buttonContainer.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;';

    const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelBtn.onclick = () => this.close();

    const createBtn = buttonContainer.createEl('button', { text: 'Create' });
    createBtn.classList.add('mod-cta');
    createBtn.onclick = () => {
      if (!projectName.trim()) {
        new Notice('Please enter a project name');
        return;
      }
      this.createProject(projectName, template);
      this.close();
    };
  }

  async createProject(name, template) {
    const fileName = `${name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-')}.md`;
    const content = this.getProjectTemplate(name, template);
    
    try {
      await this.app.vault.create(fileName, content);
      new Notice(`Created project: ${fileName}`);
      
      // Open the new project file
      const file = this.app.vault.getAbstractFileByPath(fileName);
      if (file) {
        await this.app.workspace.getLeaf().openFile(file);
      }
    } catch (error) {
      new Notice(`Error creating project: ${error.message}`);
    }
  }

  getProjectTemplate(name, template) {
    const today = new Date().toISOString().split('T')[0];
    
    switch (template) {
      case 'kanban':
        return `# ${name}

**Created:** ${today}
**Status:** Planning

## Overview
<!-- Project description and goals -->

## Kanban Board

### 📋 To Do
- [ ] [Planning] Define project scope @team
- [ ] [Planning] Set up initial tasks @team

### 🔄 In Progress
<!-- Tasks currently being worked on -->

### 👀 Review
<!-- Tasks awaiting review -->

### ✅ Done
<!-- Completed tasks -->

## Resources
<!-- Links, documents, references -->

## Notes
<!-- Meeting notes, decisions, etc -->
`;

      case 'sprint':
        return `# ${name}

**Created:** ${today}
**Sprint:** 1
**Duration:** 2 weeks
**Status:** Planning

## Sprint Goal
<!-- What we want to achieve this sprint -->

## Backlog
- [ ] [Planning] Define user stories @team est:2h
- [ ] [Planning] Create wireframes @designer est:4h
- [ ] [Planning] Set up development environment @dev est:1h

## Sprint Metrics
- **Planned:** 0h
- **Logged:** 0h
- **Remaining:** 0h

## Daily Standups
<!-- Track daily progress -->

## Sprint Retrospective
<!-- What went well, what could be improved -->
`;

      default: // basic
        return `# ${name}

**Created:** ${today}
**Status:** Planning

## Overview
<!-- Project description and goals -->

## Tasks
- [ ] [Planning] Project setup @team est:1h
- [ ] [Planning] Define requirements @team est:2h
- [ ] [Planning] Create timeline @team est:1h

## Timeline
<!-- Key milestones and deadlines -->

## Team
<!-- Team members and their roles -->

## Resources
<!-- Links, documents, references -->

## Progress
- **Total Tasks:** 3
- **Completed:** 0
- **Progress:** 0%
`;
    }
  }
}

// Multi-State Button Creation Modal
class MultiStateButtonCreationModal extends Modal {
  constructor(app, plugin, onSave) {
    super(app);
    this.plugin = plugin;
    this.onSave = onSave;
    this.buttonConfig = {
      label: '',
      initialState: this.plugin.settings.defaultState,
      group: this.plugin.settings.defaultGroup
    };
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Create Multi-State Button' });

    // Label input (optional)
    new Setting(contentEl)
      .setName('Label (Optional)')
      .setDesc('Text to show before the button')
      .addText(text => {
        text.setValue(this.buttonConfig.label);
        text.onChange(value => this.buttonConfig.label = value);
      });

    // Initial state selection
    new Setting(contentEl)
      .setName('Initial State')
      .setDesc('Starting state for the button')
      .addDropdown(dropdown => {
        this.plugin.settings.taskStates.forEach(state => {
          dropdown.addOption(state.id, `${state.icon} ${state.name}`);
        });
        dropdown.setValue(this.buttonConfig.initialState);
        dropdown.onChange(value => this.buttonConfig.initialState = value);
      });

    // State group selection
    new Setting(contentEl)
      .setName('State Group')
      .setDesc('Which group of states this button will cycle through')
      .addDropdown(dropdown => {
        this.plugin.settings.stateGroups.forEach(group => {
          dropdown.addOption(group.id, group.name);
        });
        dropdown.setValue(this.buttonConfig.group);
        dropdown.onChange(value => this.buttonConfig.group = value);
      });

    // Buttons
    const buttonContainer = contentEl.createDiv();
    buttonContainer.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;';

    const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelBtn.onclick = () => this.close();

    const createBtn = buttonContainer.createEl('button', { text: 'Create' });
    createBtn.classList.add('mod-cta');
    createBtn.onclick = () => {
      this.onSave(this.buttonConfig);
      this.close();
    };
  }
}

// Dashboard Modal
class DashboardModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'TaskMaster Dashboard' });

    // This would show project overview, active timers, recent activity, etc.
    contentEl.createEl('p', { text: 'Dashboard functionality coming soon...' });
    
    // For now, show basic statistics
    this.showBasicStats(contentEl);
  }

  showBasicStats(container) {
    const statsContainer = container.createDiv();
    statsContainer.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin: 16px 0;
    `;

    // Task states count
    const statesCard = statsContainer.createDiv();
    statesCard.style.cssText = `
      padding: 16px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      background: var(--background-secondary);
    `;
    statesCard.createEl('h3', { text: 'Task States' });
    statesCard.createEl('p', { text: `${this.plugin.settings.taskStates.length} configured states` });

    // People count
    const peopleCard = statsContainer.createDiv();
    peopleCard.style.cssText = `
      padding: 16px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      background: var(--background-secondary);
    `;
    peopleCard.createEl('h3', { text: 'Team Members' });
    peopleCard.createEl('p', { text: `${this.plugin.settings.people.length} people` });

    // Active timers
    const timersCard = statsContainer.createDiv();
    timersCard.style.cssText = `
      padding: 16px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      background: var(--background-secondary);
    `;
    timersCard.createEl('h3', { text: 'Active Timers' });
    const activeTimers = this.plugin.timeTracker ? this.plugin.timeTracker.activeTimers.size : 0;
    timersCard.createEl('p', { text: `${activeTimers} running` });
  }
}

// Assignee Filter Modal for filtering tasks by person
class AssigneeFilterModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Filter Tasks by Assignee' });

    if (this.plugin.settings.people.length === 0) {
      contentEl.createEl('p', { text: 'No people configured. Add people in the plugin settings first.' });
      return;
    }

    contentEl.createEl('p', { text: 'Select a person to view their assigned tasks:' });

    // Create filter buttons for each person
    this.plugin.settings.people.forEach(person => {
      const personButton = contentEl.createEl('button', { 
        text: `${person.name}${person.role ? ` (${person.role})` : ''}` 
      });
      personButton.style.cssText = `
        display: block;
        width: 100%;
        margin: 8px 0;
        padding: 12px;
        text-align: left;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        background: var(--background-secondary);
        cursor: pointer;
      `;
      
      personButton.onclick = () => {
        this.filterTasksByAssignee(person.name);
        this.close();
      };
    });

    // Add "Show All" button
    const showAllButton = contentEl.createEl('button', { text: 'Show All Tasks' });
    showAllButton.style.cssText = `
      display: block;
      width: 100%;
      margin: 16px 0 8px 0;
      padding: 12px;
      text-align: center;
      border: 1px solid var(--color-accent);
      border-radius: 4px;
      background: var(--color-accent);
      color: var(--text-on-accent);
      cursor: pointer;
      font-weight: 500;
    `;
    
    showAllButton.onclick = () => {
      this.clearTaskFilter();
      this.close();
    };
  }

  async filterTasksByAssignee(personName) {
    const results = [];
    const files = this.app.vault.getMarkdownFiles();
    
    for (const file of files) {
      const content = await this.app.vault.read(file);
      const lines = content.split('\n');
      
      lines.forEach((line, lineIndex) => {
        // Check for @mentions in the line
        if (line.includes(`@${personName}`)) {
          // Check if it's a task line (has checkbox or multi-state button)
          const isTask = line.match(/^\s*[-*+]\s*\[.\]\s/) || line.includes('{{multi-state-button:');
          
          if (isTask) {
            results.push({
              file: file.name,
              line: lineIndex + 1,
              content: line.trim(),
              filePath: file.path
            });
          }
        }
      });
    }
    
    // Create and show results
    this.showFilterResults(personName, results);
  }

  async showFilterResults(personName, results) {
    const resultFile = `TaskMaster-Filter-${personName}-${new Date().toISOString().split('T')[0]}.md`;
    
    let content = `# Tasks Assigned to ${personName}\n\n`;
    content += `**Generated:** ${new Date().toISOString()}\n`;
    content += `**Total Tasks:** ${results.length}\n\n`;
    
    if (results.length === 0) {
      content += `No tasks found assigned to ${personName}.\n`;
    } else {
      // Group by file
      const groupedResults = {};
      results.forEach(result => {
        if (!groupedResults[result.file]) {
          groupedResults[result.file] = [];
        }
        groupedResults[result.file].push(result);
      });
      
      // Output results grouped by file
      Object.keys(groupedResults).forEach(fileName => {
        content += `## ${fileName}\n\n`;
        groupedResults[fileName].forEach(result => {
          content += `- **Line ${result.line}:** ${result.content}\n`;
          content += `  - *File: [[${result.filePath}]]*\n\n`;
        });
      });
    }
    
    try {
      await this.app.vault.create(resultFile, content);
      new Notice(`Filter results saved to ${resultFile}`);
      
      // Open the results file
      const file = this.app.vault.getAbstractFileByPath(resultFile);
      if (file) {
        await this.app.workspace.getLeaf().openFile(file);
      }
    } catch (error) {
      new Notice(`Error creating filter results: ${error.message}`);
    }
  }

  clearTaskFilter() {
    new Notice('Showing all tasks (filter cleared)');
    // This could be extended to actually clear any active filters in the UI
  }
}

module.exports = TaskMasterPlugin;
