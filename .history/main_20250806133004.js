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
		const groupsContainer = containerEl.createDiv('taskmaster-state-groups-container');
		this.refreshStateGroupsList(groupsContainer);
	}

	refreshStateGroupsList(container) {
		container.empty();
		
		Object.entries(this.plugin.settings.stateGroups).forEach(([groupId, groupData]) => {
			const groupDiv = container.createDiv('taskmaster-state-group');
			
			const headerDiv = groupDiv.createDiv('taskmaster-state-group-header');
			headerDiv.createEl('h4', { text: groupData.name });
			
			const statesDiv = groupDiv.createDiv('taskmaster-states-list');
			groupData.states.forEach(state => {
				const stateDiv = statesDiv.createDiv('taskmaster-state-item');
				
				const colorIndicator = stateDiv.createDiv('taskmaster-state-color');
				colorIndicator.style.backgroundColor = state.color;
				
				stateDiv.createSpan({ text: state.name, cls: 'taskmaster-state-name' });
				stateDiv.createSpan({ text: `(${state.order})`, cls: 'taskmaster-state-order' });
			});
		});
	}
}

// Main Plugin Class
class TaskMasterPlugin extends Plugin {
	async onload() {
		console.log('[TaskMaster] PROGRESSIVE VERSION - Starting load...');
		
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

			this.addSettingTab(new TaskMasterSettingTab(this.app, this));
			console.log('[TaskMaster] Settings tab added');

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
		await this.saveData(this.settings);
		
		// Update logger debug mode
		if (this.logger) {
			this.logger.setDebugMode(this.settings.debugMode);
		}
		
		// Notify processors of settings changes
		if (this.multiStateProcessor) {
			this.multiStateProcessor.updateSettings(this.settings);
		}
	}
}

module.exports = TaskMasterPlugin;
