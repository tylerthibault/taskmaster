const { PluginSettingTab, Setting, Modal, ButtonComponent } = require('obsidian');

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

    // Task States Section
    this.displayTaskStatesSection(containerEl);
    
    // People Section
    this.displayPeopleSection(containerEl);
    
    // General Settings Section
    this.displayGeneralSettings(containerEl);
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

    // Color input
    new Setting(contentEl)
      .setName('Color')
      .setDesc('Color for this task state (hex format)')
      .addText(text => {
        text.setValue(this.state.color);
        text.onChange(value => this.state.color = value);
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

module.exports = {
  TaskMasterSettingTab,
  TaskStateModal,
  PersonModal,
  AssignmentModal,
  ProjectModal,
  DashboardModal
};
