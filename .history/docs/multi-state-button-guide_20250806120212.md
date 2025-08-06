# Multi-State Button Usage Guide

This guide explains how to use the TaskMaster plugin's multi-state buttons in your Obsidian notes.

## Syntax

TaskMaster supports two syntax formats for multi-state buttons:

### New Syntax (Recommended)
```
{{multi-state-button:id=unique_id;group=group_name;state=current_state}}
```

**Parameters:**
- `id`: Unique identifier for the button (required)
- `group`: Name of the state group to use (optional, defaults to 'default')
- `state`: Current state of the button (required)

### Legacy Syntax (Still Supported)
```
{{multi-state-button:unique_id:current_state}}
```

This format uses the default state group.

## Usage Examples

### Basic Usage
```markdown
Task progress: {{multi-state-button:id=task1;state=todo}}
```

### Using Different State Groups
```markdown
Code Review: {{multi-state-button:id=feature_x;group=development;state=development}}
Document Status: {{multi-state-button:id=doc1;group=approval;state=draft}}
```

### In Tables
| Task | Status | Priority |
|------|--------|----------|
| Implement feature A | {{multi-state-button:id=feat_a;group=development;state=backlog}} | High |
| Write documentation | {{multi-state-button:id=doc_a;group=approval;state=draft}} | Medium |

### In Code Blocks
```taskmaster
Project Planning Phase
- Research: {{multi-state-button:id=research;group=development;state=planning}}
- Design: {{multi-state-button:id=design;group=development;state=backlog}}
- Implementation: {{multi-state-button:id=impl;group=development;state=backlog}}
```

## Available State Groups

### Default Group
- **To Do** (red) → **In Progress** (orange) → **Done** (green)

### Development Workflow
- **Backlog** (gray) → **Planning** (blue) → **Development** (orange) → **Code Review** (purple) → **Testing** (orange-red) → **Deployed** (green)

### Approval Process
- **Draft** (gray) → **Under Review** (blue) → **Needs Feedback** (orange-red) → **Approved** (green) / **Rejected** (red)

## Creating Custom State Groups

You can create custom state groups in the plugin settings:

1. Open Obsidian Settings
2. Go to TaskMaster plugin settings
3. Click "Add Group" in the State Groups section
4. Configure your custom states with:
   - Unique state ID
   - Display name
   - Color
   - Order in the progression

## Button Behavior

- **Click**: Cycles to the next state in the group
- **Visual Feedback**: Button animates when changing states
- **Persistence**: State changes are automatically saved to your markdown file
- **Responsive**: Works in both desktop and mobile views

## Tips

1. **Unique IDs**: Always use unique IDs for buttons to avoid conflicts
2. **Meaningful Names**: Use descriptive IDs and group names for better organization
3. **Consistent Groups**: Use the same group for related workflows
4. **Tables**: Buttons work great in tables for project tracking
5. **Code Blocks**: Use code blocks with language "taskmaster" for special formatting

## Troubleshooting

### Button Not Updating
- Check that the button ID is unique
- Ensure the state exists in the specified group
- Verify the syntax is correct

### States Not Showing
- Check that the state group exists in settings
- Verify the group name spelling matches exactly
- Ensure the state ID exists in the group

### Legacy Buttons
Legacy format buttons (`{{multi-state-button:id:state}}`) will continue to work and use the default state group.

## Migration from Legacy Format

To migrate from legacy format to new format:

**Old:**
```
{{multi-state-button:task1:todo}}
```

**New:**
```
{{multi-state-button:id=task1;group=default;state=todo}}
```

The plugin will automatically update the syntax when you click buttons, or you can manually update them for consistency.
