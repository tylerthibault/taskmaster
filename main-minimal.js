/**
 * TaskMaster Plugin - Minimal test version
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
	defaultStateGroup: 'default'
};

// Simple logger
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
	}
}

// Main Plugin Class
class TaskMasterPlugin extends Plugin {
	async onload() {
		console.log('[TaskMaster] MINIMAL VERSION - Starting load...');
		
		try {
			await this.loadSettings();
			console.log('[TaskMaster] Settings loaded');
			
			this.logger = new Logger(this.settings.debugMode);
			this.logger.log('TaskMaster minimal plugin loading...');

			// Simple processor registration
			this.registerMarkdownPostProcessor((el, ctx) => {
				this.processButtons(el, ctx);
			});
			console.log('[TaskMaster] Post processor registered');

			this.addSettingTab(new TaskMasterSettingTab(this.app, this));
			console.log('[TaskMaster] Settings tab added');

			this.logger.log('TaskMaster minimal plugin loaded successfully!');
			console.log('[TaskMaster] MINIMAL VERSION - Load complete!');
			
			// Show success notice
			new Notice('TaskMaster plugin loaded successfully!');
			
		} catch (error) {
			console.error('[TaskMaster] FATAL ERROR during load:', error);
			console.error('[TaskMaster] Stack trace:', error.stack);
			new Notice('TaskMaster failed to load - check console for details');
			throw error;
		}
	}

	processButtons(el, ctx) {
		// Simple button processing
		const regex = /\{\{multi-state-button:([^:]+):([^}]+)\}\}/g;
		
		const walker = document.createTreeWalker(
			el,
			NodeFilter.SHOW_TEXT,
			null,
			false
		);

		const textNodes = [];
		let node;
		while (node = walker.nextNode()) {
			if (regex.test(node.textContent)) {
				textNodes.push(node);
			}
		}

		textNodes.forEach(textNode => {
			const text = textNode.textContent;
			const parent = textNode.parentNode;
			
			if (!parent) return;
			
			const fragment = document.createDocumentFragment();
			let lastIndex = 0;
			let match;
			
			regex.lastIndex = 0;
			
			while ((match = regex.exec(text)) !== null) {
				const [fullMatch, buttonId, currentState] = match;
				
				if (match.index > lastIndex) {
					const textBefore = text.substring(lastIndex, match.index);
					fragment.appendChild(document.createTextNode(textBefore));
				}
				
				// Create simple button
				const button = document.createElement('button');
				button.textContent = currentState;
				button.style.cssText = 'padding: 4px 8px; margin: 2px; border: 1px solid #ccc; border-radius: 4px; background: #f0f0f0; cursor: pointer;';
				button.onclick = () => {
					console.log('[TaskMaster] Button clicked:', buttonId, currentState);
					new Notice(`Button ${buttonId} clicked!`);
				};
				
				fragment.appendChild(button);
				
				lastIndex = match.index + fullMatch.length;
			}
			
			if (lastIndex < text.length) {
				const textAfter = text.substring(lastIndex);
				fragment.appendChild(document.createTextNode(textAfter));
			}
			
			parent.replaceChild(fragment, textNode);
		});
	}

	onunload() {
		console.log('[TaskMaster] MINIMAL VERSION - Unloading...');
		this.logger?.log('TaskMaster minimal plugin unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

module.exports = TaskMasterPlugin;
