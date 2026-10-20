// skeleton.tsx
import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, type DimensionValue } from "react-native";
import { colors } from "@/theme";

export function Skeleton({ width = "100%", height = 16 }: { width?: DimensionValue; height?: DimensionValue }) {
  const [pulse, setPulse] = useState(false);
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (!cancelled && !reduce) setPulse(true);
      })
      .catch(() => {
        if (!cancelled) setPulse(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.skeleton, { width, height, opacity }]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: { backgroundColor: colors.surface },
});
