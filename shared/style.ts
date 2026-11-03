import { defineRpc, defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

/** Empty string means "follow the theme". Otherwise #RRGGBB or #RRGGBBAA (tints). */
export const colorOrEmpty = z.union([
  z.literal(""),
  z.string().regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/),
]);
export const COLOR_PATTERN = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

export const markdownStyleSchema = z.object({
  enabled: z.boolean().default(true),
  /** Heading font sizes in px. 0 keeps the theme's size. */
  h1Size: z.number().int().min(0).max(64).default(0),
  h2Size: z.number().int().min(0).max(64).default(0),
  h3Size: z.number().int().min(0).max(64).default(0),
  /** Show # / ## / ### level markers before headings. */
  headingLevelIndicators: z.boolean().default(false),
  headingColor: colorOrEmpty.default(""),
  boldColor: colorOrEmpty.default(""),
  highlightBackground: colorOrEmpty.default(""),
  highlightTextColor: colorOrEmpty.default(""),
  customCss: z.string().max(8000).default(""),
});

export type MarkdownStyleValues = z.output<typeof markdownStyleSchema>;

export const preferences = defineSettings({
  id: "markdown-style",
  scope: "host",
  version: 1,
  schema: markdownStyleSchema,
});

export const readStyle = defineRpc({
  name: "markdown-styler.read",
  input: z.object({}),
  output: z.object({ values: markdownStyleSchema }),
});

export const defaultStyleValues = (): MarkdownStyleValues => markdownStyleSchema.parse({});

/** Heading size presets in px, keyed 小/中/大/特大. 0 means "follow the theme". */
export const HEADING_SIZE_PRESETS = {
  h1: { small: 20, medium: 24, large: 28, extraLarge: 31 },
  h2: { small: 18, medium: 21, large: 24, extraLarge: 27 },
  h3: { small: 15, medium: 18, large: 21, extraLarge: 23 },
} as const;

/** Solid accent swatches for text colors. */
export const SOLID_COLORS = [
  "#e06c75",
  "#d19a66",
  "#dcb56a",
  "#98c379",
  "#56b6c2",
  "#61afef",
  "#6f9dd8",
  "#b078d0",
  "#a78bfa",
  "#e06c9f",
  "#c09664",
] as const;

/** Translucent tints for the highlight background. */
export const TINT_COLORS = [
  "#e06c7533",
  "#dcb56a33",
  "#98c37933",
  "#56b6c233",
  "#61afef33",
  "#b078d033",
  "#a78bfa33",
  "#e06c9f33",
] as const;

// The library tags every rendered Markdown block with this class on web.
const SCOPE = ".enrm-text";
const HEADING_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

/** Build the injected stylesheet. Pure string work so every runtime can use it. */
export function buildMarkdownCss(values: MarkdownStyleValues): string {
  if (!values.enabled) return "";
  const rules: string[] = [];
  const sizes: Array<[string, number]> = [
    ["h1", values.h1Size],
    ["h2", values.h2Size],
    ["h3", values.h3Size],
  ];
  for (const [tag, size] of sizes) {
    if (size > 0) rules.push(`${SCOPE} ${tag} { font-size: ${size}px !important; }`);
  }
  if (values.headingLevelIndicators) {
    const indicators: Array<[string, string]> = [
      ["h1", "#"],
      ["h2", "##"],
      ["h3", "###"],
    ];
    for (const [tag, prefix] of indicators) {
      rules.push(
        `${SCOPE} ${tag}::before { content: "${prefix}"; opacity: 0.5; font-weight: 400; margin-right: 8px; }`,
      );
    }
  }
  if (values.headingColor) {
    const selector = HEADING_TAGS.map((tag) => `${SCOPE} ${tag}`).join(",");
    rules.push(`${selector} { color: ${values.headingColor} !important; }`);
  }
  if (values.boldColor) {
    rules.push(`${SCOPE} strong { color: ${values.boldColor} !important; }`);
  }
  const markDeclarations = [
    values.highlightBackground ? `background-color: ${values.highlightBackground} !important;` : "",
    values.highlightTextColor ? `color: ${values.highlightTextColor} !important;` : "",
  ]
    .filter(Boolean)
    .join(" ");
  if (markDeclarations) rules.push(`${SCOPE} mark { ${markDeclarations} }`);
  const custom = values.customCss.trim();
  if (custom) rules.push(custom);
  return rules.join("\n");
}
