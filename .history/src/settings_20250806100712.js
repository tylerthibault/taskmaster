// Settings and data structures for TaskMaster plugin

const DEFAULT_SETTINGS = {
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

export { DEFAULT_SETTINGS };
