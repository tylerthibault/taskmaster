/**
 * Centralized logging utility for TaskMaster plugin
 * 
 * Provides consistent logging across the plugin with configurable debug mode.
 * All log messages are prefixed with [TaskMaster] for easy identification.
 */
export class Logger {
	constructor(debugMode = false) {
		this.debugMode = debugMode;
		this.prefix = '[TaskMaster]';
	}

	/**
	 * Set debug mode on/off
	 * @param {boolean} enabled - Whether debug mode is enabled
	 */
	setDebugMode(enabled) {
		this.debugMode = enabled;
	}

	/**
	 * Log a general message
	 * @param {...any} args - Arguments to log
	 */
	log(...args) {
		console.log(this.prefix, ...args);
	}

	/**
	 * Log a warning message
	 * @param {...any} args - Arguments to log
	 */
	warn(...args) {
		console.warn(this.prefix, ...args);
	}

	/**
	 * Log an error message
	 * @param {...any} args - Arguments to log
	 */
	error(...args) {
		console.error(this.prefix, ...args);
	}

	/**
	 * Log a debug message (only if debug mode is enabled)
	 * @param {...any} args - Arguments to log
	 */
	debug(...args) {
		if (this.debugMode) {
			console.log(this.prefix, '[DEBUG]', ...args);
		}
	}

	/**
	 * Log an info message with timestamp
	 * @param {...any} args - Arguments to log
	 */
	info(...args) {
		const timestamp = new Date().toISOString();
		console.info(this.prefix, `[${timestamp}]`, ...args);
	}

	/**
	 * Log method entry (debug only)
	 * @param {string} className - Name of the class
	 * @param {string} methodName - Name of the method
	 * @param {...any} args - Method arguments
	 */
	methodEntry(className, methodName, ...args) {
		if (this.debugMode) {
			this.debug(`${className}.${methodName}() called`, args.length > 0 ? 'with args:' : '', ...args);
		}
	}

	/**
	 * Log method exit (debug only)
	 * @param {string} className - Name of the class
	 * @param {string} methodName - Name of the method
	 * @param {any} result - Return value
	 */
	methodExit(className, methodName, result) {
		if (this.debugMode) {
			this.debug(`${className}.${methodName}() returning:`, result);
		}
	}

	/**
	 * Log performance timing
	 * @param {string} operation - Description of the operation
	 * @param {number} startTime - Start time (performance.now())
	 */
	performance(operation, startTime) {
		const duration = performance.now() - startTime;
		this.debug(`Performance: ${operation} took ${duration.toFixed(2)}ms`);
	}
}
