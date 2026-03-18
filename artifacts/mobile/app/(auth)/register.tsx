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

const PROGRAMS = ["BCA", "BTech", "MBA", "MTech", "BSc", "BCom", "BA", "Other"];

export default function RegisterScreen() {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [college, setCollege] = useState("");
  const [program, setProgram] = useState("BCA");
  const [role, setRole] = useState<"student" | "provider">("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isWeb = Platform.OS === "web";

  const handleRegister = async () => {
    setError("");
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in your name, email and password");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim().toLowerCase(), password, role, college: college.trim(), program });
    } catch (err: any) {
      setError(err.message || "Could not create account. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: C.background }]}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: isWeb ? 67 : insets.top + 20,
        paddingBottom: isWeb ? 34 : insets.bottom + 20,
        paddingHorizontal: 24,
      }}
      bottomOffset={80}
    >
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="x" size={22} color={C.text} />
        </Pressable>
      </View>

      <Text style={[styles.title, { color: C.text, fontFamily: "Inter_700Bold" }]}>Create Account</Text>
      <Text style={[styles.subtitle, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>
        Join thousands of students on campus
      </Text>

      <View style={[styles.roleToggle, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
        <Pressable
          style={[styles.roleBtn, role === "student" && { backgroundColor: C.primary }]}
          onPress={() => setRole("student")}
        >
          <Feather name="book" size={14} color={role === "student" ? "#fff" : C.textSecondary} />
          <Text style={[styles.roleBtnText, { color: role === "student" ? "#fff" : C.textSecondary, fontFamily: "Inter_500Medium" }]}>Student</Text>
        </Pressable>
        <Pressable
          style={[styles.roleBtn, role === "provider" && { backgroundColor: C.primary }]}
          onPress={() => setRole("provider")}
        >
          <Feather name="briefcase" size={14} color={role === "provider" ? "#fff" : C.textSecondary} />
          <Text style={[styles.roleBtnText, { color: role === "provider" ? "#fff" : C.textSecondary, fontFamily: "Inter_500Medium" }]}>Service Provider</Text>
        </Pressable>
      </View>

      <View style={styles.form}>
        {[
          { label: "Full Name *", placeholder: "Your full name", icon: "user", value: name, onChange: setName },
          { label: "College Email *", placeholder: "your@college.edu", icon: "mail", value: email, onChange: setEmail, keyboard: "email-address" as any },
          { label: "Password *", placeholder: "Min. 6 characters", icon: "lock", value: password, onChange: setPassword, secure: true },
          { label: "College", placeholder: "e.g. Delhi University", icon: "map-pin", value: college, onChange: setCollege },
        ].map((field) => (
          <View key={field.label}>
            <Text style={[styles.label, { color: C.textSecondary, fontFamily: "Inter_500Medium" }]}>{field.label}</Text>
            <View style={[styles.inputWrapper, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
              <Feather name={field.icon as any} size={17} color={C.textTertiary} />
              <TextInput
                style={[styles.input, { color: C.text, fontFamily: "Inter_400Regular" }]}
                placeholder={field.placeholder}
                placeholderTextColor={C.textTertiary}
                value={field.value}
                onChangeText={v => { field.onChange(v); setError(""); }}
                keyboardType={field.keyboard}
                secureTextEntry={field.secure}
                autoCapitalize={field.keyboard === "email-address" || field.secure ? "none" : "words"}
              />
            </View>
          </View>
        ))}

        <Text style={[styles.label, { color: C.textSecondary, fontFamily: "Inter_500Medium" }]}>Program</Text>
        <View style={styles.programsGrid}>
          {PROGRAMS.map(p => (
            <Pressable
              key={p}
              style={[styles.programChip, { borderColor: C.border, backgroundColor: program === p ? C.primary : C.backgroundSecondary }]}
              onPress={() => setProgram(p)}
            >
              <Text style={[styles.programChipText, { color: program === p ? "#fff" : C.textSecondary, fontFamily: "Inter_500Medium" }]}>{p}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: C.errorLight }]}>
          <Feather name="alert-circle" size={14} color={C.error} />
          <Text style={[styles.errorText, { color: C.error, fontFamily: "Inter_400Regular" }]}>{error}</Text>
        </View>
      ) : null}

      <Pressable
        style={[styles.registerBtn, { backgroundColor: C.primary }, loading && { opacity: 0.7 }]}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.registerBtnText, { fontFamily: "Inter_600SemiBold" }]}>Create Account</Text>
        )}
      </Pressable>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Already have an account?{" "}
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.footerLink, { color: C.primary, fontFamily: "Inter_600SemiBold" }]}>Sign In</Text>
        </Pressable>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", marginBottom: 24 },
  title: { fontSize: 28, marginBottom: 8 },
  subtitle: { fontSize: 15, marginBottom: 28 },
  roleToggle: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 4, marginBottom: 24, gap: 4 },
  roleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  roleBtnText: { fontSize: 14 },
  form: { gap: 16 },
  label: { fontSize: 13, marginBottom: 8, letterSpacing: 0.3 },
  inputWrapper: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1,
  },
  input: { flex: 1, fontSize: 16 },
  programsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  programChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  programChipText: { fontSize: 13 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, marginTop: 16 },
  errorText: { flex: 1, fontSize: 13 },
  registerBtn: {
    paddingVertical: 16, borderRadius: 14, alignItems: "center",
    marginTop: 20, marginBottom: 20,
    shadowColor: "#5B4FE8", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  registerBtnText: { color: "#fff", fontSize: 16 },
  footer: { flexDirection: "row", justifyContent: "center", paddingBottom: 20 },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14 },
});
