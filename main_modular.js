// TaskMaster Plugin - Modular version
// Main plugin file that coordinates all components

const { Plugin, Setting, Notice, Modal, MarkdownView, TFile, PluginSettingTab, ButtonComponent } = require('obsidian');

// Import configuration
const { DEFAULT_SETTINGS } = require('./src/config/constants');

// Import core classes
const TaskMasterLogger = require('./src/core/logger');

// Import managers
const TaskManager = require('./src/managers/TaskManager');
const TimeTracker = require('./src/managers/TimeTracker');
const PeopleManager = require('./src/managers/PeopleManager');
const ProjectManager = require('./src/managers/ProjectManager');

// Import UI components
const TaskMasterSettingTab = require('./src/ui/TaskMasterSettingTab');
const AssignmentModal = require('./src/ui/modals/AssignmentModal');

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
    
    // Register markdown post processor for preview mode
    this.registerMarkdownPostProcessor((element, context) => {
      console.log('🔥 TaskMaster: POST PROCESSOR CALLED! 🔥');
      console.log('TaskMaster: Element:', element);
      console.log('TaskMaster: Element tagName:', element.tagName);
      console.log('TaskMaster: Element HTML:', element.innerHTML);
      console.log('TaskMaster: Element text:', element.textContent);
      console.log('TaskMaster: Context:', context);
            
      // Check if plugin is fully initialized
      if (!this.taskManager || !this.projectManager) {
        console.warn('TaskMaster: Plugin not fully initialized yet');
        return;
      }
      
      try {
        this.taskManager.processTaskElements(element, context);
        this.projectManager.processCollapsibleSections(element, context);
      } catch (error) {
        console.error('TaskMaster: Error in markdown post processor:', error);
      }
    });
    this.logger.debug('Plugin', 'Markdown post processor registered');
    
    // Register editor extensions for edit mode - Alternative approach
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

    // Register live preview processor for edit mode rendering
    this.registerMarkdownPostProcessor((element, context) => {
      // This handles both reading mode and live preview in edit mode
      this.processMultiStateButtonsUniversal(element, context);
    });

    // Register editor extension for live preview in edit mode
    this.app.workspace.updateOptions();
    
    // Register for live preview rendering
    this.registerMarkdownPostProcessor((element, context) => {
      // Check if we're in live preview mode
      const isLivePreview = context.sourcePath && element.closest('.cm-editor');
      
      console.log('TaskMaster: Post processor called', { 
        isLivePreview, 
        sourcePath: context.sourcePath,
        elementTag: element.tagName,
        hasButton: element.textContent?.includes('multi-state-button') 
      });
      
      this.processMultiStateButtonsUniversal(element, context, isLivePreview);
    });
    
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
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    
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
        // ProjectModal would need to be imported
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
        // DashboardModal would need to be imported
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
        // AssigneeFilterModal would need to be imported
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
    // This method sets up support for edit mode interactions
    // Implementation would be more complex but this is the entry point
    console.log('TaskMaster: Setting up edit mode support');
  }

  registerEvents() {
    // Register file modification events
    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (file.extension === 'md') {
          this.projectManager.onFileModified(file);
        }
      })
    );

    // Register workspace events
    this.registerEvent(
      this.app.workspace.on('file-open', (file) => {
        if (file && file.extension === 'md') {
          this.logger?.debug('Plugin', 'Markdown file opened', { fileName: file.name });
        }
      })
    );
  }
}

module.exports = TaskMasterPlugin;
