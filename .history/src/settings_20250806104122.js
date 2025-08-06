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
 * Using plain objects instead of Maps for JSON serialization compatibility
 */
export const DEFAULT_SETTINGS = {
	debugMode: false,
	stateGroups: {
		'default': {
			id: 'default',
			name: 'Default',
			states: [
				{ id: 'todo', name: 'To Do', color: '#e74c3c', order: 0 },
				{ id: 'in-progress', name: 'In Progress', color: '#f39c12', order: 1 },
				{ id: 'done', name: 'Done', color: '#27ae60', order: 2 }
			]
		}
	},
	people: {},
	defaultStateGroup: 'default',
	timeTrackingEnabled: true,
	autoSave: true,
	theme: 'default'
};

/**
 * Helper function to convert plain object to TaskStateGroup
 * @param {Object} obj - Plain object with state group data
 * @returns {TaskStateGroup} Converted state group
 */
export function objectToStateGroup(obj) {
	const states = obj.states.map(stateObj => 
		new TaskState(stateObj.id, stateObj.name, stateObj.color, stateObj.order)
	);
	return new TaskStateGroup(obj.id, obj.name, states);
}

/**
 * Helper function to convert TaskStateGroup to plain object
 * @param {TaskStateGroup} group - State group to convert
 * @returns {Object} Plain object representation
 */
export function stateGroupToObject(group) {
	return {
		id: group.id,
		name: group.name,
		states: group.states.map(state => ({
			id: state.id,
			name: state.name,
			color: state.color,
			order: state.order
		}))
	};
}

/**
 * Helper function to convert plain object to Person
 * @param {Object} obj - Plain object with person data
 * @returns {Person} Converted person
 */
export function objectToPerson(obj) {
	return new Person(obj.id, obj.name, obj.email || '', obj.avatar || '', obj.role || '');
}

/**
 * Helper function to convert Person to plain object
 * @param {Person} person - Person to convert
 * @returns {Object} Plain object representation
 */
export function personToObject(person) {
	return {
		id: person.id,
		name: person.name,
		email: person.email,
		avatar: person.avatar,
		role: person.role
	};
}
