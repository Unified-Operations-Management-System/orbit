// status-pill.tsx
import { View } from "react-native";
import { colors, fonts, statuses, type Status } from "@/theme";
import { Shape } from "./area-icon";
import { T } from "./text";

export function StatusPill({ status }: { status: Status }) {
  const s = statuses[status];
  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
      {s.shape === "check" ? <T aria-hidden style={{ fontFamily: fonts.bold }}>✓</T> : <Shape shape={s.shape} color={colors[s.color]} size={10} />}
      <T style={{ color: colors[s.text], fontFamily: fonts.bold }}>{s.label}</T>
    </View>
  );
}
