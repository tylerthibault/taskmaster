// PeopleManager - handles people and assignment management functionality

const { Notice } = require('obsidian');

class PeopleManager {
  constructor(plugin) {
    this.plugin = plugin;
  }

  assignPeopleToTask(editor, view) {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    
    if (!line.match(/^\s*[-*+]\s*\[.\]\s/)) {
      new Notice('Place cursor on a task line to assign people');
      return;
    }
    
    // Import AssignmentModal would be needed here
    new AssignmentModal(this.plugin.app, this.plugin, (selectedPeople) => {
      this.updateTaskAssignments(editor, cursor.line, selectedPeople);
    }).open();
  }

  updateTaskAssignments(editor, lineNumber, assignments) {
    const line = editor.getLine(lineNumber);
    
    // Remove existing assignments
    let updatedLine = line.replace(/@\w+/g, '').trim();
    
    // Add new assignments
    if (assignments.length > 0) {
      const assignmentText = assignments.map(p => `@${p.name}`).join(' ');
      updatedLine = `${updatedLine} ${assignmentText}`;
    }
    
    editor.setLine(lineNumber, updatedLine);
  }

  // Add a new person to the people list
  addPerson(person) {
    this.plugin.settings.people.push({
      id: this.generatePersonId(),
      name: person.name,
      email: person.email || '',
      avatar: person.avatar || '',
      role: person.role || 'Member',
      color: person.color || this.generateRandomColor()
    });
    
    this.plugin.saveSettings();
  }

  // Remove a person from the people list
  removePerson(personId) {
    const index = this.plugin.settings.people.findIndex(p => p.id === personId);
    if (index > -1) {
      this.plugin.settings.people.splice(index, 1);
      this.plugin.saveSettings();
    }
  }

  // Update person details
  updatePerson(personId, updates) {
    const person = this.plugin.settings.people.find(p => p.id === personId);
    if (person) {
      Object.assign(person, updates);
      this.plugin.saveSettings();
    }
  }

  // Get all people
  getAllPeople() {
    return this.plugin.settings.people || [];
  }

  // Find person by name or ID
  findPerson(identifier) {
    return this.plugin.settings.people.find(p => 
      p.id === identifier || 
      p.name.toLowerCase() === identifier.toLowerCase()
    );
  }

  // Parse assignments from task text
  parseAssignments(taskText) {
    const assignmentRegex = /@(\w+)/g;
    const assignments = [];
    let match;
    
    while ((match = assignmentRegex.exec(taskText)) !== null) {
      const person = this.findPerson(match[1]);
      if (person) {
        assignments.push(person);
      }
    }
    
    return assignments;
  }

  // Generate unique person ID
  generatePersonId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `person_${timestamp}_${random}`;
  }

  // Generate random color for person
  generateRandomColor() {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Get tasks assigned to specific person
  getTasksForPerson(personId) {
    // This would scan files for tasks assigned to the person
    // Implementation would search through vault files
    return []; // Placeholder
  }

  // Get workload statistics for all people
  getWorkloadStats() {
    const people = this.getAllPeople();
    return people.map(person => ({
      person,
      taskCount: this.getTasksForPerson(person.id).length,
      // Add more stats as needed
    }));
  }
}

module.exports = PeopleManager;
