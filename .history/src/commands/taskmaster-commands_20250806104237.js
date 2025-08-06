import { Notice } from 'obsidian';

/**
 * TaskMaster Commands
 * 
 * Provides command palette integration for TaskMaster functionality.
 * Allows users to quickly insert buttons and access plugin features.
 */
export class TaskMasterCommands {
	constructor(app, settings, logger) {
		this.app = app;
		this.settings = settings;
		this.logger = logger;
		
		this.logger.debug('TaskMasterCommands initialized');
	}

	/**
	 * Register all plugin commands
	 * @param {Plugin} plugin - Plugin instance to register commands on
	 */
	registerCommands(plugin) {
		this.logger.debug('Registering TaskMaster commands');

		// Command: Create Multi-State Button
		plugin.addCommand({
			id: 'create-multi-state-button',
			name: 'Create Multi-State Button',
			editorCallback: (editor, view) => {
				this.createMultiStateButton(editor, view);
			}
		});

		// Command: Insert Task Template
		plugin.addCommand({
			id: 'insert-task-template',
			name: 'Insert Task Template',
			editorCallback: (editor, view) => {
				this.insertTaskTemplate(editor, view);
			}
		});

		// Command: Show TaskMaster Dashboard
		plugin.addCommand({
			id: 'show-dashboard',
			name: 'Show TaskMaster Dashboard',
			callback: () => {
				this.showDashboard();
			}
		});

		this.logger.debug('TaskMaster commands registered successfully');
	}

	/**
	 * Create a new multi-state button at cursor position
	 * @param {Editor} editor - Obsidian editor instance
	 * @param {MarkdownView} view - Current markdown view
	 */
	createMultiStateButton(editor, view) {
		this.logger.methodEntry('TaskMasterCommands', 'createMultiStateButton');
		
		try {
			// Generate unique button ID
			const buttonId = this.generateButtonId();
			
			// Get default state group
			const defaultGroup = this.settings.getStateGroup(this.settings.defaultStateGroup);
			if (!defaultGroup || defaultGroup.states.length === 0) {
				this.logger.error('No default state group or states available');
				return;
			}
			
			// Use first state as initial state
			const initialState = defaultGroup.states[0];
			
			// Create button syntax
			const buttonSyntax = `{{multi-state-button:${buttonId}:${initialState.id}}}`;
			
			// Insert at cursor position
			const cursor = editor.getCursor();
			editor.replaceRange(buttonSyntax, cursor);
			
			// Move cursor after the button
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

	/**
	 * Insert a task template with multiple buttons
	 * @param {Editor} editor - Obsidian editor instance
	 * @param {MarkdownView} view - Current markdown view
	 */
	insertTaskTemplate(editor, view) {
		this.logger.methodEntry('TaskMasterCommands', 'insertTaskTemplate');
		
		try {
			const defaultGroup = this.settings.getStateGroup(this.settings.defaultStateGroup);
			if (!defaultGroup || defaultGroup.states.length === 0) {
				this.logger.error('No default state group available');
				return;
			}
			
			const initialState = defaultGroup.states[0];
			const buttonId = this.generateButtonId();
			
			// Create task template
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
			
			// Insert template at cursor
			const cursor = editor.getCursor();
			editor.replaceRange(template, cursor);
			
			this.logger.debug(`Task template inserted with button: ${buttonId}`);
		} catch (error) {
			this.logger.error('Error inserting task template:', error);
		}
	}

	/**
	 * Show the TaskMaster dashboard (placeholder for future implementation)
	 */
	showDashboard() {
		this.logger.methodEntry('TaskMasterCommands', 'showDashboard');
		
		// TODO: Implement dashboard view
		// For now, show a notice
		new Notice('TaskMaster Dashboard coming soon!');
		
		this.logger.debug('Dashboard command executed (placeholder)');
	}

	/**
	 * Generate a unique button ID
	 * @returns {string} Unique button identifier
	 */
	generateButtonId() {
		const timestamp = Date.now();
		const random = Math.floor(Math.random() * 1000);
		return `btn_${timestamp}_${random}`;
	}

	/**
	 * Cleanup command resources
	 */
	cleanup() {
		this.logger.debug('TaskMasterCommands cleanup complete');
	}
}
