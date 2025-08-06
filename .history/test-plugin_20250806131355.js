console.log('Starting plugin test...');

try {
	// Test basic require functionality
	console.log('✓ Testing basic file access...');
	const fs = require('fs');
	const path = require('path');
	
	// Check if main.js exists
	if (!fs.existsSync('./main.js')) {
		throw new Error('main.js not found');
	}
	console.log('✓ main.js file exists');
	
	// Check if processor exists
	if (!fs.existsSync('./src/processors/multi-state-button-processor.js')) {
		throw new Error('Processor file not found');
	}
	console.log('✓ Processor file exists');
	
	// Mock Obsidian API minimally
	global.require = function(module) {
		if (module === 'obsidian') {
			return {
				Plugin: class Plugin {
					constructor() {}
					async onload() {}
					onunload() {}
					async loadData() { return {}; }
					async saveData() {}
					addSettingTab() {}
					registerMarkdownCodeBlockProcessor() {}
					registerMarkdownPostProcessor() {}
					registerEvent() { return { unregister: () => {} }; }
					addCommand() {}
				},
				PluginSettingTab: class PluginSettingTab {},
				Setting: class Setting {},
				Notice: class Notice {},
				MarkdownRenderer: class MarkdownRenderer {},
				MarkdownView: class MarkdownView {}
			};
		}
		return originalRequire.apply(this, arguments);
	};
	
	const originalRequire = require;
	
	console.log('✓ Mock Obsidian API created');
	
	// Try to load the plugin
	console.log('Testing plugin load...');
	const TaskMasterPlugin = require('./main.js');
	console.log('✓ Plugin class loaded successfully');
	console.log('Plugin type:', typeof TaskMasterPlugin);
	
	// Try to instantiate
	const plugin = new TaskMasterPlugin();
	console.log('✓ Plugin instantiated successfully');
	
	console.log('\n🎉 All tests passed! Plugin should load correctly in Obsidian.');
	
} catch (error) {
	console.error('\n❌ Plugin test failed:');
	console.error('Error message:', error.message);
	console.error('Stack trace:');
	console.error(error.stack);
}
