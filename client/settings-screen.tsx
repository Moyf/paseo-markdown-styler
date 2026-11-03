import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Pressable, Text, View } from "react-native";
import {
  useSettings,
  useTranslation,
  type PluginSurfaceProps,
  type SettingsState,
} from "@getpaseo/plugin/client";
import {
  Markdown,
  SettingsAction,
  SettingsCard,
  SettingsRow,
  SettingsSection,
  SettingsSelect,
  SettingsSwitch,
  TextInput as KitTextInput,
} from "@getpaseo/plugin/client/ui";
import {
  buildMarkdownCss,
  COLOR_PATTERN,
  defaultStyleValues,
  HEADING_SIZE_PRESETS,
  preferences,
  SOLID_COLORS,
  TINT_COLORS,
  type MarkdownStyleValues,
} from "../shared/style";
import { messages } from "./messages";
import { applyMarkdownCss, countDescendantMarks } from "./web";

type ReadySettings = Extract<SettingsState<typeof preferences.schema>, { status: "ready" }>;
type ColorFieldKey = "headingColor" | "boldColor" | "highlightBackground" | "highlightTextColor";
type Translate = ReturnType<typeof useTranslation>["t"];

const EMPHASIS_COLORS = {
  violet: { boldColor: "#b078d0", highlightBackground: "#b078d033" },
  amber: { boldColor: "#c09664", highlightBackground: "#dcb56a33" },
  blue: { boldColor: "#6f9dd8", highlightBackground: "#61afef33" },
  off: { boldColor: "", highlightBackground: "" },
} satisfies Record<string, Partial<MarkdownStyleValues>>;

type EmphasisKey = keyof typeof EMPHASIS_COLORS;

const SIZE_PRESET_ORDER = ["small", "medium", "large", "extraLarge"] as const;

const SIZE_LABEL_KEYS = {
  small: "heading.small",
  medium: "heading.medium",
  large: "heading.large",
  extraLarge: "heading.extraLarge",
} as const;

const COLOR_FIELDS = [
  {
    key: "headingColor",
    labelKey: "color.headingColor",
    placeholderKey: "color.headingColorPlaceholder",
    swatches: SOLID_COLORS,
  },
  {
    key: "boldColor",
    labelKey: "color.boldColor",
    placeholderKey: "color.boldColorPlaceholder",
    swatches: SOLID_COLORS,
  },
  {
    key: "highlightBackground",
    labelKey: "color.highlightBackground",
    placeholderKey: "color.highlightBackgroundPlaceholder",
    swatches: TINT_COLORS,
  },
  {
    key: "highlightTextColor",
    labelKey: "color.highlightTextColor",
    placeholderKey: "color.highlightTextColorPlaceholder",
    swatches: SOLID_COLORS,
  },
] as const;

const HEADING_SELECTS: Array<{
  key: "h1Size" | "h2Size" | "h3Size";
  sizeKey: "h1" | "h2" | "h3";
  labelKey: "heading.h1" | "heading.h2" | "heading.h3";
}> = [
  { key: "h1Size", sizeKey: "h1", labelKey: "heading.h1" },
  { key: "h2Size", sizeKey: "h2", labelKey: "heading.h2" },
  { key: "h3Size", sizeKey: "h3", labelKey: "heading.h3" },
];

interface Draft {
  headingColor: string;
  boldColor: string;
  highlightBackground: string;
  highlightTextColor: string;
  customCss: string;
}

function toDraft(values: MarkdownStyleValues): Draft {
  return {
    headingColor: values.headingColor,
    boldColor: values.boldColor,
    highlightBackground: values.highlightBackground,
    highlightTextColor: values.highlightTextColor,
    customCss: values.customCss,
  };
}

type HighlightSupport = "probing" | "supported" | "unsupported";

/**
 * The ==highlight== parser only ships in the Moyf build. Probe the live preview
 * for a real <mark> element: the sample text renders through the host Markdown
 * pipeline, so a parsed mark is a behavioral test, not an API check.
 */
function useHighlightSupport(previewRef: RefObject<View | null>, isWeb: boolean): HighlightSupport {
  const [support, setSupport] = useState<HighlightSupport>(isWeb ? "probing" : "unsupported");
  useEffect(() => {
    if (!isWeb) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = Date.now() + 2000;
    const tick = () => {
      if (cancelled) return;
      if (countDescendantMarks(previewRef.current) > 0) {
        setSupport("supported");
        return;
      }
      if (Date.now() >= deadline) {
        setSupport("unsupported");
        return;
      }
      timer = setTimeout(tick, 150);
    };
    tick();
    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [isWeb, previewRef]);
  return support;
}

function StyleControls({
  settings,
  theme,
  isWeb,
}: {
  settings: ReadySettings;
  theme: PluginSurfaceProps["theme"];
  isWeb: boolean;
}) {
  const { t } = useTranslation(messages);
  const [draft, setDraft] = useState(() => toDraft(settings.values));
  const [draftError, setDraftError] = useState("");
  const [cssHeight, setCssHeight] = useState(120);
  const dragStart = useRef<{ y: number; height: number } | null>(null);
  const previewRef = useRef<View | null>(null);
  const muted = useMemo(() => ({ color: theme.colors.foregroundMuted }), [theme]);
  const reminderBoldStyle = useMemo(
    () => ({ color: theme.colors.foreground, fontWeight: "600" as const }),
    [theme],
  );
  const fieldLabelStyle = useMemo(() => ({ color: theme.colors.foreground }), [theme]);
  const fieldHintStyle = useMemo(
    () => ({ color: theme.colors.foregroundMuted, fontSize: 12 }),
    [theme],
  );
  const previewBoxStyle = useMemo(
    () => ({
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      backgroundColor: theme.colors.surface1,
      padding: 12,
    }),
    [theme],
  );
  const inputStyle = useMemo(
    () => ({
      color: theme.colors.foreground,
      backgroundColor: theme.colors.surface0,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 8,
    }),
    [theme],
  );
  const cssInputStyle = useMemo(
    () => [styles.cssInput, inputStyle, { height: cssHeight }],
    [inputStyle, cssHeight],
  );
  const resizeGripStyle = useMemo(
    () => [styles.resizeGrip, { backgroundColor: theme.colors.border }],
    [theme],
  );
  const emphasisValue = useMemo(() => {
    const match = (
      Object.entries(EMPHASIS_COLORS) as Array<[EmphasisKey, Partial<MarkdownStyleValues>]>
    ).find(
      ([, colors]) =>
        colors.boldColor === settings.values.boldColor &&
        colors.highlightBackground === settings.values.highlightBackground,
    );
    return match?.[0] ?? "";
  }, [settings.values]);
  const emphasisOptions = useMemo(
    () => [
      { label: t("emphasisPreset.none"), value: "off" },
      { label: t("emphasisPreset.violet"), value: "violet" },
      { label: t("emphasisPreset.amber"), value: "amber" },
      { label: t("emphasisPreset.blue"), value: "blue" },
      { label: t("emphasisPreset.custom"), value: "" },
    ],
    [t],
  );

  const persist = async (next: MarkdownStyleValues) => {
    if (await settings.save(next, settings.revision)) {
      applyMarkdownCss(buildMarkdownCss(next));
      setDraft(toDraft(next));
      setDraftError("");
    }
  };

  const changeField = (field: ColorFieldKey, color: string) => {
    setDraft((current) => ({ ...current, [field]: color }));
    void persist({ ...settings.values, [field]: color });
  };

  const changeSize = (field: "h1Size" | "h2Size" | "h3Size", px: string) => {
    void persist({ ...settings.values, [field]: Number.parseInt(px, 10) });
  };

  const changeEmphasis = (preset: string) => {
    if (!preset) return;
    void persist({ ...settings.values, ...EMPHASIS_COLORS[preset as EmphasisKey] });
  };

  const saveDraft = () => {
    const parsed: Partial<MarkdownStyleValues> = {};
    for (const field of COLOR_FIELDS) {
      const value = draft[field.key].trim();
      if (value && !COLOR_PATTERN.test(value)) {
        setDraftError(t("color.error", { label: t(field.labelKey) }));
        return;
      }
      parsed[field.key] = value;
    }
    if (draft.customCss.length > 8000) {
      setDraftError(t("customCss.tooLong"));
      return;
    }
    parsed.customCss = draft.customCss;
    setDraftError("");
    void persist({ ...settings.values, ...parsed });
  };

  const resetAll = () => {
    void persist(defaultStyleValues());
  };

  const sizeOptions = (current: number, presets: Record<string, number>) => {
    const options = [
      { label: t("heading.followTheme"), value: "0" },
      ...SIZE_PRESET_ORDER.map((labelKey) => ({
        label: t("heading.sizeOption", {
          label: t(SIZE_LABEL_KEYS[labelKey]),
          px: presets[labelKey],
        }),
        value: String(presets[labelKey]),
      })),
    ];
    if (!options.some((option) => option.value === String(current))) {
      options.push({ label: t("heading.customPx", { px: current }), value: String(current) });
    }
    return options;
  };

  const highlightSupport = useHighlightSupport(previewRef, isWeb);
  const visibleColorFields = useMemo(
    () =>
      highlightSupport === "supported"
        ? COLOR_FIELDS
        : COLOR_FIELDS.filter((field) => !field.key.startsWith("highlight")),
    [highlightSupport],
  );
  const previewSample = useMemo(
    () =>
      [
        `# ${t("preview.h1")}`,
        `## ${t("preview.h2")}`,
        t("preview.body"),
        `### ${t("preview.h3")}`,
      ].join("\n\n"),
    [t],
  );

  return (
    <>
      <SettingsSection title={t("preview.title")}>
        <SettingsCard>
          <View ref={previewRef} style={previewBoxStyle}>
            <Markdown>{previewSample}</Markdown>
            <View style={styles.previewHints}>
              <Text style={muted}>{t("preview.tryHint")}</Text>
              <Text style={muted}>
                {t("preview.reminderBefore")}
                <Text style={reminderBoldStyle}>{t("preview.reminderBold")}</Text>
                {t("preview.reminderAfter")}
              </Text>
            </View>
          </View>
          {isWeb && highlightSupport === "unsupported" ? (
            <Text style={muted}>{t("preview.unsupported")}</Text>
          ) : null}
        </SettingsCard>
      </SettingsSection>
      <SettingsSection title={t("title")}>
        <SettingsCard>
          <SettingsSwitch
            label={t("enable.label")}
            hint={t("enable.hint")}
            value={settings.values.enabled}
            onValueChange={(enabled) => void persist({ ...settings.values, enabled })}
          />
          <SettingsSelect
            label={t("emphasisPreset.label")}
            value={emphasisValue}
            options={emphasisOptions}
            onValueChange={changeEmphasis}
          />
          <SettingsSwitch
            label={t("indicator.label")}
            hint={t("indicator.hint")}
            value={settings.values.headingLevelIndicators}
            onValueChange={(headingLevelIndicators) =>
              void persist({ ...settings.values, headingLevelIndicators })
            }
          />
        </SettingsCard>
        <SettingsCard>
          {HEADING_SELECTS.map((select) => (
            <SettingsSelect
              key={select.key}
              label={t(select.labelKey)}
              value={String(settings.values[select.key])}
              options={sizeOptions(
                settings.values[select.key],
                HEADING_SIZE_PRESETS[select.sizeKey],
              )}
              onValueChange={(px) => changeSize(select.key, px)}
            />
          ))}
        </SettingsCard>
        <SettingsCard>
          {visibleColorFields.map((field) => (
            <SettingsRow key={field.key} label={t(field.labelKey)}>
              <SwatchRow
                label={t(field.labelKey)}
                value={settings.values[field.key]}
                swatches={field.swatches}
                onSelect={(color) => changeField(field.key, color)}
                theme={theme}
              />
              <KitTextInput
                value={draft[field.key]}
                onChangeText={(text) => setDraft((current) => ({ ...current, [field.key]: text }))}
                placeholder={t(field.placeholderKey)}
                placeholderTextColor={theme.colors.foregroundMuted}
                style={inputStyle}
              />
            </SettingsRow>
          ))}
          <View style={styles.cssField}>
            <Text style={fieldLabelStyle}>{t("customCss.label")}</Text>
            <Text style={fieldHintStyle}>{t("customCss.hint")}</Text>
            <KitTextInput
              value={draft.customCss}
              onChangeText={(customCss) => setDraft((current) => ({ ...current, customCss }))}
              placeholder=".enrm-text blockquote { border-color: #b078d0; }"
              placeholderTextColor={theme.colors.foregroundMuted}
              multiline
              textAlignVertical="top"
              style={cssInputStyle}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("customCss.resizeHandle")}
              style={styles.resizeHandle}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(event) => {
                dragStart.current = { y: event.nativeEvent.pageY, height: cssHeight };
              }}
              onResponderMove={(event) => {
                if (!dragStart.current) return;
                const next =
                  dragStart.current.height + (event.nativeEvent.pageY - dragStart.current.y);
                setCssHeight(Math.min(600, Math.max(72, Math.round(next))));
              }}
              onResponderRelease={() => {
                dragStart.current = null;
              }}
            >
              <View style={resizeGripStyle} />
            </Pressable>
          </View>
          <SettingsAction
            label={t("save.label")}
            actionLabel={t("save.action")}
            onPress={saveDraft}
          />
          <SettingsAction
            label={t("resetAll.label")}
            actionLabel={t("resetAll.action")}
            onPress={resetAll}
          />
        </SettingsCard>
        {draftError ? (
          <Text accessibilityRole="alert" style={muted}>
            {draftError}
          </Text>
        ) : null}
        {!isWeb ? <Text style={muted}>{t("platformHint")}</Text> : null}
      </SettingsSection>
    </>
  );
}

function SwatchRow({
  label,
  value,
  swatches,
  onSelect,
  theme,
}: {
  label: string;
  value: string;
  swatches: readonly string[];
  onSelect(color: string): void;
  theme: PluginSurfaceProps["theme"];
}) {
  const { t } = useTranslation(messages);
  const selectedBorder = useMemo(() => ({ borderColor: theme.colors.foreground }), [theme]);
  const idleBorder = useMemo(() => ({ borderColor: theme.colors.border }), [theme]);
  const emptyLabelStyle = useMemo(
    () => [styles.swatchEmptyLabel, { color: theme.colors.foreground }],
    [theme],
  );
  return (
    <View style={styles.swatchRow}>
      {swatches.map((color) => {
        const selected = value.toLowerCase() === color.toLowerCase();
        return (
          <Pressable
            key={color}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${color}`}
            onPress={() => onSelect(color)}
            style={[
              styles.swatch,
              { backgroundColor: color },
              selected ? selectedBorder : idleBorder,
            ]}
          />
        );
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} ${t("color.followTheme")}`}
        onPress={() => onSelect("")}
        style={[styles.swatch, styles.swatchEmpty, value === "" ? selectedBorder : idleBorder]}
      >
        <Text style={emptyLabelStyle}>{t("color.emptySwatch")}</Text>
      </Pressable>
    </View>
  );
}

const styles = {
  swatchRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    paddingVertical: 8,
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
  },
  swatchEmpty: { alignItems: "center" as const, justifyContent: "center" as const },
  swatchEmptyLabel: { fontSize: 10 },
  cssInput: { width: "100%" as const },
  cssField: { gap: 6, paddingHorizontal: 16 },
  previewHints: { marginTop: 8, gap: 2 },
  resizeHandle: { alignItems: "center" as const, paddingVertical: 6 },
  resizeGrip: { width: 36, height: 4, borderRadius: 2 },
};

export function MarkdownStyleSettings({ theme, layout }: PluginSurfaceProps) {
  const { t } = useTranslation(messages);
  const settings = useSettings(preferences);
  const style = useMemo(() => ({ color: theme.colors.foreground }), [theme]);
  if (settings.status === "loading") return <Text style={style}>{t("loading")}</Text>;
  if (settings.status !== "ready") {
    return (
      <SettingsSection title={t("title")}>
        <Text style={style}>{settings.error}</Text>
        <SettingsAction
          label={t("reloadLabel")}
          actionLabel={t("reloadAction")}
          onPress={settings.reload}
        />
        {settings.status === "invalid" ? (
          <SettingsAction
            label={t("resetLabel")}
            actionLabel={t("resetAction")}
            onPress={settings.reset}
          />
        ) : null}
      </SettingsSection>
    );
  }
  return <StyleControls settings={settings} theme={theme} isWeb={layout.platform === "web"} />;
}
