import type { PluginServerContext } from "@getpaseo/plugin/server";
import { preferences, readStyle } from "./shared/style";

export default function contribute(server: PluginServerContext) {
  const settings = server.registerSettings(preferences);
  server.handle(readStyle, async () => {
    const state = await settings.read();
    return { values: state.status === "ready" ? state.values : preferences.schema.parse({}) };
  });
  return () => {};
}
