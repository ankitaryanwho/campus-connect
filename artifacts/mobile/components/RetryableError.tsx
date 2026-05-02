import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface Props {
  message?: string;
  onRetry: () => void;
}

export function RetryableError({ message, onRetry }: Props) {
  const isDark = useColorScheme() === "dark";
  const C = Colors[isDark ? "dark" : "light"];

  return (
    <View style={[styles.container, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
      <Feather name="wifi-off" size={32} color={C.textTertiary} style={{ opacity: 0.7 }} />
      <Text style={[styles.title, { color: C.text }]}>Something went wrong</Text>
      <Text style={[styles.subtitle, { color: C.textSecondary }]}>
        {message || "Couldn't load data. Check your connection and try again."}
      </Text>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: C.primary }]}
        onPress={onRetry}
        activeOpacity={0.8}
      >
        <Feather name="refresh-cw" size={14} color="#fff" />
        <Text style={styles.btnText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 20,
    borderRadius: 18,
    borderWidth: 0.5,
    padding: 32,
    alignItems: "center",
    gap: 10,
  },
  title: { fontSize: 17, fontFamily: "Inter_700Bold", marginTop: 6 },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
