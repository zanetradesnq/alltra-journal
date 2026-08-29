/**
 * Extends TaskList with a `variant` attribute so a list created via the
 * "Checklist" command (variant="checklist") strikes through checked items,
 * while a plain "To-do list" does not. setChecklistVariant() stamps the
 * current task list as a checklist.
 */
import TaskList from "@tiptap/extension-task-list";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    checklistVariant: {
      setChecklistVariant: () => ReturnType;
      unsetChecklistVariant: () => ReturnType;
    };
  }
}

export const TaskListVariant = TaskList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      variant: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-variant"),
        renderHTML: (attrs) =>
          attrs.variant ? { "data-variant": attrs.variant } : {},
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setChecklistVariant:
        () =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { variant: "checklist" }),
      unsetChecklistVariant:
        () =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { variant: null }),
    };
  },
});
