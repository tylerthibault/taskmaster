const { Plugin } = require('obsidian');
const { DEFAULT_SETTINGS } = require('./src/settings.js');
const { TaskMasterSettingTab } = require('./src/settings-tab.js');
const { MultiStateButtonProcessor } = require('./src/processors/multi-state-button.js');
const { Logger } = require('./src/utils/logger.js');
const { CommandManager } = require('./src/commands/command-manager.js');

class TaskMasterPlugin extends Plugin {
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

module.exports = TaskMasterPlugin;
