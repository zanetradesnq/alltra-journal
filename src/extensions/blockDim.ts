/**
 * BlockDim — while a block is being drag-reordered we fade the block being
 * lifted so the floating ghost reads as "the moving copy". ProseMirror owns its
 * content DOM and reverts any class we set directly on a node, so the fade is
 * applied as a node Decoration instead (which PM redraws and keeps). Toggle it
 * with setDimmedBlock(view, pos) / clearDimmedBlock(view).
 */
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const blockDimKey = new PluginKey<DecorationSet>("blockDim");

export const BlockDim = Extension.create({
  name: "blockDim",
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: blockDimKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const meta = tr.getMeta(blockDimKey) as number | null | undefined;
            if (meta === undefined) {
              // self-heal: the dim only needs to live through a drag, and a drag
              // never changes the doc — so any doc change means the drag is over
              // and a surviving dim is stale (lost pointerup, alt-tab mid-drag).
              // Without this a block can stay greyed out indefinitely.
              if (tr.docChanged && old.find().length) return DecorationSet.empty;
              return old.map(tr.mapping, tr.doc);
            }
            if (meta === null) return DecorationSet.empty; // clear
            const node = tr.doc.nodeAt(meta);
            if (!node) return DecorationSet.empty;
            return DecorationSet.create(tr.doc, [
              Decoration.node(meta, meta + node.nodeSize, { class: "block-dragging" }),
            ]);
          },
        },
        props: {
          decorations(state) {
            return blockDimKey.getState(state);
          },
        },
      }),
    ];
  },
});

/** Fade the top-level block at `pos` (the one being lifted). */
export function setDimmedBlock(view: EditorView, pos: number): void {
  view.dispatch(view.state.tr.setMeta(blockDimKey, pos));
}

/** Remove the drag fade. */
export function clearDimmedBlock(view: EditorView): void {
  if (!blockDimKey.getState(view.state)?.find().length) return; // nothing to clear
  view.dispatch(view.state.tr.setMeta(blockDimKey, null));
}
