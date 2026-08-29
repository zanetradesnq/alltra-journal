/**
 * Badge — a full-opacity inline fill mark (the solid sibling of BgColor's
 * low-alpha highlight wash), ported from the Alltra desktop editor's Badge.
 * Renders the selected run as a solid accent pill with white text; Highlight
 * and Badge are mutually exclusive (the context menu strips the other first).
 */
import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    badge: {
      setBadge: (color: string) => ReturnType;
      unsetBadge: () => ReturnType;
    };
  }
}

export const Badge = Mark.create({
  name: "badge",
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-badge") || null,
        renderHTML: (attrs) =>
          attrs.color
            ? {
                "data-badge": attrs.color,
                style: `background-color: ${attrs.color as string}; color: #fff; border-radius: 5px; padding: 0.05em 0.4em; font-weight: 500;`,
              }
            : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-badge]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      setBadge:
        (color) =>
        ({ commands }) =>
          commands.setMark(this.name, { color }),
      unsetBadge:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
