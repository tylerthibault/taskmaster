// TaskManager - handles task management functionality

const { MarkdownView } = require('obsidian');

class TaskManager {
  constructor(plugin) {
    this.plugin = plugin;
    this.logger = plugin.logger;
    this.logger?.debug('TaskManager', 'TaskManager initialized');
  }

  processTaskElements(element, context, isLivePreview = false) {
    console.log('TaskMaster: processTaskElements called', { element, isLivePreview });
    this.logger?.debug('TaskManager', 'Processing task elements', { elementTag: element.tagName, isLivePreview });
    
    // Find all task list items and enhance them with TaskMaster functionality
    const taskItems = element.querySelectorAll('li[data-task]');
    this.logger?.debug('TaskManager', `Found ${taskItems.length} task items to process`);
    
    taskItems.forEach((item, index) => {
      this.logger?.debug('TaskManager', `Processing task item ${index + 1}/${taskItems.length}`);
      this.enhanceTaskItem(item, context);
    });

    // Also process multi-state buttons with the new syntax
    console.log('TaskMaster: About to process multi-state buttons', { isLivePreview });
    this.processMultiStateButtons(element, context, isLivePreview);
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
    
    // In live preview, we need to process all elements that might contain buttons
    const buttonPattern = /\{\{multi-state-button:([^:]+):([^}]+)\}\}/g;
    
    // Check all possible container elements
    const containers = [element, ...element.querySelectorAll('p, td, li, div, span')];
    
    containers.forEach((container, index) => {
      const containerText = container.textContent || '';
      if (buttonPattern.test(containerText)) {
        console.log(`TaskMaster: Processing live preview container ${index}:`, containerText);
        this.replaceButtonsInElement(container);
      }
    });
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
      // We'll need to import this modal later
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

module.exports = TaskManager;
