import type { Todo } from "@orbit/api-client";
import { useTheme } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
};

export function TodoRow({ todo, onToggle, onDelete }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Pressable
        onPress={onToggle}
        hitSlop={10}
        role="checkbox"
        aria-checked={todo.done}
        aria-label={todo.done ? "Mark as not done" : "Mark as done"}
        style={[
          styles.box,
          { borderColor: todo.done ? colors.primary : colors.border },
          todo.done && { backgroundColor: colors.primary },
        ]}
      >
        {todo.done && <Text style={styles.check}>✓</Text>}
      </Pressable>

      <Text
        style={[styles.title, { color: colors.text }, todo.done && styles.done]}
        numberOfLines={2}
      >
        {todo.title}
      </Text>

      <Pressable onPress={onDelete} hitSlop={10} role="button" aria-label={`Delete ${todo.title}`}>
        <Text style={styles.delete}>Delete</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  check: { color: "white", fontSize: 13, fontWeight: "700" },
  title: { flex: 1, fontSize: 16 },
  done: { opacity: 0.45, textDecorationLine: "line-through" },
  delete: { color: "#ef4444", fontSize: 14 },
});
