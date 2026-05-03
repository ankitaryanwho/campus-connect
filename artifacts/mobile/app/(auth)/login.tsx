import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

const PURPLE = "#5B4FE8";
const CREAM = "#FAF8F4";
const TEXT = "#1A1A2E";

export default function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const isWeb = Platform.OS === "web";

  return (
    <View style={s.screen}>
      <View style={s.blob1} />
      <View style={s.blob2} />
      <View style={s.blob3} />
      <View style={s.dot1} />
      <View style={s.dot2} />
      <View style={s.dot3} />
      <View style={s.ring} />

      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: isWeb ? 60 : insets.top + 24,
          paddingBottom: isWeb ? 40 : insets.bottom + 32,
          paddingHorizontal: 16,
        }}
        bottomOffset={60}
      >
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.logoBox}>
              <Feather name="layers" size={28} color="#fff" />
            </View>
            <View style={s.titleRow}>
              <Text style={s.appName}>Colyx</Text>
              <Text style={s.version}>v2.0</Text>
            </View>

            <View style={s.tabRow}>
              <View style={[s.tab, s.tabActive]}>
                <Text style={[s.tabText, s.tabTextActive]}>Sign In</Text>
              </View>
              <Pressable
                style={s.tab}
                onPress={() => router.push("/(auth)/register")}
              >
                <Text style={[s.tabText, s.tabTextInactive]}>Sign Up</Text>
              </Pressable>
            </View>
          </View>

          {error ? (
            <View style={s.errorBox}>
              <Feather name="alert-circle" size={16} color="#C2410C" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={s.inputWrap}>
            <View style={s.iconCircle}>
              <Feather name="mail" size={16} color={PURPLE} />
            </View>
            <TextInput
              style={s.input}
              placeholder="your@college.edu"
              placeholderTextColor={TEXT + "55"}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={v => { setEmail(v); setError(""); }}
            />
          </View>

          <View style={[s.inputWrap, { marginTop: 12 }]}>
            <View style={s.iconCircle}>
              <Feather name="lock" size={16} color={PURPLE} />
            </View>
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor={TEXT + "55"}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={v => { setPassword(v); setError(""); }}
            />
            <Pressable onPress={() => setShowPassword(p => !p)} hitSlop={8}>
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={18}
                color={TEXT + "66"}
              />
            </Pressable>
          </View>

          <Pressable
            style={[s.primaryBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.primaryBtnText}>Sign In</Text>
            )}
          </Pressable>

          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerLabel}>Or</Text>
            <View style={s.dividerLine} />
          </View>

          <Pressable
            style={s.demoBtn}
            onPress={() => {
              setEmail("priya@campus.edu");
              setPassword("password123");
              setError("");
            }}
          >
            <Feather name="zap" size={16} color={PURPLE} />
            <Text style={s.demoBtnText}>Use demo account</Text>
          </Pressable>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>New here? </Text>
          <Pressable onPress={() => router.push("/(auth)/register")}>
            <Text style={s.footerLink}>Sign Up →</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAF8F4" },

  blob1: {
    position: "absolute", width: 192, height: 192, borderRadius: 96,
    backgroundColor: PURPLE, opacity: 0.10, top: -48, left: -48,
  },
  blob2: {
    position: "absolute", width: 64, height: 64, borderRadius: 32,
    backgroundColor: PURPLE, opacity: 0.15, top: 32, right: 16,
  },
  blob3: {
    position: "absolute", width: 144, height: 144, borderRadius: 72,
    backgroundColor: PURPLE, opacity: 0.08, bottom: -32, right: -32,
  },
  dot1: {
    position: "absolute", width: 12, height: 12, borderRadius: 6,
    backgroundColor: PURPLE, opacity: 0.20, top: 196, left: 24,
  },
  dot2: {
    position: "absolute", width: 12, height: 12, borderRadius: 6,
    backgroundColor: PURPLE, opacity: 0.20, top: 212, left: 40,
  },
  dot3: {
    position: "absolute", width: 12, height: 12, borderRadius: 6,
    backgroundColor: PURPLE, opacity: 0.20, top: 188, left: 52,
  },
  ring: {
    position: "absolute", width: 80, height: 80, borderRadius: 40,
    borderWidth: 4, borderColor: PURPLE, opacity: 0.15, top: 80, right: 64,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 8,
  },

  cardHeader: { alignItems: "center", marginBottom: 24 },

  logoBox: {
    width: 56, height: 56,
    backgroundColor: PURPLE,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginTop: 12,
  },
  appName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: TEXT,
  },
  version: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#9CA3AF",
  },

  tabRow: {
    flexDirection: "row",
    backgroundColor: CREAM,
    borderRadius: 100,
    padding: 4,
    borderWidth: 1,
    borderColor: "#E8E4F0",
    marginTop: 20,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 100,
  },
  tabActive: {
    backgroundColor: PURPLE,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  tabTextActive: { color: "#fff" },
  tabTextInactive: { color: TEXT + "80" },

  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: "#C2410C",
    fontFamily: "Inter_500Medium",
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: CREAM,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconCircle: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: TEXT,
    fontFamily: "Inter_400Regular",
  },

  primaryBtn: {
    backgroundColor: PURPLE,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E8E4F0" },
  dividerLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: TEXT + "66",
    letterSpacing: 0.5,
  },

  demoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: "#E8E4F0",
    borderRadius: 16,
    paddingVertical: 14,
  },
  demoBtnText: {
    fontSize: 15,
    color: PURPLE,
    fontFamily: "Inter_600SemiBold",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 14,
    color: TEXT + "99",
    fontFamily: "Inter_400Regular",
  },
  footerLink: {
    fontSize: 14,
    color: PURPLE,
    fontFamily: "Inter_700Bold",
  },
});
