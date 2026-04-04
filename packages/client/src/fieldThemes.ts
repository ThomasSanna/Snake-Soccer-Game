export type FieldThemeId =
  | "neon-grid"
  | "carbon-elite"
  | "holographic"
  | "solar-pulse"
  | "arctic-tech"
  | "emerald-circuit"
  | "urban-night"
  | "clean-glass";

export type FieldTheme = {
  id: FieldThemeId;
  name: string;
  pitchFill: number;
  pitchAlpha: number;
  borderColor: number;
  borderAlpha: number;
  borderWidth: number;
  innerBorderColor: number;
  innerBorderAlpha: number;
  innerBorderInset: number;
  centerLineColor: number;
  centerLineAlpha: number;
  centerLineWidth: number;
  centerCircleColor: number;
  centerCircleAlpha: number;
  centerCircleRadius: number;
};

const THEMES: Record<FieldThemeId, FieldTheme> = {
  "neon-grid": {
    id: "neon-grid",
    name: "Neon Grid Arena",
    pitchFill: 0x071122,
    pitchAlpha: 0.86,
    borderColor: 0x16c6ff,
    borderAlpha: 0.52,
    borderWidth: 4,
    innerBorderColor: 0x00ffd0,
    innerBorderAlpha: 0.28,
    innerBorderInset: 14,
    centerLineColor: 0x00ffd0,
    centerLineAlpha: 0.35,
    centerLineWidth: 3,
    centerCircleColor: 0x2de6ff,
    centerCircleAlpha: 0.28,
    centerCircleRadius: 140
  },
  "carbon-elite": {
    id: "carbon-elite",
    name: "Carbon Elite",
    pitchFill: 0x111418,
    pitchAlpha: 0.94,
    borderColor: 0xd5e3ea,
    borderAlpha: 0.48,
    borderWidth: 4,
    innerBorderColor: 0x6bf6d4,
    innerBorderAlpha: 0.22,
    innerBorderInset: 14,
    centerLineColor: 0xcfd9df,
    centerLineAlpha: 0.3,
    centerLineWidth: 3,
    centerCircleColor: 0x82ffe1,
    centerCircleAlpha: 0.2,
    centerCircleRadius: 140
  },
  holographic: {
    id: "holographic",
    name: "Holographic Stadium",
    pitchFill: 0x0f1426,
    pitchAlpha: 0.9,
    borderColor: 0x43c7ff,
    borderAlpha: 0.5,
    borderWidth: 4,
    innerBorderColor: 0xff6f91,
    innerBorderAlpha: 0.24,
    innerBorderInset: 14,
    centerLineColor: 0x77d9ff,
    centerLineAlpha: 0.32,
    centerLineWidth: 3,
    centerCircleColor: 0xc9a8ff,
    centerCircleAlpha: 0.22,
    centerCircleRadius: 140
  },
  "solar-pulse": {
    id: "solar-pulse",
    name: "Solar Pulse",
    pitchFill: 0x1a1210,
    pitchAlpha: 0.92,
    borderColor: 0xff8d1a,
    borderAlpha: 0.55,
    borderWidth: 4,
    innerBorderColor: 0xffc14d,
    innerBorderAlpha: 0.28,
    innerBorderInset: 14,
    centerLineColor: 0xffa938,
    centerLineAlpha: 0.35,
    centerLineWidth: 3,
    centerCircleColor: 0xffd270,
    centerCircleAlpha: 0.24,
    centerCircleRadius: 140
  },
  "arctic-tech": {
    id: "arctic-tech",
    name: "Arctic Tech",
    pitchFill: 0x0a1d2a,
    pitchAlpha: 0.9,
    borderColor: 0xb6efff,
    borderAlpha: 0.5,
    borderWidth: 4,
    innerBorderColor: 0x7ddaff,
    innerBorderAlpha: 0.25,
    innerBorderInset: 14,
    centerLineColor: 0xd8f7ff,
    centerLineAlpha: 0.32,
    centerLineWidth: 3,
    centerCircleColor: 0x84ddff,
    centerCircleAlpha: 0.22,
    centerCircleRadius: 140
  },
  "emerald-circuit": {
    id: "emerald-circuit",
    name: "Emerald Circuit",
    pitchFill: 0x10241f,
    pitchAlpha: 0.9,
    borderColor: 0x2be89a,
    borderAlpha: 0.53,
    borderWidth: 4,
    innerBorderColor: 0x9effd4,
    innerBorderAlpha: 0.23,
    innerBorderInset: 14,
    centerLineColor: 0x67f0bf,
    centerLineAlpha: 0.33,
    centerLineWidth: 3,
    centerCircleColor: 0x7affc8,
    centerCircleAlpha: 0.22,
    centerCircleRadius: 140
  },
  "urban-night": {
    id: "urban-night",
    name: "Urban Night Court",
    pitchFill: 0x1b151d,
    pitchAlpha: 0.92,
    borderColor: 0xff4f7d,
    borderAlpha: 0.5,
    borderWidth: 4,
    innerBorderColor: 0xf6b2c4,
    innerBorderAlpha: 0.24,
    innerBorderInset: 14,
    centerLineColor: 0xff779e,
    centerLineAlpha: 0.32,
    centerLineWidth: 3,
    centerCircleColor: 0xff9bbb,
    centerCircleAlpha: 0.22,
    centerCircleRadius: 140
  },
  "clean-glass": {
    id: "clean-glass",
    name: "Clean Glassfield",
    pitchFill: 0x0f1723,
    pitchAlpha: 0.78,
    borderColor: 0xeef8ff,
    borderAlpha: 0.5,
    borderWidth: 4,
    innerBorderColor: 0xc6e5ff,
    innerBorderAlpha: 0.23,
    innerBorderInset: 14,
    centerLineColor: 0xeaf6ff,
    centerLineAlpha: 0.3,
    centerLineWidth: 3,
    centerCircleColor: 0xd6ebff,
    centerCircleAlpha: 0.22,
    centerCircleRadius: 140
  }
};

export const FIELD_THEME_IDS = Object.keys(THEMES) as FieldThemeId[];
export const DEFAULT_FIELD_THEME_ID: FieldThemeId = "neon-grid";

export function isFieldThemeId(value: string): value is FieldThemeId {
  return value in THEMES;
}

export function getFieldTheme(themeId: FieldThemeId): FieldTheme {
  return THEMES[themeId];
}

export function getFieldThemeBySlot(slot: number): FieldTheme {
  const index = Math.max(0, Math.min(FIELD_THEME_IDS.length - 1, slot));
  return THEMES[FIELD_THEME_IDS[index]];
}
