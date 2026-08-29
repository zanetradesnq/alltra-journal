/**
 * Nikki — a MOCK AI chat panel (prototype placeholder). Slides in from the right
 * like the real Alltra assistant would. On open it auto-sends "Help me write my
 * journal entry" and shows a thinking indicator — no real AI, clearly a mock.
 * Wires to real Alltra AI at transfer.
 */
import { useEffect, useRef, useState } from "react";
import { X, ArrowUp } from "lucide-react";
import { IntelligenceMark } from "./IntelligenceMark";

type Msg = { role: "user" } & { text: string };

const AUTO_PROMPT = "Help me write my journal entry";

export function NikkiPanel({
  open,
  onClose,
  assistantName,
}: {
  open: boolean;
  onClose: () => void;
  assistantName: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);

  // auto-send the starter prompt each time the panel opens
  useEffect(() => {
    if (open) {
      setMessages([{ role: "user", text: AUTO_PROMPT }]);
      setThinking(true);
      setInput("");
    }
  }, [open]);

  // close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [messages, thinking]);

  const send = () => {
    const t = input.trim();
    if (!t) return;
    setMessages((m) => [...m, { role: "user", text: t }]);
    setInput("");
    setThinking(true); // mock — no real reply
  };

  return (
    <>
      {/* backdrop */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-[640] bg-black/20"
          style={{ animation: "fadeIn 0.2s ease" }}
        />
      )}

      {/* panel */}
      <aside
        className={
          "fixed right-0 top-0 z-[650] flex h-full w-[380px] max-w-[92vw] flex-col border-l border-border bg-card shadow-lg transition-transform duration-300 " +
          (open ? "translate-x-0" : "translate-x-full")
        }
        style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
        aria-hidden={!open}
      >
        {/* header */}
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
          <span className="grid h-7 w-7 place-items-center rounded-[10px] bg-[var(--alltra-brand)] text-white">
            <IntelligenceMark size={15} />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-[13.5px] font-semibold text-text">{assistantName}</p>
            <p className="text-[11px] text-text-faint">AI journaling assistant</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-[10px] text-text-muted transition-colors hover:bg-[var(--hover-overlay)] hover:text-text"
          >
            <X size={17} />
          </button>
        </div>

        {/* messages */}
        <div
          ref={bodyRef}
          className="hide-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
        >
          {messages.map((m, i) => (
            <div key={i} className="flex justify-end">
              <div className="max-w-[80%] rounded-[14px] rounded-br-md bg-[var(--alltra-brand)] px-3 py-2 text-[13px] leading-relaxed text-white">
                {m.text}
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-[14px] rounded-bl-md bg-[var(--hover-overlay)] px-3 py-2.5 text-[12.5px] text-text-muted">
                <span className="flex items-center gap-1">
                  <Dot d={0} />
                  <Dot d={0.15} />
                  <Dot d={0.3} />
                </span>
                {assistantName} is thinking…
              </div>
            </div>
          )}

          <p className="pt-1 text-center text-[11px] text-text-faint">
            Mock preview — {assistantName} connects to Alltra AI at launch.
          </p>
        </div>

        {/* input */}
        <div className="border-t border-border p-3">
          <div className="flex items-end gap-2 rounded-[14px] border border-border bg-card-hover px-3 py-2">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={`Message ${assistantName}…`}
              className="hide-scrollbar max-h-28 flex-1 resize-none bg-transparent text-[13px] text-text outline-none placeholder:text-text-faint"
            />
            <button
              onClick={send}
              disabled={!input.trim()}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] bg-[var(--alltra-brand)] text-white transition-opacity disabled:opacity-30"
            >
              <ArrowUp size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function Dot({ d }: { d: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full bg-text-faint"
      style={{ animation: `nikkiBlink 1s ${d}s infinite ease-in-out` }}
    />
  );
}

