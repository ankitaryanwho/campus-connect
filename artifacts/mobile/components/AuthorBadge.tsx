import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { resolveBadge } from "@/constants/badges";

type Author = { verificationBadge?: string | null; verified?: boolean } | null | undefined;

// Compact badge — small icon-only circle for inline use next to a name.
// Use `withLabel` when there's room to show the badge name as well (e.g. detail headers).
export function AuthorBadge({
  author,
  size = 16,
  withLabel = false,
}: {
  author: Author;
  size?: number;
  withLabel?: boolean;
}) {
  const badge = resolveBadge(author);
  if (!badge) return null;

  if (withLabel) {
    return (
      <View
        style={[
          styles.chip,
          { borderColor: badge.color + "40", backgroundColor: badge.color + "12" },
        ]}
      >
        <Feather name={badge.icon as any} size={11} color={badge.color} />
        <Text style={[styles.chipText, { color: badge.color }]}>{badge.label}</Text>
      </View>
    );
  }

  // Verified specifically uses the existing indigo gradient checkmark for visual continuity.
  if (badge.label === "Verified") {
    return (
      <LinearGradient
        colors={["#5B4FE8", "#7B73F0"]}
        style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}
      >
        <Feather name="check" size={Math.max(8, size * 0.6)} color="#fff" />
      </LinearGradient>
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: badge.color,
      }}
    >
      <Feather name={badge.icon as any} size={Math.max(8, size * 0.6)} color="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
});
