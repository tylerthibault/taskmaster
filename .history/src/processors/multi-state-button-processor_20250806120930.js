/**
 * Multi-State Button Processor
 * 
 * Handles the rendering and interaction of multi-state buttons in both
 * code blocks and inline markdown contexts. Provides the core functionality
 * for the TaskMaster plugin's state management system.
 */
class MultiStateButtonProcessor {
	constructor(app, settings, logger) {
		this.app = app;
		this.settings = settings;
		this.logger = logger;
		
		// Enhanced button syntax regex: {{multi-state-button:id=btn123;group=workflow;state=in_progress}}
		// Also supports legacy format: {{multi-state-button:button_id:current_state}}
		this.buttonRegex = /\{\{multi-state-button:([^}]+)\}\}/g;
		this.legacyButtonRegex = /\{\{multi-state-button:([^:]+):([^}]+)\}\}/g;
		
		this.logger.debug('MultiStateButtonProcessor initialized');
	}

	/**
	 * Process code block multi-state buttons
	 * @param {string} source - Source content of the code block
	 * @param {HTMLElement} el - Container element
	 * @param {any} ctx - Processing context
	 */
	processCodeBlock(source, el, ctx) {
		this.logger.methodEntry('MultiStateButtonProcessor', 'processCodeBlock', { source, ctx });
		
		try {
			const lines = source.split('\n');
			const container = el.createDiv('taskmaster-code-block-container');
			
			lines.forEach(line => {
				if (line.trim()) {
					const lineDiv = container.createDiv('taskmaster-code-block-line');
					this.processButtonsInText(line, lineDiv, ctx);
				}
			});
			
			this.logger.debug('Code block processed successfully');
		} catch (error) {
			this.logger.error('Error processing code block:', error);
			el.createEl('p', { text: 'Error rendering multi-state buttons' });
		}
	}

	/**
	 * Process inline multi-state buttons in post-processed markdown
	 * @param {HTMLElement} el - Container element
	 * @param {any} ctx - Processing context
	 */
	processInlineButtons(el, ctx) {
		this.logger.methodEntry('MultiStateButtonProcessor', 'processInlineButtons', { ctx });
		
		try {
			// Find all text nodes that contain button syntax
			const walker = document.createTreeWalker(
				el,
				NodeFilter.SHOW_TEXT,
				null,
				false
			);

			const textNodes = [];
			let node;
			while (node = walker.nextNode()) {
				if (this.buttonRegex.test(node.textContent)) {
					textNodes.push(node);
				}
			}

			// Process each text node containing buttons
			textNodes.forEach(textNode => {
				this.processTextNode(textNode, ctx);
			});
			
			this.logger.debug(`Processed ${textNodes.length} text nodes with buttons`);
		} catch (error) {
			this.logger.error('Error processing inline buttons:', error);
		}
	}

	/**
	 * Process buttons within a text string
	 * @param {string} text - Text containing button syntax
	 * @param {HTMLElement} container - Container to append buttons to
	 * @param {any} ctx - Processing context
	 */
	processButtonsInText(text, container, ctx) {
		let lastIndex = 0;
		let match;
		
		// Reset regex index
		this.buttonRegex.lastIndex = 0;
		
		while ((match = this.buttonRegex.exec(text)) !== null) {
			const [fullMatch, buttonParams] = match;
			const buttonConfig = this.parseButtonParams(buttonParams);
			
			if (!buttonConfig) {
				// Try legacy format
				this.legacyButtonRegex.lastIndex = 0;
				const legacyMatch = this.legacyButtonRegex.exec(fullMatch);
				if (legacyMatch) {
					const [, buttonId, currentState] = legacyMatch;
					buttonConfig = {
						id: buttonId,
						state: currentState,
						group: this.settings.defaultStateGroup
					};
				}
			}
			
			if (!buttonConfig) {
				this.logger.warn('Invalid button syntax:', fullMatch);
				continue;
			}
			
			// Add text before the button
			if (match.index > lastIndex) {
				const textBefore = text.substring(lastIndex, match.index);
				container.appendText(textBefore);
			}
			
			// Create the button
			this.createButton(container, buttonConfig.id, buttonConfig.state, buttonConfig.group, ctx);
			
			lastIndex = match.index + fullMatch.length;
		}
		
		// Add remaining text after the last button
		if (lastIndex < text.length) {
			const textAfter = text.substring(lastIndex);
			container.appendText(textAfter);
		}
	}

	/**
	 * Process a single text node containing button syntax
	 * @param {Text} textNode - Text node to process
	 * @param {any} ctx - Processing context
	 */
	processTextNode(textNode, ctx) {
		const text = textNode.textContent;
		const parent = textNode.parentNode;
		
		if (!parent) return;
		
		// Create a document fragment to hold the new content
		const fragment = document.createDocumentFragment();
		let lastIndex = 0;
		let match;
		
		// Reset regex index
		this.buttonRegex.lastIndex = 0;
		
		while ((match = this.buttonRegex.exec(text)) !== null) {
			const [fullMatch, buttonParams] = match;
			const buttonConfig = this.parseButtonParams(buttonParams);
			
			if (!buttonConfig) {
				// Try legacy format
				this.legacyButtonRegex.lastIndex = 0;
				const legacyMatch = this.legacyButtonRegex.exec(fullMatch);
				if (legacyMatch) {
					const [, buttonId, currentState] = legacyMatch;
					buttonConfig = {
						id: buttonId,
						state: currentState,
						group: this.settings.defaultStateGroup
					};
				}
			}
			
			if (!buttonConfig) {
				this.logger.warn('Invalid button syntax:', fullMatch);
				continue;
			}
			
			// Add text before the button
			if (match.index > lastIndex) {
				const textBefore = text.substring(lastIndex, match.index);
				fragment.appendChild(document.createTextNode(textBefore));
			}
			
			// Create a span container for the button
			const buttonContainer = document.createElement('span');
			buttonContainer.className = 'taskmaster-inline-button-container';
			this.createButton(buttonContainer, buttonConfig.id, buttonConfig.state, buttonConfig.group, ctx);
			fragment.appendChild(buttonContainer);
			
			lastIndex = match.index + fullMatch.length;
		}
		
		// Add remaining text after the last button
		if (lastIndex < text.length) {
			const textAfter = text.substring(lastIndex);
			fragment.appendChild(document.createTextNode(textAfter));
		}
		
		// Replace the original text node with the new content
		parent.replaceChild(fragment, textNode);
	}

	/**
	 * Parse button parameters from the new syntax
	 * @param {string} paramString - Parameter string (e.g., "id=btn123;group=workflow;state=in_progress")
	 * @returns {Object|null} Parsed parameters or null if invalid
	 */
	parseButtonParams(paramString) {
		try {
			const params = {};
			const parts = paramString.split(';');
			
			for (const part of parts) {
				const [key, value] = part.split('=');
				if (key && value) {
					params[key.trim()] = value.trim();
				}
			}
			
			// Validate required parameters
			if (!params.id || !params.state) {
				return null;
			}
			
			// Set default group if not specified
			if (!params.group) {
				params.group = this.settings.defaultStateGroup;
			}
			
			return params;
		} catch (error) {
			this.logger.error('Error parsing button parameters:', error);
			return null;
		}
	}

	/**
	 * Create a multi-state button element
	 * @param {HTMLElement} container - Container to append button to
	 * @param {string} buttonId - Unique button identifier
	 * @param {string} currentState - Current state of the button
	 * @param {string} groupId - State group ID to use
	 * @param {any} ctx - Processing context
	 */
	createButton(container, buttonId, currentState, groupId, ctx) {
		this.logger.debug(`Creating button: ${buttonId} with state: ${currentState} in group: ${groupId}`);
		
		// Get the appropriate state group
		const stateGroup = this.settings.getStateGroup(groupId || this.settings.defaultStateGroup);
		if (!stateGroup) {
			this.logger.error(`State group not found: ${groupId}`);
			container.appendText(`{{multi-state-button:id=${buttonId};group=${groupId};state=${currentState}}}`);
			return;
		}
		
		// Get the current state object
		let state = stateGroup.getState(currentState);
		if (!state) {
			// If state not found, use first state
			state = stateGroup.states[0];
			if (!state) {
				this.logger.error('No states found in state group');
				container.appendText(`{{multi-state-button:id=${buttonId};group=${groupId};state=${currentState}}}`);
				return;
			}
		}
		
		// Create button element
		const button = container.createEl('button', {
			cls: 'taskmaster-button',
			text: state.name
		});
		
		// Set button attributes
		button.setAttribute('data-button-id', buttonId);
		button.setAttribute('data-state', state.id);
		button.setAttribute('data-group', groupId);
		button.style.backgroundColor = state.color;
		button.style.color = this.getContrastColor(state.color);
		
		// Add click handler
		button.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			this.handleButtonClick(button, buttonId, state.id, groupId, stateGroup, ctx);
		});
	}

	/**
	 * Handle button click to cycle to next state
	 * @param {HTMLElement} button - Button element that was clicked
	 * @param {string} buttonId - Button identifier
	 * @param {string} currentStateId - Current state ID
	 * @param {string} groupId - State group ID
	 * @param {TaskStateGroup} stateGroup - State group containing the states
	 * @param {any} ctx - Processing context
	 */
	async handleButtonClick(button, buttonId, currentStateId, groupId, stateGroup, ctx) {
		this.logger.debug(`Button clicked: ${buttonId}, current state: ${currentStateId}, group: ${groupId}`);
		
		try {
			// Add animation class
			button.classList.add('changing');
			
			// Get next state
			const nextState = stateGroup.getNextState(currentStateId);
			if (!nextState) {
				this.logger.error('No next state found');
				return;
			}
			
			// Update button appearance
			button.textContent = nextState.name;
			button.setAttribute('data-state', nextState.id);
			button.style.backgroundColor = nextState.color;
			button.style.color = this.getContrastColor(nextState.color);
			
			// Update the source file
			await this.updateButtonInSource(buttonId, currentStateId, nextState.id, groupId, ctx);
			
			// Remove animation class after animation completes
			setTimeout(() => {
				button.classList.remove('changing');
			}, 300);
			
			this.logger.debug(`Button updated to state: ${nextState.id}`);
		} catch (error) {
			this.logger.error('Error handling button click:', error);
			// Remove animation class on error
			button.classList.remove('changing');
		}
	}

	/**
	 * Update button state in the source markdown file
	 * @param {string} buttonId - Button identifier
	 * @param {string} oldState - Previous state ID
	 * @param {string} newState - New state ID
	 * @param {string} groupId - State group ID
	 * @param {any} ctx - Processing context
	 */
	async updateButtonInSource(buttonId, oldState, newState, groupId, ctx) {
		if (!ctx.sourcePath) {
			this.logger.warn('No source path available for button update');
			return;
		}
		
		try {
			const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
			if (!file) {
				this.logger.error('Source file not found:', ctx.sourcePath);
				return;
			}
			
			const content = await this.app.vault.read(file);
			
			// Try new syntax first
			const newSyntaxOld = `{{multi-state-button:id=${buttonId};group=${groupId};state=${oldState}}}`;
			const newSyntaxNew = `{{multi-state-button:id=${buttonId};group=${groupId};state=${newState}}}`;
			
			let newContent = content.replace(newSyntaxOld, newSyntaxNew);
			
			// If new syntax didn't match, try legacy syntax
			if (newContent === content) {
				const legacySyntaxOld = `{{multi-state-button:${buttonId}:${oldState}}}`;
				const legacySyntaxNew = `{{multi-state-button:${buttonId}:${newState}}}`;
				newContent = content.replace(legacySyntaxOld, legacySyntaxNew);
			}
			
			// If still no change, try variations with different parameter orders
			if (newContent === content) {
				// Try different parameter orders for new syntax
				const variations = [
					`{{multi-state-button:group=${groupId};id=${buttonId};state=${oldState}}}`,
					`{{multi-state-button:state=${oldState};id=${buttonId};group=${groupId}}}`,
					`{{multi-state-button:state=${oldState};group=${groupId};id=${buttonId}}}`
				];
				
				for (const variation of variations) {
					if (content.includes(variation)) {
						const replacement = `{{multi-state-button:id=${buttonId};group=${groupId};state=${newState}}}`;
						newContent = content.replace(variation, replacement);
						break;
					}
				}
			}
			
			if (newContent !== content) {
				await this.app.vault.modify(file, newContent);
				this.logger.debug('Source file updated successfully');
			} else {
				this.logger.warn('Button syntax not found in source file for update');
			}
		} catch (error) {
			this.logger.error('Error updating source file:', error);
		}
	}

	/**
	 * Calculate contrast color for text on colored background
	 * @param {string} backgroundColor - Background color in hex format
	 * @returns {string} Either 'black' or 'white' for optimal contrast
	 */
	getContrastColor(backgroundColor) {
		// Remove # if present
		const hex = backgroundColor.replace('#', '');
		
		// Convert to RGB
		const r = parseInt(hex.substr(0, 2), 16);
		const g = parseInt(hex.substr(2, 2), 16);
		const b = parseInt(hex.substr(4, 2), 16);
		
		// Calculate luminance
		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
		
		// Return contrasting color
		return luminance > 0.5 ? 'black' : 'white';
	}

	/**
	 * Update settings reference
	 * @param {TaskMasterSettings} newSettings - Updated settings
	 */
	updateSettings(newSettings) {
		this.settings = newSettings;
		this.logger.debug('Settings updated in MultiStateButtonProcessor');
	}

	/**
	 * Cleanup resources
	 */
	cleanup() {
		this.logger.debug('MultiStateButtonProcessor cleanup complete');
	}
}

module.exports = { MultiStateButtonProcessor };