// Orbit design tokens. Source of truth for web and mobile; see docs/design/README.md.

export const colors = {
  ink: "#111111",
  paper: "#FFFFFF",
  surface: "#F5F5F5",
  line: "#E5E5E5",
  muted: "#666666",
  mutedInk: "#A3A3A3",
  red: "#D62839",
  blue: "#1F4FBF",
  yellow: "#F4B400",
} as const;

export type ColorToken = keyof typeof colors;

// The only foreground/background pairs allowed for text.
export const textPairs: ReadonlyArray<readonly [ColorToken, ColorToken]> = [
  ["ink", "paper"],
  ["ink", "surface"],
  ["muted", "paper"],
  ["muted", "surface"],
  ["paper", "ink"],
  ["mutedInk", "ink"],
  ["red", "paper"],
  ["red", "surface"],
  ["paper", "red"],
  ["blue", "paper"],
  ["paper", "blue"],
  ["ink", "yellow"],
];

export const typeScale = {
  display: { size: 32, weight: "800", lineHeight: 34 },
  h2: { size: 22, weight: "700", lineHeight: 26 },
  body: { size: 15, weight: "400", lineHeight: 22 },
  label: { size: 12, weight: "700", lineHeight: 16, letterSpacing: 0.12 },
  stat: { size: 40, weight: "800", lineHeight: 40 },
} as const;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32 } as const;
export const radius = 0;
export const minTouch = 44;

export type AreaShape = "circle" | "square" | "triangle" | "bar" | "quarter";
export type Area = "organization" | "hr" | "production" | "inventory" | "analytics";

export const areas: Record<Area, { label: string; shape: AreaShape; color: ColorToken; href: string }> = {
  organization: { label: "Organization", shape: "circle", color: "red", href: "/settings/organization" },
  hr: { label: "HR", shape: "square", color: "blue", href: "/hr" },
  production: { label: "Process", shape: "triangle", color: "yellow", href: "/production" },
  inventory: { label: "Inventory", shape: "bar", color: "ink", href: "/inventory" },
  analytics: { label: "Cost", shape: "quarter", color: "red", href: "/analytics" },
};

export type Status = "onTrack" | "slowed" | "stalled" | "done";

// shape + label always shown together; colour is never the only signal.
// The shape is drawn as a filled graphic (never a coloured text glyph), so yellow is never text.
export const statuses: Record<Status, { label: string; shape: AreaShape | "check"; color: ColorToken; text: ColorToken }> = {
  onTrack: { label: "On track", shape: "circle", color: "blue", text: "blue" },
  slowed: { label: "Slowed", shape: "triangle", color: "yellow", text: "ink" },
  stalled: { label: "Stalled", shape: "square", color: "red", text: "red" },
  done: { label: "Done", shape: "check", color: "ink", text: "ink" },
};
