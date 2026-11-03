# Markdown Styler

A [Paseo](https://paseo.sh) plugin that adjusts how rendered Markdown looks in the Paseo app — heading sizes, bold and highlight colors, optional heading level indicators and custom CSS — without replacing the built-in renderer. The settings page includes a live preview rendered through Paseo's own Markdown pipeline.

## Install

```bash
paseo plugin add Moyf/paseo-markdown-styler
```

Or install from a local checkout:

```bash
paseo plugin install /absolute/path/to/paseo-markdown-styler
```

## Development

```bash
npm install
npm run typecheck
paseo plugin reload paseo-markdown-styler
```

The plugin is client-side only: `index.server.ts` exists to persist settings and serve them to clients. CSS injection applies on desktop and browser clients; the ==highlight== syntax requires the Moyf Paseo build's parser support and is detected automatically.
