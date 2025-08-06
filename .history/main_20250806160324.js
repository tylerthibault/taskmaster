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
		this.processCount = 0; // Debug counter
	}

	// Process code blocks with language "taskmaster"
	processCodeBlock(source, el, ctx) {
		this.processCount++;
		try {
			this.logger.debug(`[CodeBlock #${this.processCount}] Processing taskmaster code block:`, source);
			
			// Parse the code block content
			const config = this.parseCodeBlockConfig(source);
			if (!config) {
				this.logger.error('Failed to parse code block configuration');
				return;
			}

			this.logger.debug('Parsed config:', config);

			// Clear the element and create the button
			el.empty();
			this.createButton(el, config.buttonId, config.state, ctx, config);

		} catch (error) {
			this.logger.error('Error processing taskmaster code block:', error);
			console.error('[TaskMaster] Code block processing error:', error);
		}
	}

	parseCodeBlockConfig(source) {
		try {
			const lines = source.trim().split('\n');
			const config = {};
			
			// Parse key-value pairs
			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed || trimmed.startsWith('#')) continue; // Skip empty lines and comments
				
				const colonIndex = trimmed.indexOf(':');
				if (colonIndex === -1) continue;
				
				const key = trimmed.substring(0, colonIndex).trim();
				const value = trimmed.substring(colonIndex + 1).trim();
				
				config[key] = value;
			}

			// Validate required fields
			if (!config['button-id'] && !config['id']) {
				this.logger.error('Code block missing required "button-id" or "id" field');
				return null;
			}

			// Normalize the configuration
			const normalized = {
				buttonId: config['button-id'] || config['id'],
				state: config['state'] || config['current-state'] || 'todo',
				group: config['group'] || config['state-group'] || this.settings.defaultStateGroup,
				label: config['label'] || config['name'] || null,
				description: config['description'] || config['desc'] || null
			};

			this.logger.debug('Normalized config:', normalized);
			return normalized;

		} catch (error) {
			this.logger.error('Error parsing code block config:', error);
			return null;
		}
	}

	processInlineButtons(el, ctx) {
		this.processCount++;
		try {
			this.logger.debug(`[Process #${this.processCount}] Processing inline buttons in element:`, el);
			this.logger.debug('Context:', ctx);
			
			// First, try the simple approach - just check if the element contains our syntax
			const elementText = el.textContent || el.innerText || '';
			const hasButtonSyntax = /\{\{multi-state-button:([^:]+):([^}]+)\}\}/.test(elementText);
			
			if (!hasButtonSyntax) {
				this.logger.debug('No button syntax found in element text:', elementText.substring(0, 100));
				return;
			}
			
			this.logger.debug('Found button syntax in element, proceeding with TreeWalker');
			
			const walker = document.createTreeWalker(
				el,
				NodeFilter.SHOW_TEXT,
				null,
				false
			);

			const textNodes = [];
			let node;
			while (node = walker.nextNode()) {
				// Create a NEW regex instance for testing to avoid state pollution
				const testRegex = /\{\{multi-state-button:([^:]+):([^}]+)\}\}/g;
				if (testRegex.test(node.textContent)) {
					this.logger.debug('Found text node with button syntax:', node.textContent);
					textNodes.push(node);
				}
			}

			this.logger.debug(`Found ${textNodes.length} text nodes with button syntax`);

			textNodes.forEach((textNode, index) => {
				this.logger.debug(`Processing text node ${index + 1}:`, textNode.textContent);
				this.processTextNode(textNode, ctx);
			});
			
			if (textNodes.length === 0) {
				this.logger.warn('TreeWalker found no matching text nodes, trying fallback method');
				this.fallbackProcessing(el, ctx);
			}
		} catch (error) {
			this.logger.error('Error processing inline buttons:', error);
			console.error('[TaskMaster] Full error details:', error);
		}
	}

	fallbackProcessing(el, ctx) {
		try {
			this.logger.debug('Attempting fallback processing');
			
			// Try to find and replace directly in innerHTML
			const originalHTML = el.innerHTML;
			const regex = /\{\{multi-state-button:([^:]+):([^}]+)\}\}/g;
			let match;
			let hasMatches = false;
			
			let newHTML = originalHTML;
			
			while ((match = regex.exec(originalHTML)) !== null) {
				hasMatches = true;
				const [fullMatch, buttonId, currentState] = match;
				this.logger.debug('Fallback found match:', { fullMatch, buttonId, currentState });
				
				// Create a temporary container for the button
				const tempContainer = document.createElement('div');
				this.createButton(tempContainer, buttonId, currentState, ctx);
				
				if (tempContainer.firstChild) {
					const buttonHTML = tempContainer.innerHTML;
					newHTML = newHTML.replace(fullMatch, buttonHTML);
				}
			}
			
			if (hasMatches) {
				this.logger.debug('Fallback processing applied changes');
				el.innerHTML = newHTML;
			}
		} catch (error) {
			this.logger.error('Fallback processing failed:', error);
		}
	}

	processInlineButtons(el, ctx) {
		try {
			this.logger.debug('Processing inline buttons in element:', el);
			this.logger.debug('Context:', ctx);
			
			const walker = document.createTreeWalker(
				el,
				NodeFilter.SHOW_TEXT,
				null,
				false
			);

			const textNodes = [];
			let node;
			while (node = walker.nextNode()) {
				// Create a NEW regex instance for testing to avoid state pollution
				const testRegex = /\{\{multi-state-button:([^:]+):([^}]+)\}\}/g;
				if (testRegex.test(node.textContent)) {
					this.logger.debug('Found text node with button syntax:', node.textContent);
					textNodes.push(node);
				}
			}

			this.logger.debug(`Found ${textNodes.length} text nodes with button syntax`);

			textNodes.forEach((textNode, index) => {
				this.logger.debug(`Processing text node ${index + 1}:`, textNode.textContent);
				this.processTextNode(textNode, ctx);
			});
			
			if (textNodes.length === 0) {
				this.logger.debug('No multi-state button syntax found in element');
				// Let's also check what text content we actually have
				this.logger.debug('Element text content:', el.textContent);
			}
		} catch (error) {
			this.logger.error('Error processing inline buttons:', error);
			console.error('[TaskMaster] Full error details:', error);
		}
	}

	processTextNode(textNode, ctx) {
		const text = textNode.textContent;
		const parent = textNode.parentNode;
		
		this.logger.debug('Processing text node:', text);
		this.logger.debug('Parent element:', parent?.tagName);
		
		if (!parent) {
			this.logger.warn('Text node has no parent, skipping');
			return;
		}
		
		const fragment = document.createDocumentFragment();
		let lastIndex = 0;
		let match;
		
		// Create a FRESH regex instance for each text node to avoid state issues
		const processRegex = /\{\{multi-state-button:([^:]+):([^}]+)\}\}/g;
		let matchCount = 0;
		
		while ((match = processRegex.exec(text)) !== null) {
			matchCount++;
			const [fullMatch, buttonId, currentState] = match;
			
			this.logger.debug(`Found match ${matchCount}:`, { fullMatch, buttonId, currentState });
			
			if (match.index > lastIndex) {
				const textBefore = text.substring(lastIndex, match.index);
				fragment.appendChild(document.createTextNode(textBefore));
				this.logger.debug('Added text before:', textBefore);
			}
			
			this.logger.debug('Creating button for:', { buttonId, currentState });
			this.createButton(fragment, buttonId, currentState, ctx);
			
			lastIndex = match.index + fullMatch.length;
		}
		
		if (matchCount === 0) {
			this.logger.warn('No matches found in text node, even though it was detected earlier:', text);
			return; // Don't replace if no matches found
		}
		
		if (lastIndex < text.length) {
			const textAfter = text.substring(lastIndex);
			fragment.appendChild(document.createTextNode(textAfter));
			this.logger.debug('Added text after:', textAfter);
		}
		
		this.logger.debug('Replacing text node with fragment containing', fragment.childNodes.length, 'nodes');
		parent.replaceChild(fragment, textNode);
	}

	createButton(container, buttonId, currentState, ctx, extendedConfig = null) {
		this.logger.debug('Creating button:', { buttonId, currentState, extendedConfig });
		
		// Determine which state group to use
		const stateGroupId = extendedConfig?.group || this.settings.defaultStateGroup;
		
		this.logger.debug('Available settings:', {
			requestedGroup: stateGroupId,
			defaultStateGroup: this.settings.defaultStateGroup,
			stateGroupKeys: Object.keys(this.settings.stateGroups)
		});
		
		const stateGroupData = this.settings.stateGroups[stateGroupId];
		if (!stateGroupData) {
			this.logger.error('State group not found:', stateGroupId);
			this.logger.error('Available state groups:', Object.keys(this.settings.stateGroups));
			
			// Fallback to plain text
			const fallbackText = extendedConfig 
				? `[TaskMaster Error: State group '${stateGroupId}' not found]`
				: `{{multi-state-button:${buttonId}:${currentState}}}`;
			container.appendChild(document.createTextNode(fallbackText));
			return;
		}

		this.logger.debug('Using state group:', stateGroupData.name, 'with states:', stateGroupData.states);

		let state = stateGroupData.states.find(s => s.id === currentState);
		if (!state) {
			this.logger.warn(`State '${currentState}' not found in group '${stateGroupId}', using first state`);
			state = stateGroupData.states[0];
			if (!state) {
				this.logger.error('No states found in state group:', stateGroupData.name);
				const fallbackText = extendedConfig 
					? `[TaskMaster Error: No states in group '${stateGroupId}']`
					: `{{multi-state-button:${buttonId}:${currentState}}}`;
				container.appendChild(document.createTextNode(fallbackText));
				return;
			}
		}
		
		this.logger.debug('Using state:', state);
		
		const button = document.createElement('button');
		
		// Use custom label if provided, otherwise use state name
		const buttonLabel = extendedConfig?.label || state.name;
		button.textContent = buttonLabel;
		
		button.className = 'taskmaster-button';
		if (extendedConfig) {
			button.classList.add('taskmaster-button-codeblock');
		}
		
		button.setAttribute('data-button-id', buttonId);
		button.setAttribute('data-state', state.id);
		button.setAttribute('data-state-group', stateGroupId);
		
		if (extendedConfig?.description) {
			button.setAttribute('title', extendedConfig.description);
		}
		
		// Style the button with enhanced styling for code block buttons
		const baseStyles = `
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
		
		const enhancedStyles = extendedConfig ? `
			${baseStyles}
			min-width: 80px;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			transition: all 0.2s ease;
		` : baseStyles;
		
		button.style.cssText = enhancedStyles;
		
		button.addEventListener('click', async (event) => {
			event.preventDefault();
			event.stopPropagation();
			await this.handleButtonClick(button, buttonId, state.id, stateGroupData, ctx, extendedConfig);
		});
		
		this.logger.debug('Button created and styled:', button);
		container.appendChild(button);
		this.logger.debug('Button added to container');
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
		
		// Summary of current state groups
		const summaryDiv = containerEl.createDiv('taskmaster-groups-summary');
		this.refreshGroupsSummary(summaryDiv);
		
		// Manage state groups button
		new Setting(containerEl)
			.setName('Manage State Groups')
			.setDesc('Open the state groups manager to create, edit, and delete state groups and their states')
			.addButton(button => button
				.setButtonText('Open Manager')
				.setCta()
				.onClick(() => {
					this.openStateGroupsManager();
				}));

		// Other settings sections can go here...
		containerEl.createEl('h3', { text: 'Other Settings' });
		containerEl.createEl('p', { 
			text: 'Additional TaskMaster settings will appear here as features are developed.',
			cls: 'setting-item-description'
		});
	}

	refreshGroupsSummary(container) {
		container.empty();
		
		const groupCount = Object.keys(this.plugin.settings.stateGroups).length;
		const totalStates = Object.values(this.plugin.settings.stateGroups)
			.reduce((total, group) => total + group.states.length, 0);
		
		const summaryEl = container.createDiv('taskmaster-summary');
		summaryEl.style.cssText = 'padding: 12px; background: var(--background-secondary); border-radius: 6px; margin: 8px 0;';
		
		summaryEl.createEl('div', { 
			text: `${groupCount} state group${groupCount !== 1 ? 's' : ''}, ${totalStates} total state${totalStates !== 1 ? 's' : ''}`,
			cls: 'setting-item-name'
		});
		
		// List group names
		const groupNames = Object.values(this.plugin.settings.stateGroups).map(g => g.name);
		summaryEl.createEl('div', {
			text: `Groups: ${groupNames.join(', ')}`,
			cls: 'setting-item-description'
		});
	}

	openStateGroupsManager() {
		const modal = new StateGroupsManagerModal(this.plugin.app, this.plugin, () => {
			// Refresh summary when modal closes
			const summaryDiv = this.containerEl.querySelector('.taskmaster-groups-summary');
			if (summaryDiv) {
				this.refreshGroupsSummary(summaryDiv);
			}
		});
		modal.open();
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
			}).onclick = async () => {
				try {
					await this.deleteStateGroup(groupId);
				} catch (error) {
					console.error('[TaskMaster] Error in deleteStateGroup:', error);
					new Notice('Error deleting state group: ' + error.message);
				}
			};
			
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
				}).onclick = async () => {
					try {
						await this.deleteState(groupId, index);
					} catch (error) {
						console.error('[TaskMaster] Error in deleteState:', error);
						new Notice('Error deleting state: ' + error.message);
					}
				};
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
		console.log('[TaskMaster] deleteStateGroup called for:', groupId);
		const groupData = this.plugin.settings.stateGroups[groupId];
		const confirmed = await this.confirmAction(`Delete group "${groupData.name}"?`, 'This will permanently delete the group and all its states.');
		console.log('[TaskMaster] User confirmation result:', confirmed);
		
		if (!confirmed) return;
		
		// Don't allow deleting the default group if it's the only one
		if (groupId === 'default' && Object.keys(this.plugin.settings.stateGroups).length === 1) {
			new Notice('Cannot delete the last remaining group!');
			return;
		}
		
		console.log('[TaskMaster] Deleting group:', groupId);
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
		console.log('[TaskMaster] deleteState called for group:', groupId, 'state index:', stateIndex);
		const group = this.plugin.settings.stateGroups[groupId];
		const state = group.states[stateIndex];
		
		// Don't allow deleting the last state
		if (group.states.length === 1) {
			new Notice('Cannot delete the last state in a group!');
			return;
		}
		
		const confirmed = await this.confirmAction(`Delete state "${state.name}"?`, 'This action cannot be undone.');
		console.log('[TaskMaster] User confirmation result:', confirmed);
		
		if (!confirmed) return;
		
		console.log('[TaskMaster] Deleting state:', state.name, 'from group:', groupId);
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
					this.resolved = false;
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
						this.resolved = true;
						this.close();
						this.resolve(false);
					};
					
					const deleteBtn = buttonDiv.createEl('button', { text: 'Delete', cls: 'mod-warning' });
					deleteBtn.onclick = () => {
						this.resolved = true;
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

// State Groups Manager Modal
class StateGroupsManagerModal extends require('obsidian').Modal {
	constructor(app, plugin, onClose) {
		super(app);
		this.plugin = plugin;
		this.onCloseCallback = onClose;
		this.logger = plugin.logger;
	}

	onOpen() {
		const { contentEl } = this;
		this.display();
	}

	onClose() {
		if (this.onCloseCallback) {
			this.onCloseCallback();
		}
	}

	display() {
		const { contentEl } = this;
		contentEl.empty();
		
		// Header
		const headerEl = contentEl.createEl('div');
		headerEl.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid var(--background-modifier-border);';
		
		headerEl.createEl('h2', { text: 'State Groups Manager' });
		
		const closeBtn = headerEl.createEl('button', { text: '×', cls: 'modal-close-button' });
		closeBtn.style.cssText = 'background: none; border: none; font-size: 24px; cursor: pointer; padding: 0; width: 30px; height: 30px;';
		closeBtn.onclick = () => this.close();
		
		// Add new group section
		const addGroupSection = contentEl.createEl('div');
		addGroupSection.style.cssText = 'margin-bottom: 20px; padding: 15px; background: var(--background-secondary); border-radius: 8px;';
		
		addGroupSection.createEl('h3', { text: 'Add New State Group' });
		
		const addGroupControls = addGroupSection.createEl('div');
		addGroupControls.style.cssText = 'display: flex; gap: 10px; align-items: center; margin-top: 10px;';
		
		const groupNameInput = addGroupControls.createEl('input', { 
			type: 'text', 
			placeholder: 'Enter group name...' 
		});
		groupNameInput.style.cssText = 'flex: 1; padding: 8px 12px; border: 1px solid var(--background-modifier-border); border-radius: 4px;';
		
		const addBtn = addGroupControls.createEl('button', { text: '+ Add Group', cls: 'mod-cta' });
		addBtn.onclick = async () => {
			const groupName = groupNameInput.value.trim();
			if (groupName) {
				await this.createNewStateGroup(groupName);
				groupNameInput.value = '';
			}
		};
		
		groupNameInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && groupNameInput.value.trim()) {
				addBtn.click();
			}
		});
		
		// Groups container
		const groupsContainer = contentEl.createEl('div', { cls: 'taskmaster-groups-container' });
		this.refreshStateGroupsList(groupsContainer);
	}

	refreshStateGroupsList(container) {
		container.empty();
		
		Object.entries(this.plugin.settings.stateGroups).forEach(([groupId, groupData]) => {
			const groupDiv = container.createDiv('taskmaster-state-group');
			groupDiv.style.cssText = 'border: 1px solid var(--background-modifier-border); border-radius: 8px; margin: 12px 0; padding: 16px; background: var(--background-primary);';
			
			const headerDiv = groupDiv.createDiv('taskmaster-state-group-header');
			headerDiv.style.cssText = 'display: flex; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--background-modifier-border);';
			
			const titleEl = headerDiv.createEl('h4', { text: groupData.name });
			titleEl.style.cssText = 'margin: 0; flex: 1; color: var(--text-normal);';
			
			// Group actions
			const groupActions = headerDiv.createDiv('taskmaster-group-actions');
			groupActions.style.cssText = 'display: flex; gap: 8px;';
			
			const editBtn = groupActions.createEl('button', { text: 'Edit', cls: 'mod-cta' });
			editBtn.style.cssText = 'padding: 4px 12px; font-size: 12px;';
			editBtn.onclick = async () => {
				await this.editStateGroup(groupId);
			};
			
			const deleteBtn = groupActions.createEl('button', { text: 'Delete', cls: 'mod-warning' });
			deleteBtn.style.cssText = 'padding: 4px 12px; font-size: 12px;';
			deleteBtn.onclick = async () => {
				try {
					await this.deleteStateGroup(groupId);
				} catch (error) {
					console.error('[TaskMaster] Error in deleteStateGroup:', error);
					new Notice('Error deleting state group: ' + error.message);
				}
			};
			
			const statesDiv = groupDiv.createDiv('taskmaster-states-list');
			statesDiv.style.cssText = 'padding-left: 16px;';
			
			// Add state section
			const addStateDiv = statesDiv.createDiv('taskmaster-add-state');
			addStateDiv.style.cssText = 'margin-bottom: 12px; padding: 8px; background: var(--background-secondary); border-radius: 4px;';
			
			const addStateControls = addStateDiv.createEl('div');
			addStateControls.style.cssText = 'display: flex; gap: 8px; align-items: center;';
			
			const stateNameInput = addStateControls.createEl('input', { 
				type: 'text', 
				placeholder: 'New state name...' 
			});
			stateNameInput.style.cssText = 'flex: 1; padding: 6px 10px; font-size: 13px; border: 1px solid var(--background-modifier-border); border-radius: 3px;';
			
			const addStateBtn = addStateControls.createEl('button', { text: '+ Add', cls: 'mod-cta' });
			addStateBtn.style.cssText = 'padding: 6px 12px; font-size: 12px;';
			addStateBtn.onclick = async () => {
				const stateName = stateNameInput.value.trim();
				if (stateName) {
					await this.addNewState(groupId, stateName);
					stateNameInput.value = '';
				}
			};
			
			stateNameInput.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' && stateNameInput.value.trim()) {
					addStateBtn.click();
				}
			});
			
			// List existing states
			groupData.states.forEach((state, index) => {
				const stateDiv = statesDiv.createDiv('taskmaster-state-item');
				stateDiv.style.cssText = 'display: flex; align-items: center; gap: 8px; margin: 6px 0; padding: 8px; border-radius: 4px; background: var(--background-secondary);';
				
				const colorIndicator = stateDiv.createDiv('taskmaster-state-color');
				colorIndicator.style.cssText = `
					width: 16px; 
					height: 16px; 
					border-radius: 50%; 
					background-color: ${state.color};
					border: 1px solid var(--background-modifier-border);
					flex-shrink: 0;
				`;
				
				const nameEl = stateDiv.createSpan({ text: state.name, cls: 'taskmaster-state-name' });
				nameEl.style.cssText = 'font-weight: 500; color: var(--text-normal);';
				
				const orderEl = stateDiv.createSpan({ text: `(${state.order})`, cls: 'taskmaster-state-order' });
				orderEl.style.cssText = 'color: var(--text-muted); font-size: 12px;';
				
				// State actions
				const stateActions = stateDiv.createDiv('taskmaster-state-actions');
				stateActions.style.cssText = 'margin-left: auto; display: flex; gap: 4px;';
				
				const editStateBtn = stateActions.createEl('button', { text: 'Edit', cls: 'mod-small' });
				editStateBtn.style.cssText = 'padding: 2px 8px; font-size: 11px;';
				editStateBtn.onclick = async () => {
					await this.editState(groupId, index);
				};
				
				const deleteStateBtn = stateActions.createEl('button', { text: 'Delete', cls: 'mod-small mod-warning' });
				deleteStateBtn.style.cssText = 'padding: 2px 8px; font-size: 11px;';
				deleteStateBtn.onclick = async () => {
					try {
						await this.deleteState(groupId, index);
					} catch (error) {
						console.error('[TaskMaster] Error in deleteState:', error);
						new Notice('Error deleting state: ' + error.message);
					}
				};
			});
		});
	}

	async createNewStateGroup(groupName) {
		console.log('[TaskMaster] createNewStateGroup called with:', groupName);
		
		const groupId = groupName.toLowerCase().replace(/[^a-z0-9]/g, '-');
		
		// Check if group already exists
		if (this.plugin.settings.stateGroups[groupId]) {
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
		
		await this.plugin.saveSettings();
		this.display(); // Refresh the modal
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

	async addNewState(groupId, stateName) {
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
		return new Promise((resolve) => {
			const { Modal } = require('obsidian');
			
			class TextPromptModal extends Modal {
				constructor(app, message, defaultValue, resolve) {
					super(app);
					this.message = message;
					this.defaultValue = defaultValue;
					this.resolve = resolve;
					this.submitted = false;
				}
				
				onOpen() {
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
					cancelBtn.onclick = () => this.close();
					
					const okBtn = buttonDiv.createEl('button', { text: 'OK', cls: 'mod-cta' });
					okBtn.onclick = () => this.submit();
					
					this.inputEl.addEventListener('keydown', (e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							this.submit();
						} else if (e.key === 'Escape') {
							e.preventDefault();
							this.close();
						}
					});
					
					setTimeout(() => {
						this.inputEl.focus();
						this.inputEl.select();
					}, 10);
				}
				
				submit() {
					const value = this.inputEl.value.trim();
					this.submitted = true;
					this.close();
					this.resolve(value || null);
				}
				
				onClose() {
					if (!this.submitted) {
						this.resolve(null);
					}
				}
			}
			
			const modal = new TextPromptModal(this.app, message, defaultValue, resolve);
			modal.open();
		});
	}

	async confirmAction(title, message) {
		return new Promise((resolve) => {
			const { Modal } = require('obsidian');
			
			class ConfirmModal extends Modal {
				constructor(app, title, message, resolve) {
					super(app);
					this.title = title;
					this.message = message;
					this.resolve = resolve;
					this.resolved = false;
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
						this.resolved = true;
						this.close();
						this.resolve(false);
					};
					
					const deleteBtn = buttonDiv.createEl('button', { text: 'Delete', cls: 'mod-warning' });
					deleteBtn.onclick = () => {
						this.resolved = true;
						this.close();
						this.resolve(true);
					};
					
					setTimeout(() => cancelBtn.focus(), 10);
				}
				
				onClose() {
					if (!this.resolved) {
						this.resolve(false);
					}
				}
			}
			
			const modal = new ConfirmModal(this.app, title, message, resolve);
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
				this.logger.debug('Markdown post processor called for element:', el);
				this.logger.debug('Element tag:', el.tagName);
				this.logger.debug('Element content preview:', (el.textContent || '').substring(0, 200));
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

		// Debug command to test button processing
		this.addCommand({
			id: 'debug-test-button-processing',
			name: 'Debug: Test Button Processing',
			callback: () => {
				this.debugTestButtonProcessing();
			}
		});
	}

	debugTestButtonProcessing() {
		this.logger.log('=== DEBUG: Testing Button Processing ===');
		this.logger.log('Current settings:', this.settings);
		this.logger.log('Default state group:', this.settings.defaultStateGroup);
		this.logger.log('Available state groups:', Object.keys(this.settings.stateGroups));
		
		// Test the regex
		const testText = '{{multi-state-button:test-btn:todo}}';
		const regex = /\{\{multi-state-button:([^:]+):([^}]+)\}\}/g;
		const match = regex.exec(testText);
		this.logger.log('Regex test on "' + testText + '":', match);
		
		// Test processor directly
		const testDiv = document.createElement('div');
		testDiv.textContent = testText;
		this.logger.log('Test div created:', testDiv);
		
		this.multiStateProcessor.processInlineButtons(testDiv, { sourcePath: 'debug-test' });
		this.logger.log('Test div after processing:', testDiv);
		
		new Notice('Debug test complete - check console for details');
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
