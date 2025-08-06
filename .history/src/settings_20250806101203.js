/**
 * TaskMaster Settings Configuration
 * 
 * Defines the data structures and default settings for the TaskMaster plugin.
 * All settings are persisted to Obsidian's plugin data storage.
 */

/**
 * Represents a single task state with visual properties
 */
export class TaskState {
	constructor(id, name, color, order) {
		this.id = id;
		this.name = name;
		this.color = color;
		this.order = order;
	}
}

/**
 * Represents a group of task states that define a workflow
 */
export class TaskStateGroup {
	constructor(id, name, states = []) {
		this.id = id;
		this.name = name;
		this.states = states;
	}

	/**
	 * Get the next state in the progression
	 * @param {string} currentStateId - Current state ID
	 * @returns {TaskState|null} Next state or null if at end
	 */
	getNextState(currentStateId) {
		const currentIndex = this.states.findIndex(state => state.id === currentStateId);
		if (currentIndex === -1) return this.states[0] || null;
		
		const nextIndex = (currentIndex + 1) % this.states.length;
		return this.states[nextIndex];
	}

	/**
	 * Get state by ID
	 * @param {string} stateId - State ID to find
	 * @returns {TaskState|null} Found state or null
	 */
	getState(stateId) {
		return this.states.find(state => state.id === stateId) || null;
	}
}

/**
 * Represents a person who can be assigned to tasks
 */
export class Person {
	constructor(id, name, email = '', avatar = '', role = '') {
		this.id = id;
		this.name = name;
		this.email = email;
		this.avatar = avatar;
		this.role = role;
	}
}

/**
 * Main settings object for TaskMaster plugin
 */
export class TaskMasterSettings {
	constructor() {
		this.debugMode = false;
		this.stateGroups = new Map();
		this.people = new Map();
		this.defaultStateGroup = 'default';
		this.timeTrackingEnabled = true;
		this.autoSave = true;
		this.theme = 'default';
	}

	/**
	 * Get state group by ID
	 * @param {string} groupId - Group ID to find
	 * @returns {TaskStateGroup|null} Found group or null
	 */
	getStateGroup(groupId) {
		return this.stateGroups.get(groupId) || null;
	}

	/**
	 * Add or update a state group
	 * @param {TaskStateGroup} group - Group to add/update
	 */
	setStateGroup(group) {
		this.stateGroups.set(group.id, group);
	}

	/**
	 * Remove a state group
	 * @param {string} groupId - Group ID to remove
	 */
	removeStateGroup(groupId) {
		this.stateGroups.delete(groupId);
	}

	/**
	 * Get person by ID
	 * @param {string} personId - Person ID to find
	 * @returns {Person|null} Found person or null
	 */
	getPerson(personId) {
		return this.people.get(personId) || null;
	}

	/**
	 * Add or update a person
	 * @param {Person} person - Person to add/update
	 */
	setPerson(person) {
		this.people.set(person.id, person);
	}

	/**
	 * Remove a person
	 * @param {string} personId - Person ID to remove
	 */
	removePerson(personId) {
		this.people.delete(personId);
	}
}

/**
 * Default settings with built-in state group
 */
export const DEFAULT_SETTINGS = {
	debugMode: false,
	stateGroups: new Map([
		['default', new TaskStateGroup('default', 'Default', [
			new TaskState('todo', 'To Do', '#e74c3c', 0),
			new TaskState('in-progress', 'In Progress', '#f39c12', 1),
			new TaskState('done', 'Done', '#27ae60', 2)
		])]
	]),
	people: new Map(),
	defaultStateGroup: 'default',
	timeTrackingEnabled: true,
	autoSave: true,
	theme: 'default'
};
