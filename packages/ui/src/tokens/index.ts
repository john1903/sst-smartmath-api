export const colors = {
  primary: "#2475FC",
  primaryHover: "#1F63D6",
  primarySoft: "rgba(36, 117, 252, 0.10)",

  ink900: "#0B1220",
  ink700: "#2B3648",
  ink500: "#4A5464",
  ink300: "#8A94A6",
  ink100: "#DFE4EC",
  ink50: "#F6F6F6",

  white: "#FFFFFF",
  border: "#DADADA",
  borderStrong: "#C2C2C2",

  success: "#3CCB3C",
  danger: "#FD1207",
  warning: "#FFD54F",
  muted: "#BCAAA4",
} as const;

export const radii = {
  pill: "999px",
  lg: "20px",
  md: "16px",
  sm: "12px",
} as const;

export const shadows = {
  sm: "0 1px 2px rgba(11,18,32,0.04), 0 1px 3px rgba(11,18,32,0.06)",
  md: "0 6px 16px rgba(11,18,32,0.06), 0 2px 4px rgba(11,18,32,0.04)",
  primaryGlow: "0 4px 14px rgba(36,117,252,0.35)",
} as const;

export const fonts = {
  body: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  display: '"Silkscreen", "Inter", monospace',
} as const;
