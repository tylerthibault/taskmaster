import { MarkdownPostProcessorContext, MarkdownRenderChild } from 'obsidian';
import TaskMasterPlugin from '../main';
import { TaskState } from '../settings';

export class MultiStateButtonProcessor {
	private plugin: TaskMasterPlugin;

	constructor(plugin: TaskMasterPlugin) {
		this.plugin = plugin;
	}

	// Process code blocks like: ```multi-state-button
	processCodeBlock(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
		this.plugin.logger.debug('Processing multi-state button code block', source);
		
		const lines = source.trim().split('\n');
		const buttonConfig = this.parseButtonConfig(lines);
		
		if (buttonConfig) {
			this.createButton(el, buttonConfig, ctx);
		}
	}

	// Process inline buttons like: {{multi-state-button:button_id:status}}
	processInlineButtons(el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
		const buttonPattern = /\{\{multi-state-button:([^:]+):([^}]+)\}\}/g;
		
		this.walkTextNodes(el, (textNode) => {
			const text = textNode.textContent || '';
			const matches = Array.from(text.matchAll(buttonPattern));
			
			if (matches.length > 0) {
				const parent = textNode.parentNode;
				if (!parent) return;

				let lastIndex = 0;
				const fragment = document.createDocumentFragment();

				matches.forEach(match => {
					const [fullMatch, buttonId, currentState] = match;
					const startIndex = match.index!;

					// Add text before the match
					if (startIndex > lastIndex) {
						fragment.appendChild(document.createTextNode(text.slice(lastIndex, startIndex)));
					}

					// Create the button
					const buttonContainer = document.createElement('span');
					buttonContainer.addClass('taskmaster-inline-button');
					
					const buttonConfig = {
						id: buttonId,
						currentState: currentState,
						groupId: this.plugin.settings.defaultStateGroup
					};

					this.createButton(buttonContainer, buttonConfig, ctx);
					fragment.appendChild(buttonContainer);

					lastIndex = startIndex + fullMatch.length;
				});

				// Add remaining text
				if (lastIndex < text.length) {
					fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
				}

				parent.replaceChild(fragment, textNode);
			}
		});
	}

	private parseButtonConfig(lines: string[]): any {
		const config: any = {
			id: `btn-${Date.now()}`,
			currentState: 'todo',
			groupId: this.plugin.settings.defaultStateGroup
		};

		lines.forEach(line => {
			const [key, value] = line.split(':').map(s => s.trim());
			if (key && value) {
				config[key] = value;
			}
		});

		return config;
	}

	private createButton(container: HTMLElement, config: any, ctx: MarkdownPostProcessorContext): void {
		const stateGroup = this.plugin.settings.stateGroups.find(g => g.id === config.groupId);
		if (!stateGroup) {
			this.plugin.logger.warn(`State group not found: ${config.groupId}`);
			return;
		}

		const currentState = stateGroup.states.find(s => s.id === config.currentState);
		if (!currentState) {
			this.plugin.logger.warn(`State not found: ${config.currentState} in group ${config.groupId}`);
			return;
		}

		const button = container.createEl('button', {
			text: currentState.name,
			cls: 'taskmaster-state-button'
		});

		// Apply state styling
		button.style.backgroundColor = currentState.color;
		button.style.color = this.getContrastColor(currentState.color);
		button.style.border = 'none';
		button.style.borderRadius = '4px';
		button.style.padding = '4px 8px';
		button.style.cursor = 'pointer';
		button.style.fontSize = '0.9em';

		// Add click handler
		button.addEventListener('click', (e) => {
			e.preventDefault();
			this.cycleButtonState(button, config, stateGroup);
		});

		// Store button data for later reference
		button.setAttribute('data-button-id', config.id);
		button.setAttribute('data-current-state', config.currentState);
		button.setAttribute('data-group-id', config.groupId);

		this.plugin.logger.debug(`Created button for ${config.id} with state ${config.currentState}`);
	}

	private cycleButtonState(button: HTMLButtonElement, config: any, stateGroup: any): void {
		const currentStateIndex = stateGroup.states.findIndex((s: TaskState) => s.id === config.currentState);
		const nextStateIndex = (currentStateIndex + 1) % stateGroup.states.length;
		const nextState = stateGroup.states[nextStateIndex];

		// Update button appearance
		button.textContent = nextState.name;
		button.style.backgroundColor = nextState.color;
		button.style.color = this.getContrastColor(nextState.color);
		button.setAttribute('data-current-state', nextState.id);

		// Update the source text in the file
		this.updateButtonInSource(config.id, nextState.id);

		config.currentState = nextState.id;
		this.plugin.logger.debug(`Cycled button ${config.id} to state ${nextState.id}`);
	}

	private updateButtonInSource(buttonId: string, newState: string): void {
		const activeView = this.plugin.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
		if (!activeView) return;

		const editor = activeView.editor;
		const content = editor.getValue();
		const buttonPattern = new RegExp(`\\{\\{multi-state-button:${buttonId}:([^}]+)\\}\\}`, 'g');
		
		const updatedContent = content.replace(buttonPattern, `{{multi-state-button:${buttonId}:${newState}}}`);
		
		if (updatedContent !== content) {
			editor.setValue(updatedContent);
			this.plugin.logger.debug(`Updated button ${buttonId} in source to state ${newState}`);
		}
	}

	private getContrastColor(hexColor: string): string {
		// Remove # if present
		const hex = hexColor.replace('#', '');
		
		// Convert to RGB
		const r = parseInt(hex.substr(0, 2), 16);
		const g = parseInt(hex.substr(2, 2), 16);
		const b = parseInt(hex.substr(4, 2), 16);
		
		// Calculate luminance
		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
		
		return luminance > 0.5 ? '#000000' : '#ffffff';
	}

	private walkTextNodes(node: Node, callback: (textNode: Text) => void): void {
		if (node.nodeType === Node.TEXT_NODE) {
			callback(node as Text);
		} else {
			for (let i = 0; i < node.childNodes.length; i++) {
				this.walkTextNodes(node.childNodes[i], callback);
			}
		}
	}
}
