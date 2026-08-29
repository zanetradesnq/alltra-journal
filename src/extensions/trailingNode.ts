/**
 * TrailingNode — guarantees the document always ends with an empty paragraph, so
 * you can always place the cursor and type BELOW the last block. Without it, an
 * atom block left as the final node (the trade table, an image, a banner…) traps
 * the cursor: ProseMirror has no text position after an atom, so clicking below
 * it does nothing. This is the standard ProseMirror trailing-node pattern.
 */
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Node as PMNode, NodeType } from "@tiptap/pm/model";

export interface TrailingNodeOptions {
  /** node type to append at the end (must be a textblock). */
  node: string;
  /** node names allowed to be the last node — no paragraph is appended after these. */
  notAfter: string[];
}

function isAllowedLast(node: PMNode | null, allowed: NodeType[]): boolean {
  return !!node && allowed.some((t) => t === node.type);
}

export const TrailingNode = Extension.create<TrailingNodeOptions>({
  name: "trailingNode",

  addOptions() {
    return { node: "paragraph", notAfter: ["paragraph"] };
  },

  addProseMirrorPlugins() {
    const key = new PluginKey<boolean>(this.name);
    const allowed = Object.values(this.editor.schema.nodes).filter((n) =>
      this.options.notAfter.includes(n.name),
    );

    return [
      new Plugin<boolean>({
        key,
        appendTransaction: (_transactions, _oldState, state) => {
          if (!key.getState(state)) return null;
          const type = state.schema.nodes[this.options.node];
          if (!type) return null;
          return state.tr.insert(state.doc.content.size, type.create());
        },
        state: {
          init: (_config, state) => !isAllowedLast(state.doc.lastChild, allowed),
          apply: (tr, value) => {
            if (!tr.docChanged) return value;
            return !isAllowedLast(tr.doc.lastChild, allowed);
          },
        },
      }),
    ];
  },
});
