// Mobile entry to the shared tokens (packages/design-tokens) plus Jost font names.
export { areas, colors, minTouch, space, statuses, typeScale } from "@orbit/design-tokens";
export type { Area, AreaShape, ColorToken, Status } from "@orbit/design-tokens";

export const fonts = {
  regular: "Jost_400Regular",
  medium: "Jost_500Medium",
  bold: "Jost_700Bold",
  extraBold: "Jost_800ExtraBold",
} as const;
