import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS } from './src/settings.js';
import { TaskMasterSettingTab } from './src/settings-tab.js';
import { MultiStateButtonProcessor } from './src/processors/multi-state-button.js';
import { Logger } from './src/utils/logger.js';
import { CommandManager } from './src/commands/command-manager.js';

export default class TaskMasterPlugin extends Plugin {
	constructor(app, manifest) {
		super(app, manifest);
		this.settings = {};
		this.logger = null;
		this.commandManager = null;
		this.multiStateProcessor = null;
	}

	async onload() {
		// Initialize logger first
		this.logger = new Logger(this);
		this.logger.log('TaskMaster plugin loading...');

		// Load settings
		await this.loadSettings();

		// Initialize components
		this.commandManager = new CommandManager(this);
		this.multiStateProcessor = new MultiStateButtonProcessor(this);

		// Register markdown processors
		this.registerMarkdownCodeBlockProcessor('multi-state-button', this.multiStateProcessor.processCodeBlock.bind(this.multiStateProcessor));
		this.registerMarkdownPostProcessor(this.multiStateProcessor.processInlineButtons.bind(this.multiStateProcessor));

		// Register commands
		this.commandManager.registerCommands();

		// Add settings tab
		this.addSettingTab(new TaskMasterSettingTab(this.app, this));

		this.logger.log('TaskMaster plugin loaded successfully');
	}

	onunload() {
		this.logger.log('TaskMaster plugin unloading...');
		// Cleanup if needed
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.logger.log('Settings saved');
	}
}
