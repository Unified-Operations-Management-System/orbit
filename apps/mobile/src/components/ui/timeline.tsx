// timeline.tsx
import { StyleSheet, View } from "react-native";
import { colors, fonts, space, statuses, type Status } from "@/theme";
import { Shape } from "./area-icon";
import { T } from "./text";

type Item = { id: string; title: string; meta?: string; body?: string; status?: Status };

export function Timeline({ items }: { items: Item[] }) {
  return (
    <View style={styles.wrap}>
      {items.map((item) => {
        const s = item.status ? statuses[item.status] : null;
        const shape = s ? s.shape : "circle";
        const color = s ? colors[s.color] : colors.ink;
        return (
          <View key={item.id} style={styles.item}>
            {shape === "check" ? (
              <T aria-hidden style={styles.check}>✓</T>
            ) : (
              <Shape shape={shape} color={color} size={12} />
            )}
            <View style={styles.textCol}>
              <T style={styles.title}>{item.title}</T>
              {item.meta ? <T style={styles.meta}>{item.meta}</T> : null}
              {item.body ? <T>{item.body}</T> : null}
              {s ? <T style={[styles.status, { color: colors[s.text] }]}>{s.label}</T> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderLeftWidth: 2, borderColor: colors.ink, paddingLeft: space[3], gap: space[4] },
  item: { flexDirection: "row", alignItems: "flex-start", gap: space[3] },
  check: { fontFamily: fonts.bold },
  textCol: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.bold },
  meta: { color: colors.muted },
  status: { fontFamily: fonts.bold },
});
