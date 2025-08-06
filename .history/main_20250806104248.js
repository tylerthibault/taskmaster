import { Plugin } from 'obsidian';
import { TaskMasterSettingTab } from './src/settings-tab.js';
import { TaskMasterSettings, DEFAULT_SETTINGS } from './src/settings.js';
import { Logger } from './src/utils/logger.js';
import { MultiStateButtonProcessor } from './src/processors/multi-state-button-processor.js';
import { TaskMasterCommands } from './src/commands/taskmaster-commands.js';

/**
 * TaskMaster Plugin - Advanced task management for Obsidian
 * 
 * Features:
 * - Multi-state task toggles with customizable states
 * - People assignment and management
 * - Time tracking integration
 * - Project visualization and reporting
 */
export default class TaskMasterPlugin extends Plugin {
	constructor(app, manifest) {
		super(app, manifest);
		this.settings = null;
		this.logger = null;
		this.multiStateProcessor = null;
		this.commands = null;
	}

	async onload() {
		// Initialize settings
		await this.loadSettings();
		
		// Initialize logger
		this.logger = new Logger(this.settings.debugMode);
		this.logger.log('TaskMaster plugin loading...');

		// Initialize processors
		this.multiStateProcessor = new MultiStateButtonProcessor(this.app, this.settings, this.logger);
		
		// Initialize commands
		this.commands = new TaskMasterCommands(this.app, this.settings, this.logger);

		// Register markdown processors
		this.registerMarkdownCodeBlockProcessor('multi-state-button', (source, el, ctx) => {
			this.multiStateProcessor.processCodeBlock(source, el, ctx);
		});

		this.registerMarkdownPostProcessor((el, ctx) => {
			this.multiStateProcessor.processInlineButtons(el, ctx);
		});

		// Register commands
		this.commands.registerCommands(this);

		// Add settings tab
		this.addSettingTab(new TaskMasterSettingTab(this.app, this));

		// Add plugin styles
		this.addStyles();

		this.logger.log('TaskMaster plugin loaded successfully');
	}

	onunload() {
		this.logger?.log('TaskMaster plugin unloading...');
		
		// Clean up processors
		this.multiStateProcessor?.cleanup();
		
		// Clean up commands
		this.commands?.cleanup();
		
		this.logger?.log('TaskMaster plugin unloaded successfully');
	}

	async loadSettings() {
		const loadedData = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
		
		// Ensure we have proper default state group if none exists
		if (!this.settings.stateGroups || Object.keys(this.settings.stateGroups).length === 0) {
			this.settings.stateGroups = DEFAULT_SETTINGS.stateGroups;
		}
		
		// Ensure people object exists
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
		
		this.logger?.log('Settings saved and components updated');
	}

	addStyles() {
		// Add custom CSS styles for the plugin
		const style = document.createElement('style');
		style.id = 'taskmaster-styles';
		style.textContent = `
			/* Multi-state button styles */
			.taskmaster-button {
				display: inline-block;
				padding: 2px 8px;
				margin: 1px;
				border: 1px solid var(--background-modifier-border);
				border-radius: 4px;
				cursor: pointer;
				font-size: 0.9em;
				font-weight: 500;
				text-align: center;
				min-width: 60px;
				transition: all 0.2s ease;
				user-select: none;
			}

			.taskmaster-button:hover {
				opacity: 0.8;
				transform: translateY(-1px);
				box-shadow: 0 2px 4px rgba(0,0,0,0.1);
			}

			.taskmaster-button:active {
				transform: translateY(0);
				box-shadow: none;
			}

			/* Default state colors */
			.taskmaster-button[data-state="todo"] {
				background-color: #e74c3c;
				color: white;
			}

			.taskmaster-button[data-state="in-progress"] {
				background-color: #f39c12;
				color: white;
			}

			.taskmaster-button[data-state="done"] {
				background-color: #27ae60;
				color: white;
			}

			/* Table compatibility */
			table .taskmaster-button {
				margin: 0;
				max-width: 100%;
			}
		`;
		document.head.appendChild(style);
	}
}
