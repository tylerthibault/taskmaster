// ProjectManager - handles project structure and organization functionality

const { MarkdownView, Notice } = require('obsidian');

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

  // Get project statistics
  getProjectStats(content) {
    const lines = content.split('\n');
    let totalTasks = 0;
    let completedTasks = 0;
    const stateCounts = {};

    lines.forEach(line => {
      if (line.match(/^\s*[-*+]\s*\[.\]\s/) || line.includes('{{multi-state-button:')) {
        totalTasks++;
        
        if (line.includes('[x]') || line.includes('done')) {
          completedTasks++;
        }
        
        // Count states
        const stateMatch = line.match(/{{multi-state-button:[^:]+:([^}]+)}}/);
        if (stateMatch) {
          const state = stateMatch[1];
          stateCounts[state] = (stateCounts[state] || 0) + 1;
        }
      }
    });

    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      totalTasks,
      completedTasks,
      progress: Math.round(progress),
      stateCounts
    };
  }

  // Generate progress bar HTML
  generateProgressBar(progress, width = 200) {
    const filled = Math.round((progress / 100) * width);
    const empty = width - filled;
    
    return `<div style="display: inline-block; width: ${width}px; height: 10px; background: #e0e0e0; border-radius: 5px; overflow: hidden;"><div style="width: ${filled}px; height: 100%; background: #10b981; float: left;"></div></div> ${progress}%`;
  }
}

module.exports = ProjectManager;
