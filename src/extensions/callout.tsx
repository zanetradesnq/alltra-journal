/**
 * Callout — a colored box to pin a key insight. Custom block node with a React
 * node view holding the editable content. (No icon for now; tint controls come
 * later.)
 */
import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewContent,
  NodeViewWrapper,
} from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      insertCallout: () => ReturnType;
    };
  }
}

function CalloutView({ node }: NodeViewProps) {
  const color = (node.attrs.color as string) || "amber";
  const bg = (node.attrs.bg as string | null) || undefined;
  const fg = (node.attrs.fg as string | null) || undefined;
  // a custom bg overrides the named tint; pair it with a neutral border
  const style = bg
    ? { background: bg, borderColor: "var(--border)", color: fg }
    : { color: fg };
  return (
    <NodeViewWrapper className="jcallout" data-color={color} style={style}>
      <NodeViewContent className="jcallout-body" />
    </NodeViewWrapper>
  );
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      color: {
        default: "amber",
        parseHTML: (el) => el.getAttribute("data-color") || "amber",
        renderHTML: (attrs) => ({ "data-color": attrs.color }),
      },
      // custom background / text color set from the block menu (the node view
      // reads these and styles the box; here just for serialization)
      bg: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-bg") || null,
        renderHTML: (attrs) => (attrs.bg ? { "data-bg": attrs.bg } : {}),
      },
      fg: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-fg") || null,
        renderHTML: (attrs) => (attrs.fg ? { "data-fg": attrs.fg } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "callout", class: "jcallout" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },

  addCommands() {
    return {
      insertCallout:
        () =>
        ({ state, chain, commands }) => {
          const { from, to, empty } = state.selection;
          // empty cursor → just drop an empty callout to type into
          if (empty) {
            return commands.insertContent({
              type: this.name,
              attrs: { color: "amber" },
              content: [{ type: "paragraph" }],
            });
          }
          // clean wrap (paragraphs/headings) — keeps formatting in place
          if (commands.wrapIn(this.name, { color: "amber" })) return true;
          // fallback (list items, mixed blocks): move the SELECTED content into
          // a callout rather than deleting it
          const nodes = (state.doc.slice(from, to).content.toJSON() ??
            []) as { type?: string }[];
          const allInline =
            nodes.length > 0 &&
            nodes.every((n) => n.type === "text" || n.type === "hardBreak");
          const content =
            nodes.length === 0
              ? [{ type: "paragraph" }]
              : allInline
              ? [{ type: "paragraph", content: nodes }]
              : nodes;
          return chain()
            .deleteSelection()
            .insertContent({
              type: this.name,
              attrs: { color: "amber" },
              content,
            })
            .run();
        },
    };
  },
});
