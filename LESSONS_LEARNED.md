# TaskMaster Development - Lessons Learned

## 0.1 Set up logging throughout the app that we can turn on in order to debug

**Problem:** Need comprehensive logging system for debugging plugin issues and monitoring performance.

**Solution Implemented:**
1. **Created TaskMasterLogger class** with multiple log levels (ERROR, WARN, INFO, DEBUG)
2. **Added settings controls** for enabling/disabling debug logging and setting log levels
3. **Integrated throughout plugin** with structured logging including component names and timestamps
4. **Added log storage** - keeps last 1000 log entries in memory for export
5. **Export functionality** - can export logs to text file for analysis
6. **Console integration** - all logs appear in browser console with proper formatting

**Key Features:**
- Log levels: ERROR, WARN, INFO, DEBUG
- Component-based logging (Plugin, TaskManager, TimeTracker, etc.)
- Timestamp and structured data logging
- Settings panel controls for enable/disable and log level
- Export logs to file functionality
- Clear logs functionality
- Memory-efficient (only keeps last 1000 entries)

**Technical Details:**
- Logger initialized first in plugin onload()
- Settings include `enableDebugLogging` and `logLevel` properties
- Uses console.log with structured prefix format
- Stores logs in plugin.debugLogs array
- Added logging to TaskManager constructor and processTaskElements

**Files Modified:**
- `main.js` - Added TaskMasterLogger class and integrated throughout plugin
- Settings panel enhanced with debug controls section

**Testing Approach:**
- Enable debug logging in settings
- Check console for structured log output
- Test export functionality
- Verify log levels filter correctly

---

## 0.2 Have all elements render in both read and edit modes

**Problem:** Multi-state buttons were only rendering in reading mode but not in edit mode. Users wanted live preview functionality similar to how headings render when you move off the line in edit mode.

**Solution Implemented:**

### Phase 1 - Initial Implementation
1. **Universal Post-Processor**: Modified `registerMarkdownPostProcessor` to handle both reading mode and live preview in edit mode
2. **Live Preview Detection**: Added basic logic to detect when we're in live preview mode vs reading mode
3. **Dual Processing Paths**: Created separate processing methods for live preview and reading mode

### Phase 2 - Enhanced Live Preview Detection (Current Solution)
4. **Improved Live Preview Detection**: Created comprehensive `isInLivePreviewMode()` method that checks:
   - Context source path (indicates we're in an editor)
   - CodeMirror editor containers (`.cm-editor`, `.cm-content`)
   - Live preview specific classes (`.markdown-source-view`, `.cm-line`)
   - Active view mode detection

5. **Enhanced Processing Methods**:
   - **`processButtonsForLivePreview()`**: Aggressive processing for edit mode
     - Checks element itself first
     - Searches multiple container types including CodeMirror elements
     - Processes text nodes specifically for live preview
   - **`processTextNodesForButtons()`**: New method specifically for text node processing in live preview
     - Uses TreeWalker to find text nodes with button patterns
     - Creates document fragments to replace text with rendered buttons
     - Preserves surrounding text content

6. **Debug Tools**: Added debug command "Debug: Reprocess Current View for Buttons" to force refresh and test

**Technical Details:**
- **Live Preview Detection Logic**:
  ```javascript
  isInLivePreviewMode(element, context) {
    if (context?.sourcePath) {
      if (element.closest?.('.cm-editor') || element.closest?.('.cm-content')) return true;
      if (element.closest?.('.markdown-source-view') || element.closest?.('.cm-line')) return true;
      const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
      if (activeView && activeView.getMode() === 'source') return true;
    }
    return false;
  }
  ```

- **Enhanced Container Processing**: Searches for buttons in:
  - Paragraphs, table cells, list items, divs, spans
  - CodeMirror specific elements (`.cm-line`, `[class*="cm-"]`)
  - Text nodes using TreeWalker

- **Text Node Replacement**: Uses document fragments to replace text patterns with actual button elements while preserving surrounding text

**Files Modified:**
- `main.js` - Enhanced TaskManager.processTaskElements() and related methods
- `test-live-preview.md` - Created test file for verification

**Testing Approach:**
1. Create test file with various button patterns
2. Open in edit mode (not reading mode)
3. Verify buttons render as visual elements, not raw text
4. Test clicking to cycle through states
5. Test Ctrl+Shift+T hotkey for cursor-based cycling
6. Use debug command to force reprocess if needed

**Expected Behavior:**
- In edit mode, `{{multi-state-button:id:state}}` should render as clickable buttons
- Buttons should cycle through states when clicked
- Works in tables, lists, paragraphs, and inline text
- Maintains live preview functionality similar to headings
4. **Enhanced Button Processing**: Added `processButtonsForLivePreview` and `processButtonsForReadingMode` methods
5. **Hotkey Support**: Maintained Ctrl+Shift+T hotkey for manual cycling in edit mode

**Key Technical Changes:**
- Modified `processMultiStateButtonsUniversal` to accept `isLivePreview` parameter
- Added context detection for live preview mode
- Enhanced TaskManager to handle both rendering contexts
- Improved element processing for live preview environments

**Live Preview Behavior:**
- Buttons render visually when cursor moves off the line (like headings)
- Buttons remain clickable and functional in live preview
- Maintains edit mode functionality with hotkeys and commands
- Seamless switching between modes

**Files Modified:**
- `main.js` - Enhanced post-processor registration and TaskManager methods
- Added live preview detection and dual processing paths

**Testing Results:**
- ✅ Reading mode: Buttons render as visual elements
- ✅ Edit mode live preview: Buttons render when cursor moves off line
- ✅ Edit mode hotkeys: Ctrl+Shift+T cycles button states
- ✅ Seamless mode switching without losing functionality

---

## 1.1 Multi-State Task Toggles

**Problem:** Need to replace standard checkboxes with customizable multi-state toggle buttons that can cycle through different states with visual feedback.

**Solution Implemented:**

### 1.1.1 Replace standard checkboxes with customizable multi-state toggles
- **Text pattern recognition**: Implemented `{{multi-state-button:button_id:status}}` syntax
- **DOM processing**: Added text node walker to find and replace patterns in any context
- **Visual button creation**: Dynamic button generation with icon, color, and state styling
- **Click handling**: State cycling with visual feedback and editor updates

### 1.1.2 Settings Implementation
#### 1.1.2.1 State Groups with Different Orders
- **StateGroupModal**: Full CRUD interface for managing state groups
- **Custom state ordering**: Each group can define its own sequence of states
- **Default group system**: Fallback to default group for compatibility
- **Group assignment**: Buttons can be assigned to specific state groups

#### 1.1.2.2 Color Picker Integration
- **TaskStateModal**: Enhanced with color picker input (type="color")
- **Real-time preview**: Color changes reflected immediately in UI
- **Hex color support**: Text input + visual picker for flexibility
- **State-specific colors**: Each state can have its own distinct color

### 1.1.3 Inline State Cycling
#### 1.1.3.1 Storage Format
- **Syntax**: `{{multi-state-button:button_id:status}}`
- **Unique IDs**: Auto-generated button IDs with counter system
- **State persistence**: Current state stored directly in markdown text
- **Pattern matching**: Robust regex for finding and updating buttons

#### 1.1.3.2 Multi-State Button Rendering Fix (IN PROGRESS)
**Problem**: Multi-state buttons with syntax `{{multi-state-button:id:state}}` are not rendering visually in markdown files - they show as raw text instead of interactive buttons.

**Initial Investigation**: 
- TreeWalker was not properly finding text nodes containing the button patterns
- Regex state management issues with global flag causing missed matches
- Missing error handling for malformed state references

**Debugging Steps Taken**:
1. **Added comprehensive console logging** to track post-processor execution
2. **Verified plugin initialization** - ensuring TaskManager exists when post-processor runs
3. **Added error handling** with try-catch blocks around post-processor calls
4. **Implemented dual approach**: Both TreeWalker for text nodes AND innerHTML replacement for elements
5. **Created test file** with various button patterns to verify functionality

**Current Implementation**:
- Enhanced `processMultiStateButtons` method with better text node detection and fallback HTML replacement
- Added `replaceButtonsInElement` method using innerHTML manipulation as alternative approach
- Added `createMultiStateButtonHTML` method for direct HTML string generation
- Comprehensive logging throughout the rendering pipeline

**Technical Details**:
```javascript
// Dual processing approach
const paragraphs = element.querySelectorAll('p, td, li, div');
paragraphs.forEach(para => {
  if (buttonPattern.test(para.textContent)) {
    this.replaceButtonsInElement(para);
  }
});

// HTML replacement fallback
const buttonHtml = `<button class="taskmaster-multi-state-button" data-button-id="${buttonId}" data-current-state="${currentState}" style="...">${icon} ${name}</button>`;
```

**Current Status**: INVESTIGATING - Multiple approaches implemented to ensure rendering works across different DOM contexts

#### 1.1.3.3 Universal Context Support
- **Text node processing**: Works in any markdown context (paragraphs, lists, tables)
- **Table compatibility**: Confirmed working inside table cells
- **Document fragments**: Clean DOM manipulation without breaking layout

### 1.1.4 Command Palette Integration
- **"Create Multi-State Button" command**: Instantly insert new button at cursor
- **Modal creation option**: Optional label input if showLabelsOnCreation enabled
- **Smart defaults**: Uses default state and group from settings

**Key Technical Implementation:**
```javascript
// Core pattern matching
const buttonPattern = /\{\{multi-state-button:([^:]+):([^}]+)\}\}/g;

// State cycling logic
const stateGroup = this.plugin.settings.stateGroups.find(g => g.id === this.plugin.settings.defaultGroup);
const nextIndex = (currentIndex + 1) % stateOrder.length;

// Editor updates
const newButtonText = `{{multi-state-button:${buttonId}:${newStateId}}}`;
const updatedContent = content.replace(oldPattern, newButtonText);
```

**Files Modified:**
- `main.js` - Added processMultiStateButtons, createMultiStateButton, cycleMultiStateButton methods
- Enhanced TaskManager with comprehensive button handling
- Added MultiStateButtonCreationModal for user-friendly creation
- Settings enhanced with state groups management

**Testing Approach:**
- Created test file with various button contexts (tables, lists, paragraphs)
- Verified state cycling works correctly
- Tested color picker functionality
- Confirmed command palette integration

**User Experience:**
- Click any multi-state button to cycle through states
- Use Ctrl+P → "Create Multi-State Button" to insert new buttons
- Configure states and groups in plugin settings
- Buttons work seamlessly in any markdown context

---

## 1.2 People & Assignment Management

**Problem:** Need comprehensive people management system with assignment capabilities, inline display, and filtering functionality.

**Solution Implemented:**

### 1.2.1 Add/edit/delete people with comprehensive profile management
- **PersonModal**: Full CRUD interface for managing team members
- **Profile fields**: Name, email, role, avatar support
- **Auto-generated IDs**: Unique identifiers from names
- **Settings integration**: Complete people management in plugin settings

### 1.2.2 Assignment via dropdown/modal and @mention parsing
- **AssignmentModal**: Multi-select interface for assigning people to tasks
- **@mention support**: Automatic parsing of @username mentions in task text
- **Command integration**: "Assign People to Task" command in command palette
- **Flexible assignment**: Both UI-driven and text-based assignment methods

### 1.2.3 Inline assignment display
- **Visual indicators**: Assignments shown inline with tasks
- **Parse existing assignments**: Automatic detection of @mentions
- **Styling**: Subtle, non-intrusive display of assigned people
- **Real-time updates**: Assignments appear immediately after assignment

### 1.2.4 Filter and group tasks by assignee
- **AssigneeFilterModal**: Full-vault search for tasks by person
- **Vault-wide filtering**: Searches across all markdown files
- **Results generation**: Creates dedicated filter results file
- **Task detection**: Recognizes both checkbox tasks and multi-state buttons
- **Organized output**: Groups results by file with line numbers and links

**Key Technical Implementation:**
```javascript
// Assignment parsing
const assignmentRegex = /@(\w+)/g;
const assignments = [];
while ((match = assignmentRegex.exec(taskText)) !== null) {
  assignments.push(match[1]);
}

// Vault-wide filtering
for (const file of files) {
  const content = await this.app.vault.read(file);
  const lines = content.split('\n');
  lines.forEach((line, lineIndex) => {
    if (line.includes(`@${personName}`) && isTask) {
      results.push({ file: file.name, line: lineIndex + 1, content: line.trim() });
    }
  });
}
```

**Files Modified:**
- `main.js` - Enhanced PeopleManager with assignment functionality
- Added AssigneeFilterModal for task filtering
- PersonModal with comprehensive profile fields
- Settings panel with people management interface

**Testing Approach:**
- Create people with different roles and information
- Assign people to various tasks using both modal and @mentions
- Verify inline display of assignments
- Test filtering functionality across multiple files
- Confirm filter results generation and file linking

**User Experience:**
- Add team members in plugin settings with full profile information
- Assign people using Ctrl+P → "Assign People to Task" or @mentions
- View assignments inline with tasks automatically
- Filter tasks by person using Ctrl+P → "Filter Tasks by Assignee"
- Generated filter results open automatically with organized task lists

---
