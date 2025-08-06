# Inputs and State Management Design

This document describes how input elements (such as multi-state buttons, toggles, etc.) store and manage their state within the TaskMaster application, focusing on scalability, flexibility, and ease of configuration.

---

## 1. Storage Strategy Overview

### Each Input (in Markdown, Frontmatter, or Central JSON)
- **Unique ID:** Each input has a unique identifier.
- **Group/Type:** (Optional) Links the input to a group of states/settings defined in a central config.
- **Current Value/State:** The input’s current value or state.

**Example (inline syntax):**
```
{{multi-state-button:id=btn123;group=workflow;state=in_progress}}
```

**Example (frontmatter or JSON):**
```yaml
inputs:
  - id: btn123
    type: multi-state-button
    group: workflow
    state: in_progress
```

---

## 2. Central Settings/Config (Plugin Data File)

The central config acts as the single source of truth for state groups, their order, labels, and colors. This enables updating state definitions globally for all buttons in a group.

**Example (settings.json):**
```json
{
  "multiStateGroups": {
    "workflow": {
      "states": ["todo", "in_progress", "blocked", "done"],
      "colors": {
        "todo": "#bbb",
        "in_progress": "#ff0",
        "blocked": "#f00",
        "done": "#0f0"
      }
    },
    "approval": {
      "states": ["draft", "review", "approved", "rejected"],
      "colors": {
        "draft": "#ccc",
        "review": "#0af",
        "approved": "#0f0",
        "rejected": "#f00"
      }
    }
  }
}
```

---

## 3. Input Rendering and State Cycling

- When rendering or cycling an input (e.g., a multi-state button), the group is looked up in the central config to:
  - Retrieve the state order, labels, and colors.
  - Determine the “next” state in the group’s array.
- Any change to the group’s states (order, labels, colors) is immediately reflected across all inputs referencing that group.

---

## 4. Benefits

- **Consistency:** All inputs in a group update together when the group’s settings are changed.
- **Configurability:** Multiple groups support different workflows and input types.
- **Extensibility:** New input types (e.g., dropdowns, status selectors) can follow the same pattern.

---

## 5. Example: Next State Logic (Pseudocode)

```javascript
function getNextState(currentState, groupName, centralConfig) {
  const states = centralConfig.multiStateGroups[groupName].states;
  const idx = states.indexOf(currentState);
  return states[(idx + 1) % states.length];
}
```

---

## 6. Summary

- Store: `id`, `group`, and `state` on each input element.
- Lookup: Group definitions (states, colors, order) in a central config.
- Render & Update: Always use the latest group config for display and cycling.
- Change group config: All inputs referencing that group update instantly.

---

## 7. Extending to Other Inputs

Other input types (toggles, dropdowns, checkboxes) can use the same approach:
- Store a unique `id`, a `type`, and the current `value` or `state`.
- Reference configuration and options in the central config as needed.

---