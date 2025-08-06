---
applyTo: '**'
---
# PRD: TaskMaster — Project Planner, Task Tracker, Time Logger & Assignment Manager for Obsidian

## Overview

**TaskMaster** is an Obsidian plugin that empowers users to manage projects and tasks collaboratively within their vault. It features multi-state task tracking, time logging, and people management, all configurable via an intuitive settings interface. TaskMaster is designed for developers, teams, and productivity enthusiasts who want robust planning, assignment, and analytics workflows—without leaving their notes.

> **Note:** The codebase will be implemented in JavaScript (not TypeScript) for maximum compatibility and easier community contributions.

---

## Features List

### 1. Multi-State Task Tracking
- Replace standard checkboxes with customizable, multi-state toggle buttons (e.g., To Do, In Progress, Blocked, Review, Done).
- Task states are user-defined in plugin settings (add/edit/remove, reorder, icons/colors).
- Cycle through task states by clicking the icon/label inline.

### 2. People & Assignment Management
- Add, edit, or remove people in plugin settings (name, email, avatar, role).
- Assign one or more people to any task or project (via dropdown or `@mention`).
- Inline display and quick selection of assignees from the people list.
- Filter/group tasks by assignee.

### 3. Project & Task Structure
- Organize projects into collapsible sections (phases, milestones), with nested tasks.
- Support for markdown-based boards, lists, and outlines.
- Toggle views: list, Kanban, or calendar.

### 4. Integrated Time Tracking
- Start/stop timers on any task or project directly from the note.
- Log multiple time entries per task/person, with optional notes.
- View time totals per task, project, person, or across the vault.
- Compare actual vs. estimated time.

### 5. Progress Visualization
- Progress bars for each project, based on task completion.
- Visual breakdowns by state, assignee, or time spent.
- Dashboard view for at-a-glance project health.

### 6. Daily/Weekly Logs & Reporting
- Automatic or manual summaries of time spent and progress for any period.
- Optionally inject logs/reports into daily notes.
- Export reports as markdown or CSV.

### 7. Customizable Settings
- Manage people and task states in the plugin settings panel.
- Persist settings to the vault’s plugin data folder.
- Set defaults for states, colors, and roles.

---

## Example Use Cases

- Dev teams managing sprints or releases inside Obsidian.
- Freelancers tracking project work, time, and deliverables.
- Students managing group assignments and time allocation.
- Personal productivity for habits, goals, and tracked work.

---

## Out-of-Scope / Future Considerations

- Real-time collaboration (beyond Obsidian’s sync).
- Integration with Jira, Trello, or other external PM tools.
- Built-in reminders/notifications.
- Advanced automation (Zapier, IFTTT).

---

## Success Metrics

- Users can configure people and states in under 5 minutes.
- Each task supports states, time tracking, and assignees, all inline.
- Plugin performs smoothly with 100+ tasks per project.
- Reports export correctly in markdown and CSV.

---

## Tech Notes

- **Language:** JavaScript (not TypeScript).
- **UI:** Native Obsidian settings panel, markdown enhancements, and modals.
- **Data Storage:** Plugin data folder in the vault (JSON).