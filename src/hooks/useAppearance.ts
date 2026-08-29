import { useEffect, useState } from "react";

/**
 * Returns the active appearance ('light' | 'dark') by reading data-theme on
 * <html>. Journal ships light; this stays in sync if the attribute changes.
 */
export function useAppearance(): "light" | "dark" {
  // Light-family = light + slate; everything else (dark, onyx, amber, iris) is dark.
  const read = (): "light" | "dark" => {
    if (typeof document === "undefined") return "light";
    const t = document.documentElement.getAttribute("data-theme");
    return t === "light" || t === "slate" ? "light" : "dark";
  };

  const [appearance, setAppearance] = useState<"light" | "dark">(read);

  useEffect(() => {
    const obs = new MutationObserver(() => setAppearance(read()));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, []);

  return appearance;
}
