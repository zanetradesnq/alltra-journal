/**
 * Toggle — a collapsible section. Custom block node with a React node view: a
 * chevron button (rotates / toggles open) + editable content. The first line is
 * the always-visible title; everything after it collapses when closed.
 */
import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewContent,
  NodeViewWrapper,
} from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { ChevronRight } from "lucide-react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    toggle: {
      insertToggle: () => ReturnType;
    };
  }
}

function ToggleView({ node, updateAttributes }: NodeViewProps) {
  const open = node.attrs.open !== false;
  return (
    <NodeViewWrapper className="jtoggle" data-open={open ? "true" : "false"}>
      <button
        type="button"
        contentEditable={false}
        onClick={() => updateAttributes({ open: !open })}
        title={open ? "Collapse" : "Expand"}
        className="jtoggle-chevron"
        style={{ transform: open ? "rotate(90deg)" : "none" }}
      >
        <ChevronRight size={16} />
      </button>
      <NodeViewContent className="jtoggle-content" />
    </NodeViewWrapper>
  );
}

export const Toggle = Node.create({
  name: "toggle",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (el) => el.getAttribute("data-open") !== "false",
        renderHTML: (attrs) => ({ "data-open": attrs.open ? "true" : "false" }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="toggle"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "toggle", class: "jtoggle" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleView);
  },

  addCommands() {
    return {
      insertToggle:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { open: true },
            content: [{ type: "paragraph" }],
          }),
    };
  },
});
