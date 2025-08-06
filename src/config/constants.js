// Default configurations for TaskMaster plugin

const DEFAULT_TASK_STATES = [
  { id: 'todo', name: 'To Do', icon: '⭕', color: '#64748b', group: 'default' },
  { id: 'in-progress', name: 'In Progress', icon: '🔄', color: '#3b82f6', group: 'default' },
  { id: 'blocked', name: 'Blocked', icon: '🚫', color: '#ef4444', group: 'default' },
  { id: 'review', name: 'Review', icon: '👀', color: '#f59e0b', group: 'default' },
  { id: 'done', name: 'Done', icon: '✅', color: '#10b981', group: 'default' }
];

const DEFAULT_STATE_GROUPS = [
  { id: 'default', name: 'Default', stateOrder: ['todo', 'in-progress', 'blocked', 'review', 'done'] }
];

const DEFAULT_PEOPLE = [];

const DEFAULT_SETTINGS = {
  taskStates: DEFAULT_TASK_STATES,
  stateGroups: DEFAULT_STATE_GROUPS,
  people: DEFAULT_PEOPLE,
  defaultState: 'todo',
  defaultGroup: 'default',
  showProgressBars: true,
  enableTimeTracking: true,
  autoSaveInterval: 30000, // 30 seconds
  showLabelsOnCreation: true,
  buttonIdCounter: 1, // For generating unique button IDs
  enableDebugLogging: false,
  logLevel: 'INFO'
};

module.exports = {
  DEFAULT_TASK_STATES,
  DEFAULT_STATE_GROUPS,
  DEFAULT_PEOPLE,
  DEFAULT_SETTINGS
};
