/**
 * TaskMaster Plugin - Progressive version with external processor
 */

const { Plugin, PluginSettingTab, Setting, Notice } = require('obsidian');

// Import the processor
const { MultiStateButtonProcessor } = require('./src/processors/multi-state-button-processor.js');

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
			console.log('[TaskMaster] External processor created');

			// Register processors
			this.registerMarkdownCodeBlockProcessor('multi-state-button', (source, el, ctx) => {
				this.multiStateProcessor.processCodeBlock(source, el, ctx);
			});
			console.log('[TaskMaster] Code block processor registered');

			this.registerMarkdownPostProcessor((el, ctx) => {
				this.multiStateProcessor.processInlineButtons(el, ctx);
			});
			console.log('[TaskMaster] Post processor registered');

			this.addSettingTab(new TaskMasterSettingTab(this.app, this));
			console.log('[TaskMaster] Settings tab added');

			this.logger.log('TaskMaster progressive plugin loaded successfully!');
			console.log('[TaskMaster] PROGRESSIVE VERSION - Load complete!');
			
			// Show success notice
			new Notice('TaskMaster progressive version loaded!');
			
		} catch (error) {
			console.error('[TaskMaster] FATAL ERROR during load:', error);
			console.error('[TaskMaster] Stack trace:', error.stack);
			new Notice('TaskMaster failed to load - check console for details');
			throw error;
		}
	}

	onunload() {
		console.log('[TaskMaster] PROGRESSIVE VERSION - Unloading...');
		this.multiStateProcessor?.cleanup();
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
