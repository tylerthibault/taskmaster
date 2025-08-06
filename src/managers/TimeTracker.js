// TimeTracker - handles time logging and tracking functionality

const { Notice } = require('obsidian');

class TimeTracker {
  constructor(plugin) {
    this.plugin = plugin;
    this.activeTimers = new Map(); // taskId -> { startTime, taskText, file }
  }

  toggleTimeTracking(editor, view) {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    
    if (!line.match(/^\s*[-*+]\s*\[.\]\s/)) {
      new Notice('Place cursor on a task line to track time');
      return;
    }
    
    const taskId = this.generateTaskId(line, view.file.path);
    
    if (this.activeTimers.has(taskId)) {
      this.stopTimer(taskId, editor, cursor.line);
    } else {
      this.startTimer(taskId, line, view.file);
    }
  }

  generateTaskId(taskText, filePath) {
    return `${filePath}:${taskText.trim()}`;
  }

  startTimer(taskId, taskText, file) {
    this.activeTimers.set(taskId, {
      startTime: Date.now(),
      taskText: taskText,
      file: file
    });
    
    new Notice(`⏱️ Started tracking time for task`);
  }

  stopTimer(taskId, editor, lineNumber) {
    const timerData = this.activeTimers.get(taskId);
    if (!timerData) return;
    
    const duration = Date.now() - timerData.startTime;
    const minutes = Math.round(duration / 60000);
    
    this.activeTimers.delete(taskId);
    
    // Update the task line with logged time
    const line = editor.getLine(lineNumber);
    const timeStr = this.formatTimeForTask(minutes);
    const updatedLine = line + ` ⏱️${timeStr}`;
    
    editor.setLine(lineNumber, updatedLine);
    
    new Notice(`⏹️ Logged ${timeStr} for task`);
  }

  formatTimeForTask(minutes) {
    if (minutes < 60) {
      return `${minutes}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h${remainingMinutes}m` : `${hours}h`;
    }
  }

  // Get all active timers
  getActiveTimers() {
    return Array.from(this.activeTimers.entries()).map(([taskId, data]) => ({
      taskId,
      ...data,
      elapsed: Date.now() - data.startTime
    }));
  }

  // Stop all active timers
  stopAllTimers() {
    const activeCount = this.activeTimers.size;
    this.activeTimers.clear();
    
    if (activeCount > 0) {
      new Notice(`⏹️ Stopped ${activeCount} active timer(s)`);
    }
  }

  // Get total time logged for a specific task pattern
  getTotalTimeForTask(taskPattern) {
    // This would analyze markdown files to calculate total logged time
    // Implementation would scan files for time entries
    return 0; // Placeholder
  }
}

module.exports = TimeTracker;
