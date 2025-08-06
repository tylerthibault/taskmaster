/**
 * TaskMaster Plugin - Advanced task management for Obsidian
 * Standalone JavaScript version (no build required)
 */

const { Plugin, PluginSettingTab, Setting, Notice, MarkdownRenderer, MarkdownView } = require('obsidian');

// Default settings
const DEFAULT_SETTINGS = {
	debugMode: false,
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

	setDebugMode(enabled) {
		this.debugMode = enabled;
	}

	log(...args) {
		console.log(this.prefix, ...args);
	}

	warn(...args) {
		console.warn(this.prefix, ...args);
	}

	error(...args) {
		console.error(this.prefix, ...args);
	}

	debug(...args) {
		if (this.debugMode) {
			console.log(this.prefix, '[DEBUG]', ...args);
		}
	}
}

// Live Preview Handler for Edit Mode
class LivePreviewHandler {
	constructor(plugin, processor, logger) {
		this.plugin = plugin;
		this.processor = processor;
		this.logger = logger;
		this.registeredEditorExtensions = [];
	}

	/**
	 * Register editor extension for live preview
	 */
	registerLivePreview() {
		this.logger.debug('Registering live preview handler...');
		
		// Use alternative method using workspace events
		this.registerAlternativeLivePreview();
	}

	/**
	 * Alternative method using workspace events
	 */
	registerAlternativeLivePreview() {
		this.logger.debug('Using alternative live preview method');
		
		// Listen for editor changes
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('editor-change', (editor, info) => {
				this.onEditorChange(editor, info);
			})
		);

		// Listen for layout changes
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('layout-change', () => {
				this.processVisibleEditors();
			})
		);

		// Listen for active leaf changes
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('active-leaf-change', (leaf) => {
				if (leaf && leaf.view && leaf.view.getViewType() === 'markdown') {
					setTimeout(() => this.processActiveEditor(), 100);
				}
			})
		);
	}

	/**
	 * Handle editor changes
	 */
	onEditorChange(editor, info) {
		if (!editor || !info) return;
		
		// Debounce processing to avoid excessive calls
		clearTimeout(this.processTimeout);
		this.processTimeout = setTimeout(() => {
			this.processEditorContent(editor);
		}, 500);
	}

	/**
	 * Process content in the active editor
	 */
	processActiveEditor() {
		const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView && activeView.editor) {
			this.processEditorContent(activeView.editor);
		}
	}

	/**
	 * Process all visible editors
	 */
	processVisibleEditors() {
		const markdownLeaves = this.plugin.app.workspace.getLeavesOfType('markdown');
		markdownLeaves.forEach(leaf => {
			if (leaf.view && leaf.view.editor) {
				this.processEditorContent(leaf.view.editor);
			}
		});
	}

	/**
	 * Process editor content for button rendering
	 */
	processEditorContent(editor) {
		try {
			if (!editor.getDoc) return;
			
			const doc = editor.getDoc();
			const content = doc.getValue();
			
			// Check if content contains button syntax
			if (!content.includes('{{multi-state-button:')) {
				return;
			}

			this.logger.debug('Processing editor content for live preview');
			
			// Get the container element for the editor
			const editorContainer = editor.containerEl || editor.getScrollerElement();
			if (editorContainer) {
				// Process the container for buttons
				const ctx = {
					sourcePath: this.plugin.app.workspace.getActiveFile()?.path
				};
				
				// Find elements that need processing
				setTimeout(() => {
					this.processor.processInlineButtons(editorContainer, ctx);
				}, 100);
			}
		} catch (error) {
			this.logger.error('Error processing editor content:', error);
		}
	}

	/**
	 * Schedule reprocessing with debouncing
	 */
	scheduleReprocess() {
		clearTimeout(this.reprocessTimeout);
		this.reprocessTimeout = setTimeout(() => {
			this.processActiveEditor();
		}, 300);
	}

	/**
	 * Cleanup
	 */
	cleanup() {
		clearTimeout(this.processTimeout);
		clearTimeout(this.reprocessTimeout);
		this.logger.debug('LivePreviewHandler cleanup complete');
	}
}

// Task State classes
class TaskState {
	constructor(id, name, color, order) {
		this.id = id;
		this.name = name;
		this.color = color;
		this.order = order;
	}
}

class TaskStateGroup {
	constructor(id, name, states = []) {
		this.id = id;
		this.name = name;
		this.states = states;
	}

	getNextState(currentStateId) {
		const currentIndex = this.states.findIndex(state => state.id === currentStateId);
		if (currentIndex === -1) return this.states[0] || null;
		
		const nextIndex = (currentIndex + 1) % this.states.length;
		return this.states[nextIndex];
	}

	getState(stateId) {
		return this.states.find(state => state.id === stateId) || null;
	}
}

// Multi-State Button Processor
const { MultiStateButtonProcessor } = require('./src/processors/multi-state-button-processor.js');

// Commands
class TaskMasterCommands {
	constructor(app, settings, logger) {
		this.app = app;
		this.settings = settings;
		this.logger = logger;
	}

	registerCommands(plugin) {
		plugin.addCommand({
			id: 'create-multi-state-button',
			name: 'Create Multi-State Button',
			editorCallback: (editor, view) => {
				this.createMultiStateButton(editor, view);
			}
		});

		plugin.addCommand({
			id: 'insert-task-template',
			name: 'Insert Task Template',
			editorCallback: (editor, view) => {
				this.insertTaskTemplate(editor, view);
			}
		});
	}

	createMultiStateButton(editor, view) {
		try {
			const buttonId = this.generateButtonId();
			const stateGroupData = this.settings.stateGroups[this.settings.defaultStateGroup];
			
			if (!stateGroupData || !stateGroupData.states.length) {
				this.logger.error('No default state group or states available');
				return;
			}
			
			const initialState = stateGroupData.states[0];
			const buttonSyntax = `{{multi-state-button:${buttonId}:${initialState.id}}}`;
			
			const cursor = editor.getCursor();
			editor.replaceRange(buttonSyntax, cursor);
			
			const newCursor = {
				line: cursor.line,
				ch: cursor.ch + buttonSyntax.length
			};
			editor.setCursor(newCursor);
			
			this.logger.debug(`Multi-state button created: ${buttonId}`);
		} catch (error) {
			this.logger.error('Error creating multi-state button:', error);
		}
	}

	insertTaskTemplate(editor, view) {
		try {
			const stateGroupData = this.settings.stateGroups[this.settings.defaultStateGroup];
			if (!stateGroupData || !stateGroupData.states.length) {
				this.logger.error('No default state group available');
				return;
			}
			
			const initialState = stateGroupData.states[0];
			const buttonId = this.generateButtonId();
			
			const template = `## Task: [Task Name]

**Status**: {{multi-state-button:${buttonId}:${initialState.id}}}
**Assigned**: 
**Due Date**: 
**Priority**: 

### Description
[Task description here]

### Subtasks
- [ ] Subtask 1
- [ ] Subtask 2
- [ ] Subtask 3

### Notes
[Additional notes and updates]

---
`;
			
			const cursor = editor.getCursor();
			editor.replaceRange(template, cursor);
		} catch (error) {
			this.logger.error('Error inserting task template:', error);
		}
	}

	generateButtonId() {
		const timestamp = Date.now();
		const random = Math.floor(Math.random() * 1000);
		return `btn_${timestamp}_${random}`;
	}

	cleanup() {
		this.logger.debug('TaskMasterCommands cleanup complete');
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

		// State Groups Section
		containerEl.createEl('h3', { text: 'State Groups' });
		const stateGroupsContainer = containerEl.createDiv('taskmaster-state-groups-container');
		this.refreshStateGroupsList(stateGroupsContainer);
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
		await this.loadSettings();
		
		this.logger = new Logger(this.settings.debugMode);
		this.logger.log('TaskMaster plugin loading...');

		this.multiStateProcessor = new MultiStateButtonProcessor(this.app, this.settings, this.logger);
		this.commands = new TaskMasterCommands(this.app, this.settings, this.logger);
		this.livePreviewHandler = new LivePreviewHandler(this, this.multiStateProcessor, this.logger);

		this.registerMarkdownCodeBlockProcessor('multi-state-button', (source, el, ctx) => {
			this.multiStateProcessor.processCodeBlock(source, el, ctx);
		});

		this.registerMarkdownPostProcessor((el, ctx) => {
			this.multiStateProcessor.processInlineButtons(el, ctx);
		});

		// Register live preview support for edit mode
		this.livePreviewHandler.registerLivePreview();

		this.commands.registerCommands(this);
		this.addSettingTab(new TaskMasterSettingTab(this.app, this));
		this.addStyles();

		this.logger.log('TaskMaster plugin loaded successfully');
	}

	onunload() {
		this.logger?.log('TaskMaster plugin unloading...');
		this.livePreviewHandler?.cleanup();
		this.multiStateProcessor?.cleanup();
		this.commands?.cleanup();
		this.logger?.log('TaskMaster plugin unloaded successfully');
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
		
		if (this.logger) {
			this.logger.setDebugMode(this.settings.debugMode);
		}
		
		if (this.multiStateProcessor) {
			this.multiStateProcessor.updateSettings(this.settings);
		}
		
		this.logger?.log('Settings saved and components updated');
	}

	addStyles() {
		const style = document.createElement('style');
		style.id = 'taskmaster-styles';
		style.textContent = `
			.taskmaster-button {
				display: inline-block;
				padding: 4px 12px;
				margin: 2px;
				border: 1px solid var(--background-modifier-border);
				border-radius: 6px;
				cursor: pointer;
				font-size: 0.85em;
				font-weight: 500;
				text-align: center;
				min-width: 70px;
				transition: all 0.2s ease;
				user-select: none;
				line-height: 1.2;
				white-space: nowrap;
			}

			.taskmaster-button:hover {
				opacity: 0.85;
				transform: translateY(-1px);
				box-shadow: 0 2px 8px rgba(0,0,0,0.15);
			}

			.taskmaster-button:active {
				transform: translateY(0);
				box-shadow: 0 1px 3px rgba(0,0,0,0.1);
			}

			.taskmaster-button[data-state="todo"] {
				background-color: #e74c3c;
				color: white;
				border-color: #c0392b;
			}

			.taskmaster-button[data-state="in-progress"] {
				background-color: #f39c12;
				color: white;
				border-color: #d68910;
			}

			.taskmaster-button[data-state="done"] {
				background-color: #27ae60;
				color: white;
				border-color: #229954;
			}

			table .taskmaster-button {
				margin: 1px;
				font-size: 0.8em;
				padding: 2px 8px;
				min-width: 60px;
			}

			.taskmaster-code-block-container {
				padding: 10px;
				background: var(--background-secondary);
				border-radius: 4px;
				margin: 10px 0;
			}

			.taskmaster-code-block-line {
				margin: 5px 0;
				display: flex;
				align-items: center;
				flex-wrap: wrap;
				gap: 8px;
			}

			.taskmaster-state-groups-container {
				margin: 20px 0;
			}

			.taskmaster-state-group {
				border: 1px solid var(--background-modifier-border);
				border-radius: 8px;
				padding: 15px;
				margin: 10px 0;
				background: var(--background-secondary);
			}

			.taskmaster-state-group-header h4 {
				margin: 0 0 10px 0;
				color: var(--text-normal);
			}

			.taskmaster-states-list {
				display: flex;
				flex-wrap: wrap;
				gap: 8px;
			}

			.taskmaster-state-item {
				display: flex;
				align-items: center;
				gap: 6px;
				padding: 6px 10px;
				background: var(--background-primary);
				border: 1px solid var(--background-modifier-border);
				border-radius: 4px;
			}

			.taskmaster-state-color {
				width: 12px;
				height: 12px;
				border-radius: 2px;
				border: 1px solid var(--background-modifier-border);
			}

			.taskmaster-state-name {
				font-weight: 500;
				color: var(--text-normal);
			}

			.taskmaster-state-order {
				font-size: 0.8em;
				color: var(--text-muted);
			}
		`;
		document.head.appendChild(style);
	}
}

module.exports = TaskMasterPlugin;
