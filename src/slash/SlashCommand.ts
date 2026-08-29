/**
 * The "/" SlashCommand TipTap extension. Wraps @tiptap/suggestion:
 *  - triggers on "/" in any non-code textblock.
 *  - items come from the filter registry; selecting one runs its block command.
 *  - the popup is a ReactRenderer mounted on document.body, hand-positioned at
 *    the caret rect (no tippy dependency); keydown is forwarded to the menu;
 *    Esc hides it.
 */
import { Extension } from "@tiptap/core";
import type { Editor, Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import {
  SlashCommandMenu,
  type SlashCommandMenuHandle,
} from "./SlashCommandMenu";
import {
  SLASH_COMMANDS,
  filterCommands,
  type SlashCommand as SlashCommandItem,
} from "./commands";
import { placePopover } from "../lib/popover";

function positionPopup(
  popup: HTMLElement,
  clientRect: (() => DOMRect | null) | null | undefined
): void {
  const rect = clientRect?.();
  if (!rect) return;
  const menu = popup.firstElementChild as HTMLElement | null;
  const popH = menu?.offsetHeight ?? 340;
  const popW = menu?.offsetWidth ?? 290;
  // Fixed positioning → pure viewport coords. Shared helper flips above the
  // caret when there's no room below and clamps on-screen.
  const { x, y } = placePopover(rect, popW, popH, { prefer: "below", gap: 6 });
  popup.style.left = `${String(x)}px`;
  popup.style.top = `${String(y)}px`;
}

export interface SlashFavorites {
  getIds: () => string[];
  onToggle: (commandId: string, favorite: boolean) => void;
}

export const SlashCommand = Extension.create<{ favorites: SlashFavorites }>({
  name: "slashCommand",

  addOptions() {
    return {
      favorites: { getIds: () => [], onToggle: () => {} },
    };
  },

  addProseMirrorPlugins() {
    const favorites = this.options.favorites;
    // Merge the LIVE favorite state into the menu's props (seeded on open).
    const withFavorites = (props: object): object => ({
      ...props,
      favoriteIds: favorites.getIds(),
      onToggleFavorite: favorites.onToggle,
    });
    return [
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        char: "/",
        // Any non-code textblock (Suggestion only triggers at line start / after
        // whitespace, so "and/or" won't fire it).
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          return (
            $from.parent.isTextblock &&
            $from.parent.type.name !== "codeBlock"
          );
        },
        items: ({ query }) => filterCommands(SLASH_COMMANDS, query),
        command: ({ editor, range, props }) => {
          (props as SlashCommandItem).run(editor as Editor, range as Range);
        },
        render: () => {
          let component: ReactRenderer<SlashCommandMenuHandle> | null = null;
          let popup: HTMLDivElement | null = null;

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashCommandMenu, {
                props: withFavorites(props),
                editor: props.editor,
              });
              popup = document.createElement("div");
              popup.style.position = "fixed";
              popup.style.zIndex = "10001";
              popup.appendChild(component.element);
              document.body.appendChild(popup);
              positionPopup(popup, props.clientRect);
            },
            onUpdate: (props) => {
              component?.updateProps(withFavorites(props));
              if (popup) {
                popup.style.display = "";
                positionPopup(popup, props.clientRect);
              }
            },
            onKeyDown: (props) => {
              if (props.event.key === "Escape") {
                if (popup) popup.style.display = "none";
                return true;
              }
              return component?.ref?.onKeyDown(props.event) ?? false;
            },
            onExit: () => {
              popup?.remove();
              popup = null;
              component?.destroy();
              component = null;
            },
          };
        },
      }),
    ];
  },
});
