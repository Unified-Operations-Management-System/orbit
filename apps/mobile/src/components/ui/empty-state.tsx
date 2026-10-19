// empty-state.tsx
import { View } from "react-native";
import { colors, space, type Area } from "@/theme";
import { AreaIcon } from "./area-icon";
import { T } from "./text";

export function EmptyState({ area, title, body }: { area: Area; title: string; body: string }) {
  return (
    <View style={{ gap: space[3], paddingVertical: space[8] }}>
      <AreaIcon area={area} size={56} />
      <T variant="h2">{title}</T>
      <T style={{ color: colors.muted }}>{body}</T>
    </View>
  );
}
