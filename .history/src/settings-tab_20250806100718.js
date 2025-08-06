import { App, PluginSettingTab, Setting } from 'obsidian';

class TaskMasterSettingTab extends PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: 'TaskMaster Settings' });

		// Debug Mode Setting
		new Setting(containerEl)
			.setName('Debug Mode')
			.setDesc('Enable debug logging for troubleshooting')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.debugMode)
				.onChange(async (value) => {
					this.plugin.settings.debugMode = value;
					await this.plugin.saveSettings();
				}));

		// State Groups Section
		containerEl.createEl('h3', { text: 'Task State Groups' });
		
		this.displayStateGroups();

		// People Section
		containerEl.createEl('h3', { text: 'People Management' });
		
		this.displayPeople();

		// Time Tracking Section
		containerEl.createEl('h3', { text: 'Time Tracking' });
		
		new Setting(containerEl)
			.setName('Enable Time Tracking')
			.setDesc('Enable time tracking features')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableTimeTracking)
				.onChange(async (value) => {
					this.plugin.settings.enableTimeTracking = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Time Format')
			.setDesc('Choose time display format')
			.addDropdown(dropdown => dropdown
				.addOption('24h', '24 Hour')
				.addOption('12h', '12 Hour')
				.setValue(this.plugin.settings.timeTrackingFormat)
				.onChange(async (value) => {
					this.plugin.settings.timeTrackingFormat = value;
					await this.plugin.saveSettings();
				}));
	}

	displayStateGroups() {
		const { containerEl } = this;
		
		// Add new state group button
		new Setting(containerEl)
			.setName('Add State Group')
			.setDesc('Create a new group of task states')
			.addButton(button => button
				.setButtonText('Add Group')
				.onClick(() => {
					const newGroup = {
						id: `group-${Date.now()}`,
						name: 'New Group',
						states: [
							{ id: 'todo', name: 'To Do', color: '#e74c3c', order: 0 },
							{ id: 'done', name: 'Done', color: '#27ae60', order: 1 }
						]
					};
					this.plugin.settings.stateGroups.push(newGroup);
					this.plugin.saveSettings();
					this.display(); // Refresh the display
				}));

		// Display existing state groups
		this.plugin.settings.stateGroups.forEach((group, groupIndex) => {
			const groupContainer = containerEl.createDiv('taskmaster-state-group');
			
			new Setting(groupContainer)
				.setName(`Group: ${group.name}`)
				.setDesc(`ID: ${group.id}`)
				.addText(text => text
					.setValue(group.name)
					.onChange(async (value) => {
						this.plugin.settings.stateGroups[groupIndex].name = value;
						await this.plugin.saveSettings();
					}))
				.addButton(button => button
					.setButtonText('Delete Group')
					.onClick(async () => {
						this.plugin.settings.stateGroups.splice(groupIndex, 1);
						await this.plugin.saveSettings();
						this.display();
					}));

			// Display states in this group
			group.states.forEach((state, stateIndex) => {
				new Setting(groupContainer)
					.setName(state.name)
					.setDesc(`Color: ${state.color}`)
					.addText(text => text
						.setPlaceholder('State name')
						.setValue(state.name)
						.onChange(async (value) => {
							this.plugin.settings.stateGroups[groupIndex].states[stateIndex].name = value;
							await this.plugin.saveSettings();
						}))
					.addColorPicker(colorPicker => colorPicker
						.setValue(state.color)
						.onChange(async (value) => {
							this.plugin.settings.stateGroups[groupIndex].states[stateIndex].color = value;
							await this.plugin.saveSettings();
						}))
					.addButton(button => button
						.setButtonText('Remove')
						.onClick(async () => {
							this.plugin.settings.stateGroups[groupIndex].states.splice(stateIndex, 1);
							await this.plugin.saveSettings();
							this.display();
						}));
			});

			// Add state button for this group
			new Setting(groupContainer)
				.addButton(button => button
					.setButtonText('Add State')
					.onClick(async () => {
						const newState = {
							id: `state-${Date.now()}`,
							name: 'New State',
							color: '#666666',
							order: group.states.length
						};
						this.plugin.settings.stateGroups[groupIndex].states.push(newState);
						await this.plugin.saveSettings();
						this.display();
					}));
		});
	}

	displayPeople() {
		const { containerEl } = this;
		
		// Add new person button
		new Setting(containerEl)
			.setName('Add Person')
			.setDesc('Add a new team member')
			.addButton(button => button
				.setButtonText('Add Person')
				.onClick(() => {
					const newPerson = {
						id: `person-${Date.now()}`,
						name: 'New Person',
						email: '',
						role: ''
					};
					this.plugin.settings.people.push(newPerson);
					this.plugin.saveSettings();
					this.display();
				}));

		// Display existing people
		this.plugin.settings.people.forEach((person, index) => {
			const personContainer = containerEl.createDiv('taskmaster-person');
			
			new Setting(personContainer)
				.setName(person.name)
				.setDesc(`${person.email} - ${person.role}`)
				.addText(text => text
					.setPlaceholder('Name')
					.setValue(person.name)
					.onChange(async (value) => {
						this.plugin.settings.people[index].name = value;
						await this.plugin.saveSettings();
					}))
				.addText(text => text
					.setPlaceholder('Email')
					.setValue(person.email)
					.onChange(async (value) => {
						this.plugin.settings.people[index].email = value;
						await this.plugin.saveSettings();
					}))
				.addText(text => text
					.setPlaceholder('Role')
					.setValue(person.role || '')
					.onChange(async (value) => {
						this.plugin.settings.people[index].role = value;
						await this.plugin.saveSettings();
					}))
				.addButton(button => button
					.setButtonText('Remove')
					.onClick(async () => {
						this.plugin.settings.people.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					}));
		});
	}
}

module.exports = { TaskMasterSettingTab };
