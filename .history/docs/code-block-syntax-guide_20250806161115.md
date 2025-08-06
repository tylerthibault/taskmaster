# TaskMaster Code Block Syntax Guide

TaskMaster now supports two ways to create multi-state buttons:

## 1. Inline Syntax (Original)

```markdown
{{multi-state-button:button-id:current-state}}
```

**Example:**
```markdown
{{multi-state-button:my-task:todo}}
```

## 2. Code Block Syntax (New)

```markdown
```taskmaster
button-id: unique-identifier
state: current-state
group: state-group-name
description: Hover tooltip text
```
```

## Code Block Parameters

### Required Parameters

- **`button-id`** or **`id`**: Unique identifier for the button
- **`state`** or **`current-state`**: Current state of the button

### Optional Parameters

- **`group`** or **`state-group`**: State group to use (defaults to plugin default)
- **`description`** or **`desc`**: Tooltip text shown on hover

### Comments

You can add comments in code blocks using `#`:

```taskmaster
# This is a comment explaining the button
button-id: important-task
state: in-progress
label: Critical Bug Fix
description: High priority bug that needs immediate attention
```

## Examples

### Basic Button
```taskmaster
button-id: simple-task
state: todo
```

### Advanced Button with Description
```taskmaster
button-id: feature-request
state: todo
group: development
description: Implement user authentication system
```

### Task with Custom State Group
```taskmaster
# Using a custom state group for development workflow
button-id: code-review
state: review
group: development
description: Review pull request for user profile updates
```

## Advantages of Code Block Syntax

1. **Readability**: Easier to read and understand at a glance
2. **Maintainability**: Simpler to edit complex button configurations
3. **Extensibility**: Easy to add new parameters without breaking existing syntax
4. **Comments**: Ability to document your buttons inline
5. **Tooltips**: Add helpful descriptions via hover text
6. **Better Organization**: Groups related parameters together
7. **Context Detection**: Single command automatically chooses the right format

## State Persistence

Both inline and code block buttons automatically save their state changes back to the source file:

- **Inline buttons**: Updates the state parameter in the `{{}}` syntax
- **Code block buttons**: Updates the `state:` line in the code block

## Migration

Existing inline buttons will continue to work. You can gradually migrate to code blocks or use both methods in the same document as needed.

## Command Palette

Use this command to insert buttons:

- **"Insert Multi-State Button"**: Automatically detects context and creates either `{{}}` syntax for tables or code block syntax for regular content
