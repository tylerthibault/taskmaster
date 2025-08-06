import { Command } from 'obsidian';
import TaskMasterPlugin from '../main';

export class CommandManager {
	private plugin: TaskMasterPlugin;

	constructor(plugin: TaskMasterPlugin) {
		this.plugin = plugin;
	}

	registerCommands(): void {
		// Command to create a multi-state button
		this.plugin.addCommand({
			id: 'create-multi-state-button',
			name: 'Create Multi-State Button',
			callback: () => {
				this.createMultiStateButton();
			}
		});

		// Command to insert time tracking
		this.plugin.addCommand({
			id: 'start-time-tracking',
			name: 'Start Time Tracking',
			callback: () => {
				this.startTimeTracking();
			}
		});

		// Command to open TaskMaster dashboard
		this.plugin.addCommand({
			id: 'open-dashboard',
			name: 'Open TaskMaster Dashboard',
			callback: () => {
				this.openDashboard();
			}
		});
	}

	private createMultiStateButton(): void {
		const activeView = this.plugin.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
		if (!activeView) {
			this.plugin.logger.warn('No active markdown view found');
			return;
		}

		const editor = activeView.editor;
		const cursor = editor.getCursor();
		
		// Generate unique button ID
		const buttonId = `btn-${Date.now()}`;
		const defaultGroup = this.plugin.settings.stateGroups[0];
		const defaultState = defaultGroup?.states[0]?.id || 'todo';
		
		// Insert the multi-state button syntax
		const buttonSyntax = `{{multi-state-button:${buttonId}:${defaultState}}}`;
		editor.replaceSelection(buttonSyntax);
		
		this.plugin.logger.log(`Created multi-state button with ID: ${buttonId}`);
	}

	private startTimeTracking(): void {
		// TODO: Implement time tracking functionality
		this.plugin.logger.log('Time tracking started');
	}

	private openDashboard(): void {
		// TODO: Implement dashboard functionality
		this.plugin.logger.log('Opening TaskMaster dashboard');
	}
}
