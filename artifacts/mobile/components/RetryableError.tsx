import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface RetryableErrorProps {
  message?: string;
  onRetry: () => void;
}

export function RetryableError({ message, onRetry }: RetryableErrorProps) {
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

interface RetryingBannerProps {
  attempt: number;
  maxAttempts?: number;
}

export function RetryingBanner({ attempt, maxAttempts = 3 }: RetryingBannerProps) {
  const isDark = useColorScheme() === "dark";
  const C = Colors[isDark ? "dark" : "light"];

  return (
    <View style={[styles.banner, { backgroundColor: isDark ? "#2D2200" : "#FFFBEB", borderColor: "#F59E0B44" }]}>
      <Feather name="refresh-cw" size={13} color="#F59E0B" />
      <Text style={[styles.bannerText, { color: isDark ? "#FCD34D" : "#92400E" }]}>
        Connection issue — retrying ({attempt}/{maxAttempts})…
      </Text>
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
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 14,
    marginTop: 6,
    marginBottom: 2,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  bannerText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
});
