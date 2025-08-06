export interface TaskState {
	id: string;
	name: string;
	color: string;
	order: number;
}

export interface TaskStateGroup {
	id: string;
	name: string;
	states: TaskState[];
}

export interface Person {
	id: string;
	name: string;
	email: string;
	avatar?: string;
	role?: string;
}

export interface TaskMasterSettings {
	// Logging
	debugMode: boolean;
	
	// Task States
	defaultStateGroup: string;
	stateGroups: TaskStateGroup[];
	
	// People Management
	people: Person[];
	
	// Time Tracking
	enableTimeTracking: boolean;
	timeTrackingFormat: '24h' | '12h';
	
	// UI Settings
	showProgressBars: boolean;
	defaultView: 'list' | 'kanban' | 'calendar';
	
	// Reports
	autoGenerateReports: boolean;
	reportFrequency: 'daily' | 'weekly' | 'monthly';
}

export const DEFAULT_SETTINGS: TaskMasterSettings = {
	debugMode: false,
	defaultStateGroup: 'default',
	stateGroups: [
		{
			id: 'default',
			name: 'Default States',
			states: [
				{ id: 'todo', name: 'To Do', color: '#e74c3c', order: 0 },
				{ id: 'in-progress', name: 'In Progress', color: '#f39c12', order: 1 },
				{ id: 'review', name: 'Review', color: '#3498db', order: 2 },
				{ id: 'done', name: 'Done', color: '#27ae60', order: 3 }
			]
		}
	],
	people: [],
	enableTimeTracking: true,
	timeTrackingFormat: '24h',
	showProgressBars: true,
	defaultView: 'list',
	autoGenerateReports: false,
	reportFrequency: 'weekly'
};
