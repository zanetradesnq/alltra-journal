/**
 * Text + background color for the editor — small custom extensions so we don't
 * pull in new TipTap packages. TextColor adds a `color` attribute to the
 * existing `textStyle` mark (same approach as @tiptap/extension-color);
 * BgColor is a standalone mark that paints a tinted background behind text.
 */
import { Extension, Mark, mergeAttributes } from "@tiptap/core";

/**
 * Block-level color — `fg` (text) and `bg` (background) attributes applied to
 * whole blocks, so the block menu's Color tints the entire paragraph / list
 * item / callout (Notion-style) instead of just a text span. Nodes with a React
 * node view (callout) read these attrs themselves; plain nodes get them via
 * renderHTML below.
 */
export const BlockStyle = Extension.create({
  name: "blockStyle",
  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph",
          "heading",
          "blockquote",
          "codeBlock",
          "listItem",
          "taskItem",
        ],
        attributes: {
          fg: {
            default: null,
            parseHTML: (el) => el.style.color || null,
            renderHTML: (attrs) =>
              attrs.fg ? { style: `color: ${attrs.fg as string}` } : {},
          },
          bg: {
            default: null,
            parseHTML: (el) => el.style.backgroundColor || null,
            renderHTML: (attrs) =>
              attrs.bg
                ? {
                    style: `background-color: ${attrs.bg as string}; border-radius: 5px;`,
                  }
                : {},
          },
        },
      },
    ];
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textColor: {
      setTextColor: (color: string) => ReturnType;
      unsetTextColor: () => ReturnType;
    };
    bgColor: {
      setBgColor: (color: string) => ReturnType;
      unsetBgColor: () => ReturnType;
    };
  }
}

export const TextColor = Extension.create({
  name: "textColor",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          color: {
            default: null,
            parseHTML: (el) => el.style.color || null,
            renderHTML: (attrs) =>
              attrs.color ? { style: `color: ${attrs.color as string}` } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setTextColor:
        (color) =>
        ({ chain }) =>
          chain().setMark("textStyle", { color }).run(),
      unsetTextColor:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { color: null }).run(),
    };
  },
});

export const BgColor = Mark.create({
  name: "bgColor",
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-bg") || null,
        renderHTML: (attrs) =>
          attrs.color
            ? {
                "data-bg": attrs.color,
                style: `background-color: ${attrs.color as string}; border-radius: 3px; padding: 0.05em 0.15em;`,
              }
            : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-bg]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      setBgColor:
        (color) =>
        ({ commands }) =>
          commands.setMark(this.name, { color }),
      unsetBgColor:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
