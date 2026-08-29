/**
 * EditorBubbleMenu — the floating formatting toolbar that appears above a text
 * selection (B / I / U / Strike · Align · Link), ported from the Alltra desktop
 * editor's selection bubble. Built on TipTap's BubbleMenu plugin; icons are the
 * journal's filled Alltra set, active toggles tint with the accent. Styled as a
 * bordered rounded pill on the journal's own tokens.
 *
 * It hides while the AI rewrite menu is open (`hidden`) so the two don't stack
 * over the same selection, and never shows inside a code block or over a
 * non-text (e.g. image) selection.
 */
import { useRef } from "react";
import { BubbleMenu } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikeIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  LinkIcon,
  type EditorIcon,
} from "../editorIcons";

function BubbleBtn({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: EditorIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={"bubble-btn" + (active ? " bubble-btn--active" : "")}
      // preventDefault keeps the editor selection intact when the button takes focus
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <Icon size={17} />
    </button>
  );
}

export function EditorBubbleMenu({ editor, hidden = false }: { editor: Editor | null; hidden?: boolean }) {
  // shouldShow closes over this once; a ref keeps it reading the live value.
  const hiddenRef = useRef(hidden);
  hiddenRef.current = hidden;

  if (editor === null) return null;

  const order = ["left", "center", "right"] as const;
  const curAlign = order.find((a) => editor.isActive({ textAlign: a })) ?? "left";
  const AlignIcon = curAlign === "center" ? AlignCenterIcon : curAlign === "right" ? AlignRightIcon : AlignLeftIcon;
  const cycleAlign = (): void => {
    const next = order[(order.indexOf(curAlign) + 1) % order.length];
    editor.chain().focus().setTextAlign(next).run();
  };
  const toggleLink = (): void => {
    if (editor.isActive("link")) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const url = window.prompt("Link URL", "");
    if (url) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <BubbleMenu
      editor={editor}
      className="bubble-bar"
      tippyOptions={{ placement: "top", duration: 120, maxWidth: "none" }}
      shouldShow={({ editor: e, from, to }) => {
        if (hiddenRef.current) return false;
        if (from === to) return false;
        if (e.isActive("codeBlock")) return false;
        // hide over non-text selections (e.g. an image node) — no text to format
        if (e.state.doc.textBetween(from, to, " ", " ").trim() === "") return false;
        return true;
      }}
    >
      <BubbleBtn icon={BoldIcon} label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
      <BubbleBtn icon={ItalicIcon} label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <BubbleBtn icon={UnderlineIcon} label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} />
      <BubbleBtn icon={StrikeIcon} label="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <span className="bubble-div" aria-hidden="true" />
      <BubbleBtn icon={AlignIcon} label="Align" active={curAlign !== "left"} onClick={cycleAlign} />
      <span className="bubble-div" aria-hidden="true" />
      <BubbleBtn icon={LinkIcon} label="Link" active={editor.isActive("link")} onClick={toggleLink} />
    </BubbleMenu>
  );
}

export default EditorBubbleMenu;
