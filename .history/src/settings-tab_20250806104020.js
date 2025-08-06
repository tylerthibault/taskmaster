import { PluginSettingTab, Setting } from 'obsidian';
import { TaskState, TaskStateGroup, Person } from './settings.js';

/**
 * TaskMaster Settings Tab
 * 
 * Provides the user interface for configuring TaskMaster plugin settings.
 * Includes sections for state groups, people management, and general settings.
 */
export class TaskMasterSettingTab extends PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'TaskMaster Settings' });

		// General Settings Section
		this.createGeneralSettings(containerEl);
		
		// State Groups Section
		this.createStateGroupsSection(containerEl);
		
		// People Management Section
		this.createPeopleSection(containerEl);
		
		// Time Tracking Section
		this.createTimeTrackingSection(containerEl);
	}

	/**
	 * Create general settings section
	 * @param {HTMLElement} containerEl - Container element
	 */
	createGeneralSettings(containerEl) {
		containerEl.createEl('h3', { text: 'General Settings' });

		// Debug Mode
		new Setting(containerEl)
			.setName('Debug Mode')
			.setDesc('Enable debug logging in the console')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.debugMode)
				.onChange(async (value) => {
					this.plugin.settings.debugMode = value;
					await this.plugin.saveSettings();
				}));

		// Auto Save
		new Setting(containerEl)
			.setName('Auto Save')
			.setDesc('Automatically save changes to tasks and states')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoSave)
				.onChange(async (value) => {
					this.plugin.settings.autoSave = value;
					await this.plugin.saveSettings();
				}));

		// Default State Group
		new Setting(containerEl)
			.setName('Default State Group')
			.setDesc('The default state group to use for new buttons')
			.addDropdown(dropdown => {
				// Add options for existing state groups
				this.plugin.settings.stateGroups.forEach((group, id) => {
					dropdown.addOption(id, group.name);
				});
				
				dropdown
					.setValue(this.plugin.settings.defaultStateGroup)
					.onChange(async (value) => {
						this.plugin.settings.defaultStateGroup = value;
						await this.plugin.saveSettings();
					});
			});
	}

	/**
	 * Create state groups management section
	 * @param {HTMLElement} containerEl - Container element
	 */
	createStateGroupsSection(containerEl) {
		containerEl.createEl('h3', { text: 'State Groups' });
		containerEl.createEl('p', { 
			text: 'Manage different workflow state groups. Each group defines a progression of states for your tasks.',
			cls: 'setting-item-description'
		});

		// Container for state groups list
		const stateGroupsContainer = containerEl.createDiv('taskmaster-state-groups-container');
		this.refreshStateGroupsList(stateGroupsContainer);

		// Add new state group button
		new Setting(containerEl)
			.setName('Add State Group')
			.setDesc('Create a new state group')
			.addButton(button => button
				.setButtonText('Add Group')
				.setCta()
				.onClick(() => {
					this.showAddStateGroupModal();
				}));
	}

	/**
	 * Refresh the state groups list display
	 * @param {HTMLElement} container - Container to refresh
	 */
	refreshStateGroupsList(container) {
		container.empty();
		
		this.plugin.settings.stateGroups.forEach((group, groupId) => {
			const groupDiv = container.createDiv('taskmaster-state-group');
			
			// Group header
			const headerDiv = groupDiv.createDiv('taskmaster-state-group-header');
			headerDiv.createEl('h4', { text: group.name });
			
			// Group controls
			const controlsDiv = headerDiv.createDiv('taskmaster-state-group-controls');
			
			// Edit button
			controlsDiv.createEl('button', {
				text: 'Edit',
				cls: 'mod-cta'
			}).onclick = () => {
				this.showEditStateGroupModal(group);
			};
			
			// Delete button (if not default group)
			if (groupId !== 'default') {
				controlsDiv.createEl('button', {
					text: 'Delete',
					cls: 'mod-warning'
				}).onclick = () => {
					this.deleteStateGroup(groupId);
				};
			}
			
			// States list
			const statesDiv = groupDiv.createDiv('taskmaster-states-list');
			group.states.forEach(state => {
				const stateDiv = statesDiv.createDiv('taskmaster-state-item');
				
				// State color indicator
				const colorIndicator = stateDiv.createDiv('taskmaster-state-color');
				colorIndicator.style.backgroundColor = state.color;
				
				// State name
				stateDiv.createSpan({ text: state.name, cls: 'taskmaster-state-name' });
				
				// State order
				stateDiv.createSpan({ text: `(${state.order})`, cls: 'taskmaster-state-order' });
			});
		});
	}

	/**
	 * Create people management section
	 * @param {HTMLElement} containerEl - Container element
	 */
	createPeopleSection(containerEl) {
		containerEl.createEl('h3', { text: 'People Management' });
		containerEl.createEl('p', { 
			text: 'Manage people who can be assigned to tasks.',
			cls: 'setting-item-description'
		});

		// Container for people list
		const peopleContainer = containerEl.createDiv('taskmaster-people-container');
		this.refreshPeopleList(peopleContainer);

		// Add new person button
		new Setting(containerEl)
			.setName('Add Person')
			.setDesc('Add a new person to the team')
			.addButton(button => button
				.setButtonText('Add Person')
				.setCta()
				.onClick(() => {
					this.showAddPersonModal();
				}));
	}

	/**
	 * Refresh the people list display
	 * @param {HTMLElement} container - Container to refresh
	 */
	refreshPeopleList(container) {
		container.empty();
		
		this.plugin.settings.people.forEach((person, personId) => {
			const personDiv = container.createDiv('taskmaster-person');
			
			// Person info
			const infoDiv = personDiv.createDiv('taskmaster-person-info');
			infoDiv.createEl('strong', { text: person.name });
			if (person.email) {
				infoDiv.createEl('span', { text: ` (${person.email})` });
			}
			if (person.role) {
				infoDiv.createEl('div', { text: person.role, cls: 'taskmaster-person-role' });
			}
			
			// Person controls
			const controlsDiv = personDiv.createDiv('taskmaster-person-controls');
			
			// Edit button
			controlsDiv.createEl('button', {
				text: 'Edit',
				cls: 'mod-cta'
			}).onclick = () => {
				this.showEditPersonModal(person);
			};
			
			// Delete button
			controlsDiv.createEl('button', {
				text: 'Delete',
				cls: 'mod-warning'
			}).onclick = () => {
				this.deletePerson(personId);
			};
		});
	}

	/**
	 * Create time tracking section
	 * @param {HTMLElement} containerEl - Container element
	 */
	createTimeTrackingSection(containerEl) {
		containerEl.createEl('h3', { text: 'Time Tracking' });

		// Enable Time Tracking
		new Setting(containerEl)
			.setName('Enable Time Tracking')
			.setDesc('Enable time tracking features for tasks')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.timeTrackingEnabled)
				.onChange(async (value) => {
					this.plugin.settings.timeTrackingEnabled = value;
					await this.plugin.saveSettings();
				}));
	}

	/**
	 * Show modal to add new state group (placeholder)
	 */
	showAddStateGroupModal() {
		// TODO: Implement modal for adding state groups
		console.log('Add state group modal - TODO');
	}

	/**
	 * Show modal to edit state group (placeholder)
	 * @param {TaskStateGroup} group - Group to edit
	 */
	showEditStateGroupModal(group) {
		// TODO: Implement modal for editing state groups
		console.log('Edit state group modal - TODO', group);
	}

	/**
	 * Delete a state group
	 * @param {string} groupId - ID of group to delete
	 */
	async deleteStateGroup(groupId) {
		if (groupId === 'default') {
			new Notice('Cannot delete the default state group');
			return;
		}

		this.plugin.settings.removeStateGroup(groupId);
		await this.plugin.saveSettings();
		this.display(); // Refresh the settings display
		new Notice('State group deleted');
	}

	/**
	 * Show modal to add new person (placeholder)
	 */
	showAddPersonModal() {
		// TODO: Implement modal for adding people
		console.log('Add person modal - TODO');
	}

	/**
	 * Show modal to edit person (placeholder)
	 * @param {Person} person - Person to edit
	 */
	showEditPersonModal(person) {
		// TODO: Implement modal for editing people
		console.log('Edit person modal - TODO', person);
	}

	/**
	 * Delete a person
	 * @param {string} personId - ID of person to delete
	 */
	async deletePerson(personId) {
		this.plugin.settings.removePerson(personId);
		await this.plugin.saveSettings();
		this.display(); // Refresh the settings display
		new Notice('Person deleted');
	}
}
