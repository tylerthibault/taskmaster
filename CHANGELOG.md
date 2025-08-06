# Changelog

All notable changes to the TaskMaster plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-15

### Added
- **Multi-State Task Tracking** ✅
  - Customizable task states with icons and colors
  - Click-to-cycle state transitions
  - Configurable default states
  - Visual state indicators
  - **NEW**: Multi-state button syntax `{{multi-state-button:id:state}}`
  - **NEW**: Support for inline buttons in tables and text
  - **NEW**: State groups with custom ordering
  - **NEW**: Color picker for state colors

- **People & Assignment Management**
  - Team member configuration (name, email, role, avatar)
  - Task assignment via `@mentions`
  - Assignment display in task items
  - People management in settings

- **Time Tracking**
  - Start/stop timers on individual tasks
  - Time logging with visual indicators
  - Estimated vs. actual time comparison
  - Time formatting and display

- **Project Organization**
  - Project creation from templates
  - Three project templates: Basic, Kanban, Sprint
  - Project structure with phases and milestones
  - Progress visualization

- **Settings & Configuration**
  - Comprehensive settings panel
  - Task state management (add, edit, delete, reorder)
  - People management interface
  - General plugin configuration

- **Commands & Shortcuts**
  - Create New Project command
  - Toggle Task State command
  - Toggle Time Tracking command
  - Assign People to Task command
  - Show Dashboard command

- **User Interface**
  - Enhanced task rendering with custom buttons
  - Assignment and time tracking displays
  - Responsive design for mobile compatibility
  - Dark/light theme support

- **Data Management**
  - Local data storage in vault plugin folder
  - Settings persistence
  - Auto-save functionality
  - Data integrity and backup

- **Documentation**
  - Comprehensive README with usage examples
  - Example project files
  - Development setup instructions
  - API documentation for developers

### Technical Details
- **Language**: JavaScript (ES6+)
- **Platform**: Obsidian 1.0.0+
- **Dependencies**: Native Obsidian API only
- **File Format**: Standard Markdown with enhanced syntax
- **Storage**: Local JSON configuration files

### Example Projects
- Software Development Project template
- Marketing Campaign Kanban board
- Personal Learning Goals tracker

### Known Limitations
- Desktop and mobile compatible
- Requires manual plugin installation
- No real-time collaboration features
- No external integrations in v1.0

## [Unreleased]

### Planned Features
- Export functionality (CSV, PDF)
- Advanced reporting and analytics
- Custom task templates
- Bulk task operations
- Integration with Obsidian calendar
- Mobile app optimization
- Collaboration features
- External tool integrations

### Under Consideration
- Task dependencies and relationships
- Gantt chart visualization
- Resource allocation tracking
- Budget and cost management
- Custom fields for tasks
- Automation and workflows
- API for third-party integrations
- Advanced search and filtering

---

## Development Notes

### Version Numbering
- **Major (X.0.0)**: Breaking changes, major feature additions
- **Minor (1.X.0)**: New features, significant improvements
- **Patch (1.0.X)**: Bug fixes, minor improvements

### Release Process
1. Feature development and testing
2. Documentation updates
3. Version number update
4. Changelog preparation
5. Release notes creation
6. Community plugin submission (future)

### Contributing
See [README.md](README.md) for contribution guidelines and development setup instructions.
