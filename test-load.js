// Simple test to validate plugin loading
const fs = require('fs');
const path = require('path');

// Mock Obsidian API
const mockObsidian = {
	Plugin: class {
		constructor() {}
		async onload() {}
		onunload() {}
		async loadData() { return {}; }
		async saveData() {}
		addSettingTab() {}
		registerMarkdownCodeBlockProcessor() {}
		registerMarkdownPostProcessor() {}
		registerEvent() {}
		addCommand() {}
	},
	PluginSettingTab: class {},
	Setting: class {},
	Notice: class {},
	MarkdownRenderer: class {},
	MarkdownView: class {}
};

// Replace require
const originalRequire = require;
global.require = function(module) {
	if (module === 'obsidian') {
		return mockObsidian;
	}
	return originalRequire(module);
};

try {
	console.log('Testing plugin load...');
	const plugin = require('./main.js');
	console.log('✅ Plugin loads successfully');
	console.log('Plugin exports:', Object.keys(plugin));
} catch (error) {
	console.error('❌ Plugin failed to load:');
	console.error('Error:', error.message);
	console.error('Stack:', error.stack);
}
