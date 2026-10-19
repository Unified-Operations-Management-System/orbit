// area-icon.tsx — shapes drawn with Views, no SVG dependency.
import { View } from "react-native";
import { areas, colors, type Area, type AreaShape } from "@/theme";

export function Shape({ shape, color, size = 16 }: { shape: AreaShape; color: string; size?: number }) {
  const s = size;
  if (shape === "circle") return <View style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: color }} />;
  if (shape === "square") return <View style={{ width: s, height: s, backgroundColor: color }} />;
  if (shape === "quarter") return <View style={{ width: s, height: s, borderTopLeftRadius: s, backgroundColor: color }} />;
  if (shape === "bar")
    return (
      <View style={{ width: s, height: s, justifyContent: "center" }}>
        <View style={{ height: s * 0.4, backgroundColor: color }} />
      </View>
    );
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth: s / 2,
        borderRightWidth: s / 2,
        borderBottomWidth: s,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderBottomColor: color,
      }}
    />
  );
}

export function AreaIcon({ area, size }: { area: Area; size?: number }) {
  const { shape, color } = areas[area];
  return <Shape shape={shape} color={colors[color]} size={size} />;
}
