import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, useColorScheme, Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

export default function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
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
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: C.background }]}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: isWeb ? 67 : insets.top + 20,
        paddingBottom: isWeb ? 34 : insets.bottom + 20,
        paddingHorizontal: 24,
        justifyContent: "center",
      }}
      bottomOffset={60}
    >
      <View style={styles.header}>
        <View style={[styles.logoCircle, { backgroundColor: C.primary }]}>
          <Feather name="layers" size={28} color="#fff" />
        </View>
        <Text style={[styles.appName, { color: C.text, fontFamily: "Inter_700Bold" }]}>CampusConnect</Text>
        <Text style={[styles.tagline, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Your campus, your community
        </Text>
        <Text style={{ fontSize: 10, color: C.textTertiary, marginTop: 4 }}>v2.0-prod</Text>
      </View>

      <View style={styles.form}>
        <Text style={[styles.label, { color: C.textSecondary, fontFamily: "Inter_500Medium" }]}>Email</Text>
        <View style={[styles.inputWrapper, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
          <Feather name="mail" size={18} color={C.textTertiary} />
          <TextInput
            style={[styles.input, { color: C.text, fontFamily: "Inter_400Regular" }]}
            placeholder="your@college.edu"
            placeholderTextColor={C.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={v => { setEmail(v); setError(""); }}
          />
        </View>

        <Text style={[styles.label, { color: C.textSecondary, fontFamily: "Inter_500Medium", marginTop: 16 }]}>Password</Text>
        <View style={[styles.inputWrapper, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
          <Feather name="lock" size={18} color={C.textTertiary} />
          <TextInput
            style={[styles.input, { color: C.text, fontFamily: "Inter_400Regular" }]}
            placeholder="••••••••"
            placeholderTextColor={C.textTertiary}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={v => { setPassword(v); setError(""); }}
          />
          <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
            <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={C.textTertiary} />
          </Pressable>
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: C.errorLight }]}>
            <Feather name="alert-circle" size={14} color={C.error} />
            <Text style={[styles.errorText, { color: C.error, fontFamily: "Inter_400Regular" }]}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.loginBtn, { backgroundColor: C.primary }, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.loginBtnText, { fontFamily: "Inter_600SemiBold" }]}>Sign In</Text>
          )}
        </Pressable>

        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: C.border }]} />
          <Text style={[styles.dividerText, { color: C.textTertiary, fontFamily: "Inter_400Regular" }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: C.border }]} />
        </View>

        <Pressable
          style={[styles.demoBtn, { borderColor: C.border, backgroundColor: C.backgroundSecondary }]}
          onPress={() => { setEmail("priya@campus.edu"); setPassword("password123"); setError(""); }}
        >
          <Feather name="zap" size={16} color={C.primary} />
          <Text style={[styles.demoBtnText, { color: C.primary, fontFamily: "Inter_500Medium" }]}>Use demo account</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Don't have an account?{" "}
        </Text>
        <Pressable onPress={() => router.push("/(auth)/register")}>
          <Text style={[styles.footerLink, { color: C.primary, fontFamily: "Inter_600SemiBold" }]}>Sign Up</Text>
        </Pressable>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: "center", marginBottom: 40 },
  logoCircle: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  appName: { fontSize: 28, marginBottom: 6 },
  tagline: { fontSize: 15 },
  form: { gap: 0 },
  label: { fontSize: 13, marginBottom: 8, letterSpacing: 0.3 },
  inputWrapper: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1, marginBottom: 4,
  },
  input: { flex: 1, fontSize: 16 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, marginTop: 10 },
  errorText: { flex: 1, fontSize: 13 },
  loginBtn: {
    paddingVertical: 16, borderRadius: 14, alignItems: "center",
    marginTop: 20, shadowColor: "#5B4FE8", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  loginBtnText: { color: "#fff", fontSize: 16 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 24 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13 },
  demoBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  demoBtnText: { fontSize: 15 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 32 },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14 },
});
