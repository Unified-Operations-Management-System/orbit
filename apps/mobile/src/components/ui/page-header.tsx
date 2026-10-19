// page-header.tsx (no decorative shapes on mobile)
import { View } from "react-native";
import { space } from "@/theme";
import { T } from "./text";

export function PageHeader({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <View style={{ gap: space[1], marginBottom: space[2] }}>
      {eyebrow ? <T variant="label">{eyebrow}</T> : null}
      <T variant="display">{title}</T>
    </View>
  );
}
