# TaskMaster Multi-State Button Demo

This file demonstrates the new multi-state button functionality in TaskMaster.

## Basic Multi-State Buttons

Here are some basic multi-state buttons:

Status: {{multi-state-button:status1:todo}}

Task Progress: {{multi-state-button:progress1:in-progress}}

Review Status: {{multi-state-button:review1:review}}

## Buttons in Tables

| Task | Status | Priority | Assignee |
|------|--------|----------|----------|
| Design UI | {{multi-state-button:task1:in-progress}} | High | @alice |
| Write Tests | {{multi-state-button:task2:todo}} | Medium | @bob |
| Code Review | {{multi-state-button:task3:review}} | High | @charlie |
| Deploy | {{multi-state-button:task4:blocked}} | Critical | @david |

## Mixed Content

This is a paragraph with inline buttons. The API integration is {{multi-state-button:api1:in-progress}} and the documentation is {{multi-state-button:docs1:todo}}. 

Once both are complete, we can move to the testing phase {{multi-state-button:testing1:todo}}.

## Instructions

1. Click on any button to cycle through states
2. States will cycle: To Do → In Progress → Blocked → Review → Done → To Do
3. Use Ctrl+P → "TaskMaster: Create Multi-State Button" to add new buttons
4. Configure state groups in Settings → TaskMaster → State Groups

## State Examples

- **To Do**: {{multi-state-button:example1:todo}} - Starting state for new tasks
- **In Progress**: {{multi-state-button:example2:in-progress}} - Currently being worked on  
- **Blocked**: {{multi-state-button:example3:blocked}} - Waiting for external dependency
- **Review**: {{multi-state-button:example4:review}} - Ready for code/content review
- **Done**: {{multi-state-button:example5:done}} - Completed successfully

## Advanced Usage

You can create custom state groups in the settings to have different buttons cycle through different sets of states. For example:

- **Development states**: Planning → Coding → Testing → Review → Complete
- **Content states**: Draft → Review → Approved → Published
- **Bug states**: Reported → Assigned → In Progress → Testing → Resolved

Each button can be assigned to a specific state group for customized workflows!
