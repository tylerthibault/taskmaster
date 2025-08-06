# Edit Mode Button Test

Testing multi-state buttons in edit mode vs reading mode:

## Simple Button Test
{{multi-state-button:test1:todo}}

## Button in Paragraph
This is a paragraph with a {{multi-state-button:test2:in-progress}} button in the middle.

## Button in List
- Item 1 with {{multi-state-button:test3:done}} button
- Item 2 with {{multi-state-button:test4:blocked}} button

## Button in Table
| Task | Status |
|------|--------|
| Task A | {{multi-state-button:test5:review}} |
| Task B | {{multi-state-button:test6:todo}} |

## Debug Info
When you switch between edit mode and reading mode, buttons should appear in both modes but they don't currently show in edit mode.
