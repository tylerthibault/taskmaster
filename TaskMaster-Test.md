# TaskMaster Test File

## Multi-State Button Test

Test basic multi-state button:
{{multi-state-button:test1:todo}}

Test in table:

| Task | Status | Assignee |
|------|--------|----------|
| Design UI | {{multi-state-button:task1:todo}} | @john |
| Write code | {{multi-state-button:task2:in-progress}} | @jane |
| Test app | {{multi-state-button:task3:review}} | @bob |

## Traditional Task List

- [ ] Traditional checkbox task
- [ ] [In Progress] Task with state indicator @alice est:2h
- [ ] [Review] Another task with assignments @bob @charlie

## Testing Commands

Try these commands:
- Ctrl+P → "TaskMaster: Create Multi-State Button"
- Ctrl+P → "TaskMaster: Toggle Task State"
- Ctrl+P → "TaskMaster: Show Dashboard"

## Color Test

After setting up colors in settings, these should show different colors:
- {{multi-state-button:red-task:todo}} - Should be todo color
- {{multi-state-button:blue-task:in-progress}} - Should be in-progress color  
- {{multi-state-button:green-task:done}} - Should be done color
