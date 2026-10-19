// sheet.tsx
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, space } from "@/theme";
import { T } from "./text";

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel={`Close ${title}`} accessibilityRole="button" onPress={onClose} style={styles.flex}>
          <View style={[styles.backdrop, { opacity: 0.4 }]} />
        </Pressable>
        <View style={[styles.panel, { paddingBottom: space[6] + insets.bottom }]}>
          <T variant="h2" style={{ marginBottom: space[4] }}>{title}</T>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  flex: { ...StyleSheet.absoluteFill, zIndex: 0 },
  backdrop: { flex: 1, backgroundColor: colors.ink },
  panel: { backgroundColor: colors.paper, borderTopWidth: 6, borderTopColor: colors.red, padding: space[6], zIndex: 1 },
});
