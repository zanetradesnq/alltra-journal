/**
 * ListExit — makes Enter/Backspace behave sanely around empty list items.
 *
 *  • Enter on an empty item  → exit the list (lift it to a paragraph).
 *  • Backspace on an empty item →
 *       - first item of its list → lift it out;
 *       - otherwise → defer to the default joinBackward, which merges it into
 *         the previous item.
 *
 * Why not just lift on Backspace too? Lifting a non-first item drops it to a
 * paragraph AFTER the list, and ProseMirror's joinBackward on the next keypress
 * re-absorbs that paragraph back into the list — an infinite lift/join
 * oscillation where deleting "does nothing". Deferring to joinBackward for
 * non-first items merges up cleanly and terminates.
 *
 * Everything else (typing, in-word Backspace, range/forward delete) returns
 * false and falls through to ProseMirror's defaults.
 */
import { Extension } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";

const LIST_ITEMS = new Set(["listItem", "taskItem"]);

// nearest enclosing list item + the depth it sits at, or null
function enclosingItem(state: EditorState) {
  const { $from } = state.selection;
  for (let d = $from.depth; d >= 1; d--) {
    if (LIST_ITEMS.has($from.node(d).type.name))
      return { node: $from.node(d), depth: d };
  }
  return null;
}

export const ListExit = Extension.create({
  name: "listExit",
  priority: 1000, // run before StarterKit's list keymap

  addKeyboardShortcuts() {
    const enterExit = (): boolean => {
      const { state, commands } = this.editor;
      if (!state.selection.empty) return false;
      const item = enclosingItem(state);
      if (!item || item.node.textContent.length !== 0) return false;
      return commands.liftListItem(item.node.type.name);
    };

    const backspaceMerge = (): boolean => {
      const { state, commands } = this.editor;
      if (!state.selection.empty) return false;
      const item = enclosingItem(state);
      if (!item || item.node.textContent.length !== 0) return false;
      // not the first item → let the default joinBackward merge it upward
      if (state.selection.$from.index(item.depth - 1) > 0) return false;
      return commands.liftListItem(item.node.type.name);
    };

    return {
      Enter: enterExit,
      Backspace: backspaceMerge,
    };
  },
});
