import { MarkdownView } from 'obsidian';

class MultiStateButtonProcessor {
	constructor(plugin) {
		this.plugin = plugin;
	}

	// Process code blocks like: ```multi-state-button
	processCodeBlock(source, el, ctx) {
		this.plugin.logger.debug('Processing multi-state button code block', source);
		
		const lines = source.trim().split('\n');
		const buttonConfig = this.parseButtonConfig(lines);
		
		if (buttonConfig) {
			this.createButton(el, buttonConfig, ctx);
		}
	}

	// Process inline buttons like: {{multi-state-button:button_id:status}}
	processInlineButtons(el, ctx) {
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
					const startIndex = match.index;

					// Add text before the match
					if (startIndex > lastIndex) {
						fragment.appendChild(document.createTextNode(text.slice(lastIndex, startIndex)));
					}

					// Create the button
					const buttonContainer = document.createElement('span');
					buttonContainer.className = 'taskmaster-inline-button';
					
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

	parseButtonConfig(lines) {
		const config = {
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

	createButton(container, config, ctx) {
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

		const button = document.createElement('button');
		button.textContent = currentState.name;
		button.className = 'taskmaster-state-button';

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

		container.appendChild(button);

		this.plugin.logger.debug(`Created button for ${config.id} with state ${config.currentState}`);
	}

	cycleButtonState(button, config, stateGroup) {
		const currentStateIndex = stateGroup.states.findIndex(s => s.id === config.currentState);
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

	updateButtonInSource(buttonId, newState) {
		const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
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

	getContrastColor(hexColor) {
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

	walkTextNodes(node, callback) {
		if (node.nodeType === Node.TEXT_NODE) {
			callback(node);
		} else {
			for (let i = 0; i < node.childNodes.length; i++) {
				this.walkTextNodes(node.childNodes[i], callback);
			}
		}
	}
}

module.exports = { MultiStateButtonProcessor };
