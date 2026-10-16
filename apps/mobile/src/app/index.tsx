import { useQueryClient } from "@tanstack/react-query";
import { Stack, useTheme } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { HealthPill } from "@/components/health-pill";
import { TodoRow } from "@/components/todo-row";
import { $api, API_URL } from "@/lib/api";

export default function TodosScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");

  // Fully typed: data is Todo[] from the spec.
  const todos = $api.useQuery("get", "/todos");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: $api.queryOptions("get", "/todos").queryKey });

  const create = $api.useMutation("post", "/todos", {
    onSuccess: () => {
      setTitle("");
      invalidate();
    },
  });
  const update = $api.useMutation("patch", "/todos/{id}", { onSuccess: invalidate });
  const remove = $api.useMutation("delete", "/todos/{id}", { onSuccess: invalidate });

  // Validation errors follow the spec's Problem schema (RFC 9457) and are typed too.
  const createError = create.error?.errors?.[0]?.message ?? create.error?.detail;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen
        options={{
          title: "Todos",
          headerLargeTitleEnabled: true,
          headerRight: () => <HealthPill />,
        }}
      />

      <FlatList
        style={styles.flex}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        data={todos.data ?? []}
        keyExtractor={(t) => String(t.id)}
        refreshControl={<RefreshControl refreshing={todos.isRefetching} onRefresh={() => todos.refetch()} />}
        ListHeaderComponent={
          <View style={styles.form}>
            <View style={styles.inputRow}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="What needs doing?"
                placeholderTextColor="#9ca3af"
                returnKeyType="done"
                onSubmitEditing={() => create.mutate({ body: { title } })}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
              <Pressable
                onPress={() => create.mutate({ body: { title } })}
                disabled={create.isPending}
                role="button"
                style={[styles.addButton, { backgroundColor: colors.primary }, create.isPending && styles.disabled]}
              >
                <Text style={styles.addLabel}>{create.isPending ? "Adding…" : "Add"}</Text>
              </Pressable>
            </View>
            {createError ? <Text style={styles.error}>{createError}</Text> : null}
          </View>
        }
        renderItem={({ item }) => (
          <TodoRow
            todo={item}
            onToggle={() => update.mutate({ params: { path: { id: item.id } }, body: { done: !item.done } })}
            onDelete={() => remove.mutate({ params: { path: { id: item.id } } })}
          />
        )}
        ListEmptyComponent={
          todos.isPending ? (
            <ActivityIndicator style={styles.empty} />
          ) : todos.isError ? (
            <Text style={[styles.empty, styles.error]}>
              Couldn&apos;t reach the Go API at {API_URL}. Is it running?
            </Text>
          ) : (
            <Text style={[styles.empty, { color: colors.text }]}>Nothing to do. Add something above.</Text>
          )
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { padding: 16, gap: 8 },
  inputRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  addButton: { borderRadius: 10, paddingHorizontal: 16, justifyContent: "center" },
  addLabel: { color: "white", fontWeight: "600", fontSize: 16 },
  disabled: { opacity: 0.5 },
  error: { color: "#ef4444", fontSize: 14 },
  empty: { padding: 24, textAlign: "center" },
});
