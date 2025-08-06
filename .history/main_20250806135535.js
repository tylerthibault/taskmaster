/**
 * TaskMaster Plugin - Working version with inline processor
 */

const { Plugin, PluginSettingTab, Setting, Notice } = require('obsidian');

// Default settings
const DEFAULT_SETTINGS = {
	debugMode: true,
	stateGroups: {
		'default': {
			id: 'default',
			name: 'Default',
			states: [
				{ id: 'todo', name: 'To Do', color: '#e74c3c', order: 0 },
				{ id: 'in-progress', name: 'In Progress', color: '#f39c12', order: 1 },
				{ id: 'done', name: 'Done', color: '#27ae60', order: 2 }
			]
		}
	},
	people: {},
	defaultStateGroup: 'default',
	timeTrackingEnabled: true,
	autoSave: true,
	theme: 'default'
};

// Logger utility
class Logger {
	constructor(debugMode = false) {
		this.debugMode = debugMode;
		this.prefix = '[TaskMaster]';
	}

	log(...args) {
		console.log(this.prefix, ...args);
	}

	error(...args) {
		console.error(this.prefix, '[ERROR]', ...args);
	}

	debug(...args) {
		if (this.debugMode) {
			console.log(this.prefix, '[DEBUG]', ...args);
		}
	}

	methodEntry(className, methodName, params) {
		if (this.debugMode) {
			console.log(this.prefix, `[${className}::${methodName}]`, params);
		}
	}

	warn(...args) {
		console.warn(this.prefix, '[WARN]', ...args);
	}

	setDebugMode(debugMode) {
		this.debugMode = debugMode;
	}
}

// Simple Multi-State Button Processor
class MultiStateButtonProcessor {
	constructor(app, settings, logger) {
		this.app = app;
		this.settings = settings;
		this.logger = logger;
		this.buttonRegex = /\{\{multi-state-button:([^:]+):([^}]+)\}\}/g;
	}

	processInlineButtons(el, ctx) {
		try {
			const walker = document.createTreeWalker(
				el,
				NodeFilter.SHOW_TEXT,
				null,
				false
			);

			const textNodes = [];
			let node;
			while (node = walker.nextNode()) {
				if (this.buttonRegex.test(node.textContent)) {
					textNodes.push(node);
				}
			}

			textNodes.forEach(textNode => {
				this.processTextNode(textNode, ctx);
			});
		} catch (error) {
			this.logger.error('Error processing inline buttons:', error);
		}
	}

	processTextNode(textNode, ctx) {
		const text = textNode.textContent;
		const parent = textNode.parentNode;
		
		if (!parent) return;
		
		const fragment = document.createDocumentFragment();
		let lastIndex = 0;
		let match;
		
		this.buttonRegex.lastIndex = 0;
		
		while ((match = this.buttonRegex.exec(text)) !== null) {
			const [fullMatch, buttonId, currentState] = match;
			
			if (match.index > lastIndex) {
				const textBefore = text.substring(lastIndex, match.index);
				fragment.appendChild(document.createTextNode(textBefore));
			}
			
			this.createButton(fragment, buttonId, currentState, ctx);
			
			lastIndex = match.index + fullMatch.length;
		}
		
		if (lastIndex < text.length) {
			const textAfter = text.substring(lastIndex);
			fragment.appendChild(document.createTextNode(textAfter));
		}
		
		parent.replaceChild(fragment, textNode);
	}

	createButton(container, buttonId, currentState, ctx) {
		const stateGroupData = this.settings.stateGroups[this.settings.defaultStateGroup];
		if (!stateGroupData) {
			this.logger.error('No default state group found');
			container.appendChild(document.createTextNode(`{{multi-state-button:${buttonId}:${currentState}}}`));
			return;
		}

		let state = stateGroupData.states.find(s => s.id === currentState);
		if (!state) {
			state = stateGroupData.states[0];
			if (!state) {
				this.logger.error('No states found in state group');
				container.appendChild(document.createTextNode(`{{multi-state-button:${buttonId}:${currentState}}}`));
				return;
			}
		}
		
		const button = document.createElement('button');
		button.textContent = state.name;
		button.className = 'taskmaster-button';
		button.setAttribute('data-button-id', buttonId);
		button.setAttribute('data-state', state.id);
		
		// Style the button
		button.style.cssText = `
			background-color: ${state.color}; 
			color: ${this.getContrastColor(state.color)}; 
			padding: 4px 12px; 
			margin: 2px; 
			border: 1px solid #ccc; 
			border-radius: 6px; 
			cursor: pointer;
			font-size: 0.85em;
			font-weight: 500;
		`;
		
		button.addEventListener('click', async (event) => {
			event.preventDefault();
			event.stopPropagation();
			await this.handleButtonClick(button, buttonId, state.id, stateGroupData, ctx);
		});
		
		container.appendChild(button);
	}

	async handleButtonClick(button, buttonId, currentStateId, stateGroupData, ctx) {
		try {
			// Find next state
			const currentIndex = stateGroupData.states.findIndex(s => s.id === currentStateId);
			const nextIndex = (currentIndex + 1) % stateGroupData.states.length;
			const nextState = stateGroupData.states[nextIndex];
			
			if (!nextState) {
				this.logger.error('No next state found');
				return;
			}
			
			// Update button appearance
			button.textContent = nextState.name;
			button.setAttribute('data-state', nextState.id);
			button.style.backgroundColor = nextState.color;
			button.style.color = this.getContrastColor(nextState.color);
			
			// Update source file
			await this.updateButtonInSource(buttonId, currentStateId, nextState.id, ctx);
			
		} catch (error) {
			this.logger.error('Error handling button click:', error);
		}
	}

	async updateButtonInSource(buttonId, oldState, newState, ctx) {
		if (!ctx.sourcePath) {
			this.logger.warn('No source path available for button update');
			return;
		}
		
		try {
			const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
			if (!file) {
				this.logger.error('Source file not found:', ctx.sourcePath);
				return;
			}
			
			const content = await this.app.vault.read(file);
			const oldSyntax = `{{multi-state-button:${buttonId}:${oldState}}}`;
			const newSyntax = `{{multi-state-button:${buttonId}:${newState}}}`;
			
			const newContent = content.replace(oldSyntax, newSyntax);
			
			if (newContent !== content) {
				await this.app.vault.modify(file, newContent);
				this.logger.debug('Source file updated successfully');
			} else {
				this.logger.warn('Button syntax not found in source file');
			}
		} catch (error) {
			this.logger.error('Error updating source file:', error);
		}
	}

	getContrastColor(backgroundColor) {
		const hex = backgroundColor.replace('#', '');
		const r = parseInt(hex.substr(0, 2), 16);
		const g = parseInt(hex.substr(2, 2), 16);
		const b = parseInt(hex.substr(4, 2), 16);
		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
		return luminance > 0.5 ? 'black' : 'white';
	}

	updateSettings(newSettings) {
		this.settings = newSettings;
		this.logger.debug('Processor settings updated');
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

		new Setting(containerEl)
			.setName('Debug Mode')
			.setDesc('Enable debug logging')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.debugMode)
				.onChange(async (value) => {
					this.plugin.settings.debugMode = value;
					await this.plugin.saveSettings();
				}));

		// State Groups Section
		containerEl.createEl('h3', { text: 'State Groups' });
		
		// Add new state group button
		new Setting(containerEl)
			.setName('Add New State Group')
			.setDesc('Create a new group of states for your buttons')
			.addButton(button => button
				.setButtonText('+ Add Group')
				.onClick(() => {
					this.createNewStateGroup();
				}));
		
		const groupsContainer = containerEl.createDiv('taskmaster-state-groups-container');
		this.refreshStateGroupsList(groupsContainer);
	}

	refreshStateGroupsList(container) {
		container.empty();
		
		Object.entries(this.plugin.settings.stateGroups).forEach(([groupId, groupData]) => {
			const groupDiv = container.createDiv('taskmaster-state-group');
			
			const headerDiv = groupDiv.createDiv('taskmaster-state-group-header');
			headerDiv.createEl('h4', { text: groupData.name });
			
			// Group actions
			const groupActions = headerDiv.createDiv('taskmaster-group-actions');
			groupActions.style.cssText = 'display: inline-flex; gap: 8px; margin-left: 10px;';
			
			groupActions.createEl('button', { 
				text: 'Edit', 
				cls: 'mod-cta' 
			}).onclick = () => this.editStateGroup(groupId);
			
			groupActions.createEl('button', { 
				text: 'Delete', 
				cls: 'mod-warning' 
			}).onclick = () => this.deleteStateGroup(groupId);
			
			const statesDiv = groupDiv.createDiv('taskmaster-states-list');
			
			// Add state button
			const addStateDiv = statesDiv.createDiv('taskmaster-add-state');
			addStateDiv.createEl('button', { 
				text: '+ Add State',
				cls: 'mod-cta' 
			}).onclick = () => this.addNewState(groupId);
			
			// List existing states
			groupData.states.forEach((state, index) => {
				const stateDiv = statesDiv.createDiv('taskmaster-state-item');
				stateDiv.style.cssText = 'display: flex; align-items: center; gap: 8px; margin: 4px 0; padding: 4px;';
				
				const colorIndicator = stateDiv.createDiv('taskmaster-state-color');
				colorIndicator.style.cssText = `
					width: 16px; 
					height: 16px; 
					border-radius: 50%; 
					background-color: ${state.color};
					border: 1px solid #ccc;
				`;
				
				stateDiv.createSpan({ text: state.name, cls: 'taskmaster-state-name' });
				stateDiv.createSpan({ text: `(${state.order})`, cls: 'taskmaster-state-order' });
				
				// State actions
				const stateActions = stateDiv.createDiv('taskmaster-state-actions');
				stateActions.style.cssText = 'margin-left: auto; display: flex; gap: 4px;';
				
				stateActions.createEl('button', { 
					text: 'Edit',
					cls: 'mod-small'
				}).onclick = () => this.editState(groupId, index);
				
				stateActions.createEl('button', { 
					text: 'Delete',
					cls: 'mod-small mod-warning'
				}).onclick = () => this.deleteState(groupId, index);
			});
		});
	}

	async createNewStateGroup() {
		console.log('[TaskMaster] createNewStateGroup called');
		const groupName = await this.promptForText('Enter group name:', 'New Group');
		if (!groupName) {
			console.log('[TaskMaster] User cancelled group creation');
			return;
		}
		
		console.log('[TaskMaster] Creating group with name:', groupName);
		const groupId = groupName.toLowerCase().replace(/[^a-z0-9]/g, '-');
		
		// Check if group already exists
		if (this.plugin.settings.stateGroups[groupId]) {
			console.log('[TaskMaster] Group already exists:', groupId);
			new Notice('A group with this name already exists!');
			return;
		}
		
		// Create new group with default state
		this.plugin.settings.stateGroups[groupId] = {
			id: groupId,
			name: groupName,
			states: [
				{ id: 'new-state', name: 'New State', color: '#666666', order: 0 }
			]
		};
		
		console.log('[TaskMaster] Group created, saving settings...', this.plugin.settings.stateGroups);
		await this.plugin.saveSettings();
		console.log('[TaskMaster] Settings saved, refreshing display...');
		this.display(); // Refresh the interface
		new Notice(`State group "${groupName}" created!`);
	}

	async editStateGroup(groupId) {
		const groupData = this.plugin.settings.stateGroups[groupId];
		const newName = await this.promptForText('Enter new group name:', groupData.name);
		if (!newName || newName === groupData.name) return;
		
		groupData.name = newName;
		await this.plugin.saveSettings();
		this.display();
		new Notice('Group name updated!');
	}

	async deleteStateGroup(groupId) {
		const groupData = this.plugin.settings.stateGroups[groupId];
		const confirmed = await this.confirmAction(`Delete group "${groupData.name}"?`, 'This will permanently delete the group and all its states.');
		if (!confirmed) return;
		
		// Don't allow deleting the default group if it's the only one
		if (groupId === 'default' && Object.keys(this.plugin.settings.stateGroups).length === 1) {
			new Notice('Cannot delete the last remaining group!');
			return;
		}
		
		delete this.plugin.settings.stateGroups[groupId];
		
		// If we deleted the default group, set a new default
		if (this.plugin.settings.defaultStateGroup === groupId) {
			this.plugin.settings.defaultStateGroup = Object.keys(this.plugin.settings.stateGroups)[0];
		}
		
		await this.plugin.saveSettings();
		this.display();
		new Notice('Group deleted!');
	}

	async addNewState(groupId) {
		const stateName = await this.promptForText('Enter state name:', 'New State');
		if (!stateName) return;
		
		const stateId = stateName.toLowerCase().replace(/[^a-z0-9]/g, '-');
		const group = this.plugin.settings.stateGroups[groupId];
		
		// Check if state already exists in this group
		if (group.states.find(s => s.id === stateId)) {
			new Notice('A state with this name already exists in this group!');
			return;
		}
		
		// Add new state
		const newOrder = Math.max(...group.states.map(s => s.order)) + 1;
		group.states.push({
			id: stateId,
			name: stateName,
			color: '#666666',
			order: newOrder
		});
		
		await this.plugin.saveSettings();
		this.display();
		new Notice(`State "${stateName}" added!`);
	}

	async editState(groupId, stateIndex) {
		const group = this.plugin.settings.stateGroups[groupId];
		const state = group.states[stateIndex];
		
		const newName = await this.promptForText('Enter new state name:', state.name);
		if (!newName || newName === state.name) return;
		
		state.name = newName;
		state.id = newName.toLowerCase().replace(/[^a-z0-9]/g, '-');
		
		await this.plugin.saveSettings();
		this.display();
		new Notice('State updated!');
	}

	async deleteState(groupId, stateIndex) {
		const group = this.plugin.settings.stateGroups[groupId];
		const state = group.states[stateIndex];
		
		// Don't allow deleting the last state
		if (group.states.length === 1) {
			new Notice('Cannot delete the last state in a group!');
			return;
		}
		
		const confirmed = await this.confirmAction(`Delete state "${state.name}"?`, 'This action cannot be undone.');
		if (!confirmed) return;
		
		group.states.splice(stateIndex, 1);
		
		// Reorder remaining states
		group.states.forEach((s, i) => s.order = i);
		
		await this.plugin.saveSettings();
		this.display();
		new Notice('State deleted!');
	}

	async promptForText(message, defaultValue = '') {
		console.log('[TaskMaster] promptForText called with:', message, defaultValue);
		return new Promise((resolve) => {
			// Import Modal from obsidian
			const { Modal } = require('obsidian');
			
			class TextPromptModal extends Modal {
				constructor(app, message, defaultValue, resolve) {
					super(app);
					this.message = message;
					this.defaultValue = defaultValue;
					this.resolve = resolve;
					this.submitted = false;
					console.log('[TaskMaster] TextPromptModal created');
				}
				
				onOpen() {
					console.log('[TaskMaster] TextPromptModal onOpen called');
					const { contentEl } = this;
					contentEl.empty();
					
					contentEl.createEl('h3', { text: this.message });
					
					this.inputEl = contentEl.createEl('input', { 
						type: 'text', 
						value: this.defaultValue 
					});
					this.inputEl.style.cssText = 'width: 100%; margin: 10px 0; padding: 8px; font-size: 14px;';
					
					const buttonDiv = contentEl.createDiv();
					buttonDiv.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end; margin-top: 15px;';
					
					const cancelBtn = buttonDiv.createEl('button', { text: 'Cancel' });
					cancelBtn.onclick = () => {
						console.log('[TaskMaster] Cancel clicked');
						this.close();
					};
					
					const okBtn = buttonDiv.createEl('button', { text: 'OK', cls: 'mod-cta' });
					okBtn.onclick = () => {
						console.log('[TaskMaster] OK clicked');
						this.submit();
					};
					
					this.inputEl.addEventListener('keydown', (e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							console.log('[TaskMaster] Enter pressed');
							this.submit();
						} else if (e.key === 'Escape') {
							e.preventDefault();
							console.log('[TaskMaster] Escape pressed');
							this.close();
						}
					});
					
					// Focus and select text after a brief delay
					setTimeout(() => {
						this.inputEl.focus();
						this.inputEl.select();
					}, 10);
				}
				
				submit() {
					const value = this.inputEl.value.trim();
					console.log('[TaskMaster] Submitting value:', value);
					this.submitted = true;
					this.close();
					this.resolve(value || null);
				}
				
				onClose() {
					console.log('[TaskMaster] Modal closing, submitted:', this.submitted);
					if (!this.submitted) {
						this.resolve(null);
					}
				}
			}
			
			const modal = new TextPromptModal(this.plugin.app, message, defaultValue, resolve);
			modal.open();
		});
	}

	async confirmAction(title, message) {
		return new Promise((resolve) => {
			// Import Modal from obsidian
			const { Modal } = require('obsidian');
			
			class ConfirmModal extends Modal {
				constructor(app, title, message, resolve) {
					super(app);
					this.title = title;
					this.message = message;
					this.resolve = resolve;
				}
				
				onOpen() {
					const { contentEl } = this;
					contentEl.empty();
					
					contentEl.createEl('h3', { text: this.title });
					contentEl.createEl('p', { text: this.message });
					
					const buttonDiv = contentEl.createDiv();
					buttonDiv.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px;';
					
					const cancelBtn = buttonDiv.createEl('button', { text: 'Cancel' });
					cancelBtn.onclick = () => {
						this.close();
						this.resolve(false);
					};
					
					const deleteBtn = buttonDiv.createEl('button', { text: 'Delete', cls: 'mod-warning' });
					deleteBtn.onclick = () => {
						this.close();
						this.resolve(true);
					};
					
					// Focus cancel button by default
					setTimeout(() => cancelBtn.focus(), 10);
				}
				
				onClose() {
					if (!this.resolved) {
						this.resolve(false);
					}
				}
			}
			
			const modal = new ConfirmModal(this.plugin.app, title, message, resolve);
			modal.open();
		});
	}
}

// Main Plugin Class
class TaskMasterPlugin extends Plugin {
	async onload() {
		console.log('[TaskMaster] INLINE PROCESSOR VERSION - Starting load...');
		
		try {
			await this.loadSettings();
			console.log('[TaskMaster] Settings loaded');
			
			this.logger = new Logger(this.settings.debugMode);
			this.logger.log('TaskMaster progressive plugin loading...');

			// Initialize processor
			this.multiStateProcessor = new MultiStateButtonProcessor(this.app, this.settings, this.logger);
			console.log('[TaskMaster] Inline processor created');

			// Register processor (inline only for now)
			this.registerMarkdownPostProcessor((el, ctx) => {
				this.multiStateProcessor.processInlineButtons(el, ctx);
			});
			console.log('[TaskMaster] Post processor registered');

			// Store reference to settings tab for commands
			this.settingTab = new TaskMasterSettingTab(this.app, this);
			this.addSettingTab(this.settingTab);
			console.log('[TaskMaster] Settings tab added');

			// Add command palette commands
			this.addCommands();
			console.log('[TaskMaster] Commands added');

			this.logger.log('TaskMaster inline processor plugin loaded successfully!');
			console.log('[TaskMaster] INLINE PROCESSOR VERSION - Load complete!');
			
			// Show success notice
			new Notice('TaskMaster inline processor version loaded!');
			
		} catch (error) {
			console.error('[TaskMaster] FATAL ERROR during load:', error);
			console.error('[TaskMaster] Stack trace:', error.stack);
			new Notice('TaskMaster failed to load - check console for details');
			throw error;
		}
	}

	onunload() {
		console.log('[TaskMaster] INLINE PROCESSOR VERSION - Unloading...');
		this.logger?.log('TaskMaster progressive plugin unloaded');
	}

	addCommands() {
		// Command to insert multi-state button
		this.addCommand({
			id: 'insert-multi-state-button',
			name: 'Insert Multi-State Button',
			editorCallback: (editor) => {
				this.insertMultiStateButton(editor);
			}
		});

		// Command to open TaskMaster settings
		this.addCommand({
			id: 'open-taskmaster-settings',
			name: 'Open TaskMaster Settings',
			callback: () => {
				this.app.setting.open();
				this.app.setting.openTabById('taskmaster');
			}
		});

		// Command to create new state group
		this.addCommand({
			id: 'create-state-group',
			name: 'Create New State Group',
			callback: async () => {
				// Open settings and trigger create group
				this.app.setting.open();
				this.app.setting.openTabById('taskmaster-settings');
				
				// Wait a bit for settings to open, then trigger create
				setTimeout(() => {
					if (this.settingTab) {
						this.settingTab.createNewStateGroup();
					}
				}, 100);
			}
		});
	}

	async insertMultiStateButton(editor) {
		try {
			// Get available state groups
			const stateGroups = Object.keys(this.settings.stateGroups);
			if (stateGroups.length === 0) {
				new Notice('No state groups available. Create one in settings first.');
				return;
			}

			// If only one group, use it directly
			let selectedGroup = this.settings.defaultStateGroup;
			if (stateGroups.length > 1) {
				selectedGroup = await this.selectStateGroup(stateGroups);
				if (!selectedGroup) return; // User cancelled
			}

			// Generate unique button ID
			const buttonId = this.generateButtonId();
			
			// Get first state from selected group
			const groupData = this.settings.stateGroups[selectedGroup];
			const firstState = groupData.states[0];
			
			if (!firstState) {
				new Notice('Selected state group has no states. Add states in settings first.');
				return;
			}

			// Insert button syntax at cursor
			const buttonSyntax = `{{multi-state-button:${buttonId}:${firstState.id}}}`;
			editor.replaceSelection(buttonSyntax);
			
			new Notice(`Multi-state button inserted with ID: ${buttonId}`);
			
		} catch (error) {
			this.logger.error('Error inserting multi-state button:', error);
			new Notice('Failed to insert multi-state button');
		}
	}

	async selectStateGroup(stateGroups) {
		return new Promise((resolve) => {
			const { Modal } = require('obsidian');
			
			class StateGroupSelector extends Modal {
				constructor(app, stateGroups, settings, resolve) {
					super(app);
					this.stateGroups = stateGroups;
					this.settings = settings;
					this.resolve = resolve;
				}
				
				onOpen() {
					const { contentEl } = this;
					contentEl.empty();
					
					contentEl.createEl('h3', { text: 'Select State Group' });
					contentEl.createEl('p', { text: 'Choose which state group to use for this button:' });
					
					const listEl = contentEl.createEl('div');
					listEl.style.cssText = 'margin: 15px 0;';
					
					this.stateGroups.forEach(groupId => {
						const groupData = this.settings.stateGroups[groupId];
						const item = listEl.createEl('div');
						item.style.cssText = 'padding: 8px; margin: 4px 0; border: 1px solid var(--background-modifier-border); border-radius: 4px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;';
						
						const nameEl = item.createEl('span', { text: groupData.name });
						const statesEl = item.createEl('span', { 
							text: `${groupData.states.length} states`,
							cls: 'setting-item-description'
						});
						
						item.addEventListener('click', () => {
							this.close();
							this.resolve(groupId);
						});
						
						item.addEventListener('mouseenter', () => {
							item.style.backgroundColor = 'var(--background-modifier-hover)';
						});
						
						item.addEventListener('mouseleave', () => {
							item.style.backgroundColor = '';
						});
					});
					
					const buttonDiv = contentEl.createDiv();
					buttonDiv.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end; margin-top: 15px;';
					
					buttonDiv.createEl('button', { text: 'Cancel' }).onclick = () => {
						this.close();
						this.resolve(null);
					};
				}
				
				onClose() {
					if (!this.resolved) {
						this.resolve(null);
					}
				}
			}
			
			const modal = new StateGroupSelector(this.app, stateGroups, this.settings, resolve);
			modal.open();
		});
	}

	generateButtonId() {
		// Generate a simple unique ID based on timestamp and random
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substr(2, 5);
		return `btn_${timestamp}_${random}`;
	}

	async loadSettings() {
		const loadedData = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
		
		if (!this.settings.stateGroups || Object.keys(this.settings.stateGroups).length === 0) {
			this.settings.stateGroups = DEFAULT_SETTINGS.stateGroups;
		}
		
		if (!this.settings.people) {
			this.settings.people = {};
		}
	}

	async saveSettings() {
		try {
			console.log('[TaskMaster] Saving settings...', this.settings);
			await this.saveData(this.settings);
			console.log('[TaskMaster] Settings saved successfully');
			
			// Update logger debug mode
			if (this.logger) {
				this.logger.setDebugMode(this.settings.debugMode);
			}
			
			// Notify processors of settings changes
			if (this.multiStateProcessor) {
				this.multiStateProcessor.updateSettings(this.settings);
			}
			
			this.logger?.debug('Settings saved and processors updated');
		} catch (error) {
			console.error('[TaskMaster] Error saving settings:', error);
			new Notice('Failed to save TaskMaster settings!');
		}
	}
}

module.exports = TaskMasterPlugin;
