class Logger {
	constructor(plugin) {
		this.plugin = plugin;
	}

	log(message, ...args) {
		if (this.plugin.settings?.debugMode) {
			console.log(`[TaskMaster] ${message}`, ...args);
		}
	}

	warn(message, ...args) {
		if (this.plugin.settings?.debugMode) {
			console.warn(`[TaskMaster] ${message}`, ...args);
		}
	}

	error(message, error, ...args) {
		if (this.plugin.settings?.debugMode) {
			console.error(`[TaskMaster] ${message}`, error, ...args);
		}
	}

	debug(message, ...args) {
		if (this.plugin.settings?.debugMode) {
			console.debug(`[TaskMaster] ${message}`, ...args);
		}
	}
}

module.exports = { Logger };
