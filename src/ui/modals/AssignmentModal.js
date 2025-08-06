// AssignmentModal - UI for assigning people to tasks

const { Modal } = require('obsidian');

class AssignmentModal extends Modal {
  constructor(app, plugin, onAssign) {
    super(app);
    this.plugin = plugin;
    this.onAssign = onAssign;
    this.selectedPeople = [];
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Assign People to Task' });

    if (this.plugin.settings.people.length === 0) {
      contentEl.createEl('p', { text: 'No people configured. Add people in the plugin settings first.' });
      return;
    }

    contentEl.createEl('p', { text: 'Select people to assign to this task:' });

    // People checkboxes
    this.plugin.settings.people.forEach(person => {
      const checkboxContainer = contentEl.createDiv();
      checkboxContainer.style.cssText = 'display: flex; align-items: center; margin: 8px 0;';

      const checkbox = checkboxContainer.createEl('input', { type: 'checkbox' });
      checkbox.style.marginRight = '8px';
      checkbox.onchange = () => {
        if (checkbox.checked) {
          this.selectedPeople.push(person);
        } else {
          const index = this.selectedPeople.findIndex(p => p.id === person.id);
          if (index >= 0) {
            this.selectedPeople.splice(index, 1);
          }
        }
      };

      const label = checkboxContainer.createEl('label', { text: person.name });
      if (person.role) {
        label.textContent += ` (${person.role})`;
      }
      label.style.cursor = 'pointer';
      label.onclick = () => checkbox.click();
    });

    // Buttons
    const buttonContainer = contentEl.createDiv();
    buttonContainer.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;';

    const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelBtn.onclick = () => this.close();

    const assignBtn = buttonContainer.createEl('button', { text: 'Assign' });
    assignBtn.classList.add('mod-cta');
    assignBtn.onclick = () => {
      this.onAssign(this.selectedPeople);
      this.close();
    };
  }
}

module.exports = AssignmentModal;
