// Logging utility class for TaskMaster plugin

class TaskMasterLogger {
  constructor(plugin) {
    this.plugin = plugin;
    this.logLevels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
  }

  get isDebugEnabled() {
    return this.plugin.settings?.enableDebugLogging || false;
  }

  get logLevel() {
    return this.plugin.settings?.logLevel || 'INFO';
  }

  shouldLog(level) {
    if (!this.isDebugEnabled && level === 'DEBUG') {
      return false;
    }
    return this.logLevels[level] <= this.logLevels[this.logLevel];
  }

  log(level, component, message, data = null) {
    if (!this.shouldLog(level)) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[TaskMaster] [${timestamp}] [${level}] [${component}]`;
    
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }

    // Store logs in plugin data for debugging
    if (this.isDebugEnabled) {
      this.storeLog(level, component, message, data);
    }
  }

  error(component, message, data = null) {
    this.log('ERROR', component, message, data);
  }

  warn(component, message, data = null) {
    this.log('WARN', component, message, data);
  }

  info(component, message, data = null) {
    this.log('INFO', component, message, data);
  }

  debug(component, message, data = null) {
    this.log('DEBUG', component, message, data);
  }

  storeLog(level, component, message, data) {
    if (!this.plugin.debugLogs) {
      this.plugin.debugLogs = [];
    }
    
    this.plugin.debugLogs.push({
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      data: data ? JSON.stringify(data) : null
    });

    // Keep only last 1000 log entries
    if (this.plugin.debugLogs.length > 1000) {
      this.plugin.debugLogs = this.plugin.debugLogs.slice(-1000);
    }
  }

  exportLogs() {
    if (!this.plugin.debugLogs) return '';
    
    return this.plugin.debugLogs
      .map(log => `${log.timestamp} [${log.level}] [${log.component}] ${log.message}${log.data ? ` - ${log.data}` : ''}`)
      .join('\n');
  }

  clearLogs() {
    this.plugin.debugLogs = [];
    this.info('Logger', 'Debug logs cleared');
  }
}

module.exports = TaskMasterLogger;
