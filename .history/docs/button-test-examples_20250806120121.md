# Multi-State Button Test File

This file demonstrates the TaskMaster multi-state button functionality.

## Basic Buttons

Simple task tracking:
- Task 1: {{multi-state-button:id=task1;state=todo}}
- Task 2: {{multi-state-button:id=task2;state=in-progress}}
- Task 3: {{multi-state-button:id=task3;state=done}}

## Development Workflow

Feature development progress:
- Authentication System: {{multi-state-button:id=auth;group=development;state=planning}}
- User Dashboard: {{multi-state-button:id=dashboard;group=development;state=development}}
- API Integration: {{multi-state-button:id=api;group=development;state=review}}

## Approval Process

Document review status:
- Requirements Doc: {{multi-state-button:id=req_doc;group=approval;state=draft}}
- Architecture Guide: {{multi-state-button:id=arch_guide;group=approval;state=review}}
- User Manual: {{multi-state-button:id=user_manual;group=approval;state=approved}}

## Table Example

| Feature | Status | Assignee | Priority |
|---------|--------|----------|----------|
| Login System | {{multi-state-button:id=login;group=development;state=testing}} | Alice | High |
| Dashboard | {{multi-state-button:id=dash;group=development;state=development}} | Bob | Medium |
| Reports | {{multi-state-button:id=reports;group=development;state=backlog}} | Charlie | Low |

## Code Block Example

```taskmaster
Project Alpha - Sprint 3

Core Features:
- User Registration: {{multi-state-button:id=user_reg;group=development;state=deployed}}
- Email Notifications: {{multi-state-button:id=email;group=development;state=testing}}
- Data Export: {{multi-state-button:id=export;group=development;state=development}}

Documentation:
- API Docs: {{multi-state-button:id=api_docs;group=approval;state=review}}
- User Guide: {{multi-state-button:id=user_guide;group=approval;state=feedback}}
```

## Legacy Format (Still Supported)

These buttons use the old syntax format:
- Legacy Task 1: {{multi-state-button:legacy1:todo}}
- Legacy Task 2: {{multi-state-button:legacy2:in-progress}}
- Legacy Task 3: {{multi-state-button:legacy3:done}}

## Instructions

1. Click any button to cycle through its states
2. Each button will progress through its state group's sequence
3. Changes are automatically saved to this markdown file
4. Try buttons in different contexts (inline, table, code block)
5. Open plugin settings to create custom state groups

## State Groups Available

- **default**: To Do → In Progress → Done
- **development**: Backlog → Planning → Development → Code Review → Testing → Deployed  
- **approval**: Draft → Under Review → Needs Feedback → Approved/Rejected
