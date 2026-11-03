import type { PluginClientContext } from "@getpaseo/plugin/client";
import { MarkdownStyleSettings } from "./client/settings-screen";
import { applyMarkdownCss, removeMarkdownCss } from "./client/web";
import { messages } from "./client/messages";
import { buildMarkdownCss, readStyle } from "./shared/style";

export default function contribute(client: PluginClientContext) {
  void client
    .rpc(readStyle, {})
    .then(({ values }) => applyMarkdownCss(buildMarkdownCss(values)))
    .catch((error) => {
      console.error("[markdown-styler] failed to read style settings", error);
    });
  client.addSettingsScreen({
    id: "markdown-style",
    title: messages.message("title"),
    icon: "Palette",
    Component: MarkdownStyleSettings,
  });
  return () => removeMarkdownCss();
}
