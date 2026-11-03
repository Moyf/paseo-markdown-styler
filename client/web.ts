import { Platform } from "react-native";

// This plugin typechecks without the DOM library. Declare only what this module uses.
declare const document: {
  head: { appendChild(node: StyleNode): unknown };
  createElement(tag: "style"): StyleNode;
};

interface StyleNode {
  id: string;
  textContent: string;
  remove(): void;
}

interface ProbeElement {
  querySelectorAll(selectors: string): { length: number };
}

let styleNode: StyleNode | null = null;

/** Replace the injected Markdown stylesheet. No-op away from the browser. */
export function applyMarkdownCss(css: string): void {
  if (Platform.OS !== "web") return;
  if (!css) {
    removeMarkdownCss();
    return;
  }
  if (!styleNode) {
    styleNode = document.createElement("style");
    styleNode.id = "paseo-markdown-styler";
    document.head.appendChild(styleNode);
  }
  styleNode.textContent = css;
}

export function removeMarkdownCss(): void {
  if (Platform.OS !== "web") return;
  styleNode?.remove();
  styleNode = null;
}

/** Count <mark> descendants; powers the highlight-support probe (web only). */
export function countDescendantMarks(container: unknown): number {
  if (Platform.OS !== "web") return 0;
  // The web View ref is the host element; plugin-side types cannot express DOM nodes.
  const element = container as ProbeElement | null;
  return element?.querySelectorAll("mark").length ?? 0;
}
