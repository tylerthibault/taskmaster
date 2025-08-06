// TaskMasterSettingTab - Settings UI for TaskMaster plugin

const { PluginSettingTab, Setting, Notice } = require('obsidian');

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
            // StateGroupModal would need to be imported
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
            // TaskStateModal would need to be imported
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
            // PersonModal would need to be imported
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

module.exports = TaskMasterSettingTab;
