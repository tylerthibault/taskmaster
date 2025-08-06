# TaskMaster Edit Mode Test

This file tests the multi-state buttons in both reading mode and edit mode with live preview.

## Test Buttons

Here are some test buttons:

Task 1: {{multi-state-button:task1:todo}} - Initial task
Task 2: {{multi-state-button:task2:in-progress}} - Task in progress  
Task 3: {{multi-state-button:task3:done}} - Completed task

## Instructions

### Reading Mode
1. Switch to Reading Mode 
2. Buttons should appear as clickable visual buttons
3. Click buttons to cycle through states: todo → in-progress → blocked → review → done → todo

### Edit Mode - Live Preview
1. Switch to Edit Mode 
2. **Place cursor on a line with a button** - you should see the raw text syntax
3. **Move cursor off the line** - the button should render visually (like headings do!)
4. **Click the rendered button** - it should cycle through states
5. **Move cursor back to the line** - raw syntax should reappear for editing

### Edit Mode - Hotkey Support
1. Place cursor anywhere near a button (within ~5 characters)
2. Press `Ctrl+Shift+T` to cycle the button state
3. Should work even when viewing raw syntax

## Expected Behavior
- **Live Preview**: Buttons render when cursor is off the line
- **Visual Feedback**: Notice shows new state when cycling
- **Seamless Switching**: No loss of functionality between modes
- **State Persistence**: Button states are saved to the file

## Test State Order
Default cycle: todo → in-progress → blocked → review → done → todo
