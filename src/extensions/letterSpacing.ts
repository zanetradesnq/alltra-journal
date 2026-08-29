import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    letterSpacing: {
      setLetterSpacing: (value: string) => ReturnType;
      unsetLetterSpacing: () => ReturnType;
    };
  }
}

/**
 * Adds a `letterSpacing` attribute to the TextStyle mark so tracking can be
 * applied to a selection (not the whole document) — mirrors FontSize exactly.
 * Requires @tiptap/extension-text-style.
 */
export const LetterSpacing = Extension.create({
  name: "letterSpacing",

  addOptions() {
    return { types: ["textStyle"] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          letterSpacing: {
            default: null,
            parseHTML: (element) => element.style.letterSpacing || null,
            renderHTML: (attributes) =>
              attributes.letterSpacing
                ? { style: `letter-spacing: ${attributes.letterSpacing}` }
                : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLetterSpacing:
        (value) =>
        ({ chain }) =>
          chain().setMark("textStyle", { letterSpacing: value }).run(),
      unsetLetterSpacing:
        () =>
        ({ chain }) =>
          chain()
            .setMark("textStyle", { letterSpacing: null })
            .removeEmptyTextStyle()
            .run(),
    };
  },
});
