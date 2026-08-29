import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Connect runs on 5174 and another project owns 5173 — pin Journal to 5175
// and fail loudly (strictPort) rather than silently hopping to a free port.
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5175,
        strictPort: true,
    },
    // Keep a single copy of ProseMirror/TipTap so plugins (e.g. the "/" Suggestion)
    // attach to the same editor instance — duplicates silently break plugins.
    resolve: {
        dedupe: [
            "react",
            "react-dom",
            "@tiptap/pm",
            "prosemirror-state",
            "prosemirror-view",
            "prosemirror-model",
            "prosemirror-transform",
        ],
    },
});
