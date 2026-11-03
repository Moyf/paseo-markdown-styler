Markdown Styler adjusts how rendered Markdown looks in the Paseo app without replacing the built-in renderer. It injects a small stylesheet on web clients (desktop and browser) that covers chat replies, file previews, plan cards and other Markdown surfaces.

Unlike chat-replacement plugins (Beautiful Chat, Better Paseo), it keeps Paseo's native chat view as the renderer and only styles its output, so upstream rendering features land immediately on Paseo updates instead of waiting for plugin re-implementation.

A live preview on the settings page renders sample headings, bold text and highlights through Paseo's own Markdown pipeline, so every change shows before leaving the page.

## What it can change

- Heading sizes for H1 to H3 in preset steps, or following the theme per level.
- Heading, bold, and highlight colors. Solid swatches cover text colors; translucent tints cover the highlight background. Custom values accept #RRGGBB and #RRGGBBAA.
- Heading level indicators: an optional # / ## / ### marker before each heading, default off.
- Custom CSS appended after the generated rules, written in a multi-line editor with drag-to-resize.

Swatch taps and size and toggle changes apply immediately; custom color values and custom CSS use a save button.

## How it works

The plugin generates one stylesheet from the settings and injects it into the app document. It styles the elements the built-in renderer produces; it never replaces that renderer, so Mermaid diagrams, file links, images and selection behavior are unaffected. Settings persist on the daemon, so every connected client reads the same values.

## Requirements and limits

CSS injection applies on desktop and browser clients only. The settings save on every platform, but phone rendering is unchanged.

The ==highlight== syntax depends on parser support that currently ships only in the Moyf Paseo build. The settings page detects this automatically by rendering a sample: on clients without support, the highlight color settings hide and the preview shows the syntax as typed. Heading, bold and custom CSS settings work in any Paseo build.

Removing the plugin removes the injected stylesheet.
