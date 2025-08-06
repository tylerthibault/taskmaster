import TaskMasterPlugin from '../main';

export class Logger {
	private plugin: TaskMasterPlugin;

	constructor(plugin: TaskMasterPlugin) {
		this.plugin = plugin;
	}

	log(message: string, ...args: any[]) {
		if (this.plugin.settings?.debugMode) {
			console.log(`[TaskMaster] ${message}`, ...args);
		}
	}

	warn(message: string, ...args: any[]) {
		if (this.plugin.settings?.debugMode) {
			console.warn(`[TaskMaster] ${message}`, ...args);
		}
	}

	error(message: string, error?: Error, ...args: any[]) {
		if (this.plugin.settings?.debugMode) {
			console.error(`[TaskMaster] ${message}`, error, ...args);
		}
	}

	debug(message: string, ...args: any[]) {
		if (this.plugin.settings?.debugMode) {
			console.debug(`[TaskMaster] ${message}`, ...args);
		}
	}
}
