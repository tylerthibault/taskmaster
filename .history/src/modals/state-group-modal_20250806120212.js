import { Modal, Setting, Notice } from 'obsidian';
import { TaskState, TaskStateGroup } from '../settings.js';

/**
 * Modal for creating and editing state groups
 */
export class StateGroupModal extends Modal {
	constructor(app, plugin, existingGroup = null) {
		super(app);
		this.plugin = plugin;
		this.existingGroup = existingGroup;
		this.isEditing = !!existingGroup;
		
		// Initialize form data
		this.formData = {
			id: existingGroup?.id || '',
			name: existingGroup?.name || '',
			states: existingGroup?.states ? [...existingGroup.states] : []
		};
		
		// If creating a new group, add default states
		if (!this.isEditing) {
			this.formData.states = [
				new TaskState('todo', 'To Do', '#e74c3c', 0),
				new TaskState('in-progress', 'In Progress', '#f39c12', 1),
				new TaskState('done', 'Done', '#27ae60', 2)
			];
		}
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Modal title
		contentEl.createEl('h2', { 
			text: this.isEditing ? 'Edit State Group' : 'Create State Group' 
		});

		// Group basic info
		this.createBasicInfoSection(contentEl);
		
		// States management
		this.createStatesSection(contentEl);
		
		// Action buttons
		this.createActionButtons(contentEl);
	}

	/**
	 * Create basic info section (ID and name)
	 */
	createBasicInfoSection(containerEl) {
		const sectionEl = containerEl.createDiv('taskmaster-modal-section');
		sectionEl.createEl('h3', { text: 'Basic Information' });

		// Group ID
		new Setting(sectionEl)
			.setName('Group ID')
			.setDesc('Unique identifier for this state group (cannot be changed after creation)')
			.addText(text => {
				text.setValue(this.formData.id);
				if (this.isEditing) {
					text.setDisabled(true);
				} else {
					text.onChange(value => {
						this.formData.id = value;
					});
				}
			});

		// Group Name
		new Setting(sectionEl)
			.setName('Group Name')
			.setDesc('Display name for this state group')
			.addText(text => {
				text.setValue(this.formData.name);
				text.onChange(value => {
					this.formData.name = value;
				});
			});
	}

	/**
	 * Create states management section
	 */
	createStatesSection(containerEl) {
		const sectionEl = containerEl.createDiv('taskmaster-modal-section');
		const headerEl = sectionEl.createDiv('taskmaster-section-header');
		headerEl.createEl('h3', { text: 'States' });
		
		// Add state button
		const addButton = headerEl.createEl('button', {
			text: 'Add State',
			cls: 'mod-cta'
		});
		addButton.onclick = () => this.addNewState();

		// States container
		this.statesContainer = sectionEl.createDiv('taskmaster-states-container');
		this.refreshStatesDisplay();
	}

	/**
	 * Refresh the states display
	 */
	refreshStatesDisplay() {
		this.statesContainer.empty();

		this.formData.states.forEach((state, index) => {
			const stateEl = this.statesContainer.createDiv('taskmaster-state-editor');
			
			// State order (for drag and drop indication)
			const orderEl = stateEl.createDiv('taskmaster-state-order');
			orderEl.textContent = `${index + 1}`;
			
			// State form
			const formEl = stateEl.createDiv('taskmaster-state-form');
			
			// State ID
			new Setting(formEl)
				.setName('State ID')
				.setDesc('Unique identifier for this state')
				.addText(text => {
					text.setValue(state.id);
					text.onChange(value => {
						state.id = value;
					});
				});

			// State Name
			new Setting(formEl)
				.setName('State Name')
				.setDesc('Display name for this state')
				.addText(text => {
					text.setValue(state.name);
					text.onChange(value => {
						state.name = value;
					});
				});

			// State Color
			new Setting(formEl)
				.setName('Color')
				.setDesc('Background color for this state')
				.addColorPicker(color => {
					color.setValue(state.color);
					color.onChange(value => {
						state.color = value;
					});
				});

			// Controls
			const controlsEl = stateEl.createDiv('taskmaster-state-controls');
			
			// Move up button
			if (index > 0) {
				const upButton = controlsEl.createEl('button', {
					text: '↑',
					title: 'Move up'
				});
				upButton.onclick = () => this.moveState(index, -1);
			}
			
			// Move down button
			if (index < this.formData.states.length - 1) {
				const downButton = controlsEl.createEl('button', {
					text: '↓',
					title: 'Move down'
				});
				downButton.onclick = () => this.moveState(index, 1);
			}
			
			// Delete button
			if (this.formData.states.length > 1) {
				const deleteButton = controlsEl.createEl('button', {
					text: 'Delete',
					cls: 'mod-warning'
				});
				deleteButton.onclick = () => this.deleteState(index);
			}
		});
	}

	/**
	 * Add a new state
	 */
	addNewState() {
		const newOrder = this.formData.states.length;
		const newState = new TaskState(
			`state-${newOrder}`,
			`State ${newOrder + 1}`,
			'#808080',
			newOrder
		);
		this.formData.states.push(newState);
		this.refreshStatesDisplay();
	}

	/**
	 * Move a state up or down
	 */
	moveState(index, direction) {
		const newIndex = index + direction;
		if (newIndex < 0 || newIndex >= this.formData.states.length) return;

		// Swap states
		[this.formData.states[index], this.formData.states[newIndex]] = 
		[this.formData.states[newIndex], this.formData.states[index]];
		
		// Update order properties
		this.formData.states.forEach((state, i) => {
			state.order = i;
		});
		
		this.refreshStatesDisplay();
	}

	/**
	 * Delete a state
	 */
	deleteState(index) {
		if (this.formData.states.length <= 1) {
			new Notice('State group must have at least one state');
			return;
		}
		
		this.formData.states.splice(index, 1);
		
		// Update order properties
		this.formData.states.forEach((state, i) => {
			state.order = i;
		});
		
		this.refreshStatesDisplay();
	}

	/**
	 * Create action buttons (Save/Cancel)
	 */
	createActionButtons(containerEl) {
		const buttonsEl = containerEl.createDiv('taskmaster-modal-buttons');
		
		// Save button
		const saveButton = buttonsEl.createEl('button', {
			text: this.isEditing ? 'Update' : 'Create',
			cls: 'mod-cta'
		});
		saveButton.onclick = () => this.save();
		
		// Cancel button
		const cancelButton = buttonsEl.createEl('button', {
			text: 'Cancel'
		});
		cancelButton.onclick = () => this.close();
	}

	/**
	 * Validate and save the state group
	 */
	async save() {
		// Validation
		if (!this.formData.id.trim()) {
			new Notice('Group ID is required');
			return;
		}
		
		if (!this.formData.name.trim()) {
			new Notice('Group name is required');
			return;
		}
		
		if (this.formData.states.length === 0) {
			new Notice('At least one state is required');
			return;
		}
		
		// Check for duplicate state IDs within the group
		const stateIds = this.formData.states.map(s => s.id);
		const uniqueStateIds = new Set(stateIds);
		if (stateIds.length !== uniqueStateIds.size) {
			new Notice('State IDs must be unique within the group');
			return;
		}
		
		// Check if group ID already exists (for new groups)
		if (!this.isEditing && this.plugin.settings.stateGroups[this.formData.id]) {
			new Notice('A state group with this ID already exists');
			return;
		}

		try {
			// Create the state group
			const stateGroup = new TaskStateGroup(
				this.formData.id,
				this.formData.name,
				this.formData.states
			);
			
			// Save to settings
			this.plugin.settings.setStateGroup(stateGroup);
			await this.plugin.saveSettings();
			
			// Refresh the settings display
			this.plugin.settingsTab?.display();
			
			new Notice(this.isEditing ? 'State group updated' : 'State group created');
			this.close();
		} catch (error) {
			console.error('Error saving state group:', error);
			new Notice('Error saving state group');
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
