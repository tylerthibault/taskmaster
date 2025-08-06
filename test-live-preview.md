# Test Multi-State Buttons in Edit Mode

This is a test file to verify that multi-state buttons render properly in edit mode (live preview).

## Test Buttons

Here's a simple button: {{multi-state-button:test1:todo}}

Here's another button in a sentence: This task {{multi-state-button:task1:in-progress}} is currently being worked on.

## Table Test

| Task | Status | Assignee |
|------|--------|----------|
| Setup project | {{multi-state-button:setup:done}} | @john |
| Write docs | {{multi-state-button:docs:review}} | @jane |
| Testing | {{multi-state-button:testing:todo}} | @bob |

## List Test

- Task 1: {{multi-state-button:list1:todo}}
- Task 2: {{multi-state-button:list2:in-progress}}
- Task 3: {{multi-state-button:list3:done}}

## Instructions

1. Open this file in **Edit Mode** (not Reading Mode)
2. The buttons above should render as visual buttons, not as raw text
3. You should be able to click the buttons to cycle through states
4. Use Ctrl+Shift+T to cycle the button at your cursor position
5. Use the command palette: "Debug: Reprocess Current View for Buttons" to force refresh

## Expected Behavior

- ⭕ To Do (todo)
- 🔄 In Progress (in-progress) 
- 🚫 Blocked (blocked)
- 👀 Review (review)
- ✅ Done (done)
