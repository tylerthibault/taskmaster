# TaskMaster - Obsidian Plugin

A comprehensive project planning, task tracking, time logging, and assignment management plugin for Obsidian.

## Features

### 🎯 Multi-State Task Tracking
- Replace standard checkboxes with customizable, multi-state toggle buttons
- Create custom state groups with different state ordering
- Configure states with icons, colors, and groups using a color picker
- Click to cycle through states
- Support for inline buttons with syntax: `{{multi-state-button:button_id:status}}`
- Works inside and outside tables
- Visual indicators with icons and colors

### 👥 People & Assignment Management
- Add team members with names, emails, roles, and avatars
- Assign people to tasks using `@mentions`
- Filter and group tasks by assignee
- Visual assignment indicators

### ⏰ Integrated Time Tracking
- Start/stop timers directly on tasks
- Log time entries with optional notes
- View time totals per task, project, or person
- Compare actual vs. estimated time

### 📊 Project Organization
- Create projects from templates (Basic, Kanban, Sprint)
- Organize tasks into collapsible sections
- Progress visualization with bars and metrics
- Dashboard view for project health

### 📈 Reporting & Analytics
- Daily/weekly time logs and progress reports
- Export reports as markdown or CSV
- Automatic progress tracking
- Team productivity insights

## Installation

### Manual Installation
1. Download the latest release
2. Extract to `{vault}/.obsidian/plugins/TaskMaster/`
3. Enable the plugin in Obsidian settings

### From Obsidian Community Plugins
*Coming soon to the official community plugins list*

## Quick Start

1. **Configure Task States**: Go to Settings → TaskMaster → Task States to set up your workflow states
2. **Add Team Members**: Add people in Settings → TaskMaster → People
3. **Create a Project**: Use Ctrl+P → "TaskMaster: Create New Project"
4. **Start Tracking**: Click task states to cycle through them, use `@mentions` for assignments

## Usage

### Task Management
Create tasks with enhanced functionality:

```markdown
- [ ] [Planning] Set up project structure @john @jane est:2h
- [ ] [In Progress] Design user interface @jane est:4h ⏱️1h30m
- [ ] [Review] Code review and testing @john est:1h
```

### Project Templates

#### Basic Project
Simple task list with progress tracking

#### Kanban Board
Visual board with columns for different states

#### Sprint Planning
Agile sprint template with metrics and retrospectives

### Commands

| Command | Description |
|---------|-------------|
| `Create New Project` | Create a new project from templates |
| `Create Multi-State Button` | Insert a new multi-state button at cursor |
| `Toggle Task State` | Cycle through task states |
| `Toggle Time Tracking` | Start/stop time tracking for current task |
| `Assign People to Task` | Assign team members to tasks |
| `Show Dashboard` | View project overview and statistics |

### Settings

- **State Groups**: Create custom groups of states with different ordering
- **Task States**: Configure available states with icons, colors, and groups
- **People**: Manage team members and their details
- **General**: Default settings for new tasks and features

## Syntax

### Multi-State Buttons
Create inline buttons that cycle through custom states:
```markdown
Status: {{multi-state-button:status1:todo}}
Progress: {{multi-state-button:progress1:in-progress}}

| Task | Status | Assignee |
|------|--------|----------|
| Design | {{multi-state-button:task1:review}} | @alice |
| Testing | {{multi-state-button:task2:done}} | @bob |
```

### Task States
Tasks can have custom states indicated in brackets:
```markdown
- [ ] [To Do] Regular task
- [ ] [In Progress] Currently working on this
- [ ] [Blocked] Waiting for something
- [ ] [Review] Ready for review
- [ ] [Done] Completed task
```

### Assignments
Assign people to tasks using @ mentions:
```markdown
- [ ] Task assigned to John @john
- [ ] Task for multiple people @john @jane @bob
```

### Time Tracking
Log estimated and actual time:
```markdown
- [ ] Task with estimate est:2h
- [ ] Task with logged time ⏱️1h30m
- [ ] Task with both est:2h ⏱️45m
```

## Customization

### Task States
Create custom states with:
- **Name**: Display name for the state
- **Icon**: Emoji or symbol to represent the state
- **Color**: Hex color code with color picker for visual distinction
- **Group**: Which state group this state belongs to

### State Groups
Organize states into groups with custom ordering:
- **Group Name**: Name for the state group
- **State Order**: Drag to reorder states within the group
- Different buttons can use different groups for specialized workflows

### People Management
Add team members with:
- **Name**: Full name of the person
- **Email**: Contact email (optional)
- **Role**: Job title or role (optional)
- **Avatar**: Emoji or initials (optional)

## Data Storage

TaskMaster stores its configuration in your vault's plugin data folder:
- Settings are saved to `{vault}/.obsidian/plugins/TaskMaster/data.json`
- All data remains in your vault - no external dependencies

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/your-repo/taskmaster-obsidian
cd taskmaster-obsidian

# Install dependencies
npm install

# Build the plugin
npm run build
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Compatibility

- **Obsidian Version**: 1.0.0+
- **Platform**: Desktop and Mobile
- **File Format**: Standard Markdown with enhanced syntax

## Changelog

### v1.0.0 (Initial Release)
- Multi-state task tracking
- People and assignment management
- Time tracking with start/stop timers
- Project templates (Basic, Kanban, Sprint)
- Customizable task states and team members
- Dashboard and reporting features

## Support

- **Documentation**: [Wiki](https://github.com/your-repo/taskmaster-obsidian/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-repo/taskmaster-obsidian/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/taskmaster-obsidian/discussions)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for the [Obsidian](https://obsidian.md) community
- Inspired by modern project management tools
- Thanks to all contributors and testers
