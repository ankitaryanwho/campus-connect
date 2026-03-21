import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, useColorScheme, Platform, Modal,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "/api";

const PROGRAMS = ["BCA", "BTech", "MBA", "MTech", "BSc", "BCom", "BA", "Other"];

const ALL_SERVICES = [
  { id: "assignments", label: "Assignments", icon: "file-text", desc: "Help students with academic work" },
  { id: "coaching", label: "Coaching", icon: "users", desc: "Teach & mentor other students" },
  { id: "deliveries", label: "Deliveries", icon: "truck", desc: "Campus delivery runs" },
  { id: "tasks", label: "Tasks & Gigs", icon: "clipboard", desc: "Freelance tasks for students" },
];

interface College {
  id: string;
  name: string;
  domain: string;
}

export default function RegisterScreen() {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const isWeb = Platform.OS === "web";

  const [step, setStep] = useState<"form" | "otp">("form");

  const [role, setRole] = useState<"student" | "provider">("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [program, setProgram] = useState("BCA");
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const [colleges, setColleges] = useState<College[]>([]);
  const [collegeSearch, setCollegeSearch] = useState("");
  const [showCollegePicker, setShowCollegePicker] = useState(false);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/auth/colleges`)
      .then(r => r.json())
      .then(d => setColleges(d.colleges || []))
      .catch(() => {});
  }, []);

  const filteredColleges = colleges.filter(c =>
    c.name.toLowerCase().includes(collegeSearch.toLowerCase()) ||
    c.domain.toLowerCase().includes(collegeSearch.toLowerCase())
  );

  const emailDomain = email.trim().toLowerCase().split("@")[1] || "";
  const domainValid = selectedCollege ? emailDomain === selectedCollege.domain : true;

  const validateForm = () => {
    if (!name.trim()) { setError("Please enter your full name"); return false; }
    if (!selectedCollege) { setError("Please select your college"); return false; }
    if (!email.trim() || !email.includes("@")) { setError("Please enter a valid email address"); return false; }
    if (!domainValid) {
      setError(`Your email must be from @${selectedCollege!.domain} for ${selectedCollege!.name}`);
      return false;
    }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return false; }
    if (role === "provider" && selectedServices.length === 0) {
      setError("Please select at least one service you offer");
      return false;
    }
    return true;
  };

  const handleSendOtp = async () => {
    setError("");
    if (!validateForm()) return;
    setSendingOtp(true);
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), collegeId: selectedCollege!.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed to send OTP"); return; }
      setOtpSent(true);
      setStep("otp");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpChange = (val: string, idx: number) => {
    const cleaned = val.replace(/[^0-9]/g, "").slice(0, 1);
    const next = [...otp];
    next[idx] = cleaned;
    setOtp(next);
    setError("");
    if (cleaned && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) { setError("Please enter the full 6-digit OTP"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Invalid OTP"); setLoading(false); return; }
      setVerificationToken(data.verificationToken);
      await handleRegister(data.verificationToken);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const handleRegister = async (token: string) => {
    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        college: selectedCollege!.name,
        collegeId: selectedCollege!.id,
        program,
        services: role === "provider" ? selectedServices : [],
        verificationToken: token,
      });
    } catch (err: any) {
      setError(err.message || "Could not create account. Try again.");
      setLoading(false);
    }
  };

  const toggleService = (id: string) => {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
    setError("");
  };

  const S = styles(C);

  if (step === "otp") {
    return (
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1, backgroundColor: C.background }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: isWeb ? 67 : insets.top + 20,
          paddingBottom: isWeb ? 34 : insets.bottom + 20,
          paddingHorizontal: 24,
        }}
      >
        <Pressable onPress={() => { setStep("form"); setOtp(["","","","","",""]); setError(""); }} style={{ marginBottom: 28 }}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>

        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <View style={[S.otpIconWrap, { backgroundColor: C.primaryLight }]}>
            <Feather name="mail" size={28} color={C.primary} />
          </View>
          <Text style={[S.title, { color: C.text, marginTop: 16 }]}>Verify your email</Text>
          <Text style={[S.subtitle, { color: C.textSecondary }]}>
            We sent a 6-digit code to{"\n"}
            <Text style={{ color: C.primary, fontFamily: "Inter_600SemiBold" }}>{email.trim().toLowerCase()}</Text>
          </Text>
          <Text style={[{ color: C.textTertiary, fontSize: 12, marginTop: 8, fontFamily: "Inter_400Regular", textAlign: "center" }]}>
            Check the API server logs for the OTP (dev mode)
          </Text>
        </View>

        <View style={S.otpRow}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={r => { otpRefs.current[idx] = r; }}
              style={[S.otpBox, {
                backgroundColor: C.backgroundSecondary,
                borderColor: digit ? C.primary : C.border,
                color: C.text,
              }]}
              value={digit}
              onChangeText={v => handleOtpChange(v, idx)}
              onKeyPress={e => handleOtpKeyPress(e, idx)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              fontFamily="Inter_700Bold"
            />
          ))}
        </View>

        {error ? (
          <View style={[S.errorBox, { backgroundColor: C.errorLight }]}>
            <Feather name="alert-circle" size={14} color={C.error} />
            <Text style={[S.errorText, { color: C.error }]}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={[S.primaryBtn, { backgroundColor: C.primary }, loading && { opacity: 0.7 }]}
          onPress={handleVerifyOtp}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <Text style={[S.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Verify & Create Account</Text>
          )}
        </Pressable>

        <Pressable onPress={handleSendOtp} style={{ alignItems: "center", marginTop: 16 }} disabled={sendingOtp}>
          <Text style={{ color: C.primary, fontFamily: "Inter_500Medium", fontSize: 14 }}>
            {sendingOtp ? "Resending..." : "Didn't receive it? Resend OTP"}
          </Text>
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    );
  }

  return (
    <>
      <KeyboardAwareScrollViewCompat
        style={[{ flex: 1, backgroundColor: C.background }]}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: isWeb ? 67 : insets.top + 20,
          paddingBottom: isWeb ? 34 : insets.bottom + 20,
          paddingHorizontal: 24,
        }}
      >
        <View style={{ flexDirection: "row", marginBottom: 24 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Feather name="x" size={22} color={C.text} />
          </Pressable>
        </View>

        <Text style={[S.title, { color: C.text }]}>Create Account</Text>
        <Text style={[S.subtitle, { color: C.textSecondary }]}>Join your campus community</Text>

        <View style={[S.roleToggle, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
          <Pressable
            style={[S.roleBtn, role === "student" && { backgroundColor: C.primary }]}
            onPress={() => { setRole("student"); setError(""); }}
          >
            <Feather name="book" size={14} color={role === "student" ? "#fff" : C.textSecondary} />
            <Text style={[S.roleBtnText, { color: role === "student" ? "#fff" : C.textSecondary, fontFamily: "Inter_500Medium" }]}>Student</Text>
          </Pressable>
          <Pressable
            style={[S.roleBtn, role === "provider" && { backgroundColor: C.primary }]}
            onPress={() => { setRole("provider"); setError(""); }}
          >
            <Feather name="briefcase" size={14} color={role === "provider" ? "#fff" : C.textSecondary} />
            <Text style={[S.roleBtnText, { color: role === "provider" ? "#fff" : C.textSecondary, fontFamily: "Inter_500Medium" }]}>Service Provider</Text>
          </Pressable>
        </View>

        <View style={{ gap: 16 }}>
          <View>
            <Text style={[S.label, { color: C.textSecondary }]}>Full Name *</Text>
            <View style={[S.inputWrapper, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
              <Feather name="user" size={17} color={C.textTertiary} />
              <TextInput
                style={[S.input, { color: C.text, fontFamily: "Inter_400Regular" }]}
                placeholder="Your full name"
                placeholderTextColor={C.textTertiary}
                value={name}
                onChangeText={v => { setName(v); setError(""); }}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View>
            <Text style={[S.label, { color: C.textSecondary }]}>College *</Text>
            <Pressable
              style={[S.inputWrapper, { backgroundColor: C.backgroundSecondary, borderColor: selectedCollege ? C.primary : C.border }]}
              onPress={() => setShowCollegePicker(true)}
            >
              <Feather name="map-pin" size={17} color={selectedCollege ? C.primary : C.textTertiary} />
              <Text style={[S.input, { color: selectedCollege ? C.text : C.textTertiary, fontFamily: "Inter_400Regular" }]}>
                {selectedCollege ? selectedCollege.name : "Select your college"}
              </Text>
              <Feather name="chevron-down" size={17} color={C.textTertiary} />
            </Pressable>
            {selectedCollege && (
              <Text style={{ color: C.textTertiary, fontSize: 11, marginTop: 4, fontFamily: "Inter_400Regular" }}>
                Domain: @{selectedCollege.domain}
              </Text>
            )}
          </View>

          <View>
            <Text style={[S.label, { color: C.textSecondary }]}>College Email *</Text>
            <View style={[S.inputWrapper, {
              backgroundColor: C.backgroundSecondary,
              borderColor: email && selectedCollege && !domainValid ? C.error : C.border,
            }]}>
              <Feather name="mail" size={17} color={C.textTertiary} />
              <TextInput
                style={[S.input, { color: C.text, fontFamily: "Inter_400Regular" }]}
                placeholder={selectedCollege ? `you@${selectedCollege.domain}` : "your@college.edu"}
                placeholderTextColor={C.textTertiary}
                value={email}
                onChangeText={v => { setEmail(v); setError(""); }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {email.includes("@") && selectedCollege && (
                <Feather
                  name={domainValid ? "check-circle" : "x-circle"}
                  size={16}
                  color={domainValid ? "#22c55e" : C.error}
                />
              )}
            </View>
            {email && selectedCollege && !domainValid && (
              <Text style={{ color: C.error, fontSize: 11, marginTop: 4, fontFamily: "Inter_400Regular" }}>
                Must use your {selectedCollege.name} email (@{selectedCollege.domain})
              </Text>
            )}
          </View>

          <View>
            <Text style={[S.label, { color: C.textSecondary }]}>Password *</Text>
            <View style={[S.inputWrapper, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
              <Feather name="lock" size={17} color={C.textTertiary} />
              <TextInput
                style={[S.input, { color: C.text, fontFamily: "Inter_400Regular" }]}
                placeholder="Min. 6 characters"
                placeholderTextColor={C.textTertiary}
                value={password}
                onChangeText={v => { setPassword(v); setError(""); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPassword(p => !p)} hitSlop={8}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={17} color={C.textTertiary} />
              </Pressable>
            </View>
          </View>

          <View>
            <Text style={[S.label, { color: C.textSecondary }]}>Program</Text>
            <View style={S.chipsRow}>
              {PROGRAMS.map(p => (
                <Pressable
                  key={p}
                  style={[S.chip, { borderColor: C.border, backgroundColor: program === p ? C.primary : C.backgroundSecondary }]}
                  onPress={() => setProgram(p)}
                >
                  <Text style={[S.chipText, { color: program === p ? "#fff" : C.textSecondary, fontFamily: "Inter_500Medium" }]}>{p}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {role === "provider" && (
            <View>
              <Text style={[S.label, { color: C.textSecondary }]}>Services You Offer *</Text>
              <Text style={{ color: C.textTertiary, fontSize: 12, marginBottom: 10, fontFamily: "Inter_400Regular" }}>
                Select all that apply — these will appear on your profile
              </Text>
              {ALL_SERVICES.map(svc => {
                const selected = selectedServices.includes(svc.id);
                return (
                  <Pressable
                    key={svc.id}
                    style={[S.serviceCard, {
                      backgroundColor: selected ? C.primaryLight : C.backgroundSecondary,
                      borderColor: selected ? C.primary : C.border,
                    }]}
                    onPress={() => toggleService(svc.id)}
                  >
                    <View style={[S.serviceIconWrap, { backgroundColor: selected ? C.primary : C.border }]}>
                      <Feather name={svc.icon as any} size={16} color={selected ? "#fff" : C.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[S.serviceName, { color: C.text, fontFamily: "Inter_600SemiBold" }]}>{svc.label}</Text>
                      <Text style={[S.serviceDesc, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>{svc.desc}</Text>
                    </View>
                    <View style={[S.serviceCheck, {
                      backgroundColor: selected ? C.primary : "transparent",
                      borderColor: selected ? C.primary : C.border,
                    }]}>
                      {selected && <Feather name="check" size={12} color="#fff" />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {error ? (
          <View style={[S.errorBox, { backgroundColor: C.errorLight, marginTop: 16 }]}>
            <Feather name="alert-circle" size={14} color={C.error} />
            <Text style={[S.errorText, { color: C.error }]}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={[S.primaryBtn, { backgroundColor: C.primary, marginTop: 20 }, sendingOtp && { opacity: 0.7 }]}
          onPress={handleSendOtp}
          disabled={sendingOtp}
        >
          {sendingOtp ? <ActivityIndicator color="#fff" /> : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={[S.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Continue</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </View>
          )}
        </Pressable>

        <View style={S.footer}>
          <Text style={[S.footerText, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>Already have an account? </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={[S.footerLink, { color: C.primary, fontFamily: "Inter_600SemiBold" }]}>Sign In</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>

      <Modal visible={showCollegePicker} animationType="slide" transparent>
        <View style={[S.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[S.modalSheet, { backgroundColor: C.surface }]}>
            <View style={S.modalHandle} />
            <Text style={[S.modalTitle, { color: C.text, fontFamily: "Inter_700Bold" }]}>Select College</Text>

            <View style={[S.searchWrapper, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
              <Feather name="search" size={16} color={C.textTertiary} />
              <TextInput
                style={[{ flex: 1, fontSize: 15, color: C.text, fontFamily: "Inter_400Regular" }]}
                placeholder="Search colleges..."
                placeholderTextColor={C.textTertiary}
                value={collegeSearch}
                onChangeText={setCollegeSearch}
                autoFocus
              />
              {collegeSearch ? (
                <Pressable onPress={() => setCollegeSearch("")} hitSlop={8}>
                  <Feather name="x" size={16} color={C.textTertiary} />
                </Pressable>
              ) : null}
            </View>

            <FlatList
              data={filteredColleges}
              keyExtractor={c => c.id}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => {
                const sel = selectedCollege?.id === item.id;
                return (
                  <Pressable
                    style={[S.collegeItem, { borderBottomColor: C.border, backgroundColor: sel ? C.primaryLight : "transparent" }]}
                    onPress={() => { setSelectedCollege(item); setEmail(""); setShowCollegePicker(false); setCollegeSearch(""); setError(""); }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[S.collegeName, { color: sel ? C.primary : C.text, fontFamily: "Inter_600SemiBold" }]}>{item.name}</Text>
                      <Text style={[S.collegeDomain, { color: C.textTertiary, fontFamily: "Inter_400Regular" }]}>@{item.domain}</Text>
                    </View>
                    {sel && <Feather name="check-circle" size={18} color={C.primary} />}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text style={{ color: C.textSecondary, textAlign: "center", padding: 24, fontFamily: "Inter_400Regular" }}>No colleges found</Text>
              }
            />

            <Pressable
              style={[S.modalCancelBtn, { borderColor: C.border }]}
              onPress={() => { setShowCollegePicker(false); setCollegeSearch(""); }}
            >
              <Text style={{ color: C.textSecondary, fontFamily: "Inter_500Medium", fontSize: 15 }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

function styles(C: any) {
  return StyleSheet.create({
    title: { fontSize: 28, marginBottom: 8, fontFamily: "Inter_700Bold" },
    subtitle: { fontSize: 15, marginBottom: 28, fontFamily: "Inter_400Regular" },
    roleToggle: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 4, marginBottom: 24, gap: 4 },
    roleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
    roleBtnText: { fontSize: 14 },
    label: { fontSize: 13, marginBottom: 8, letterSpacing: 0.3, fontFamily: "Inter_500Medium" },
    inputWrapper: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
    input: { flex: 1, fontSize: 16 },
    chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    chipText: { fontSize: 13 },
    errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10 },
    errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
    primaryBtn: { paddingVertical: 16, borderRadius: 14, alignItems: "center", marginBottom: 20, shadowColor: "#5B4FE8", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    primaryBtnText: { color: "#fff", fontSize: 16 },
    footer: { flexDirection: "row", justifyContent: "center", paddingBottom: 20 },
    footerText: { fontSize: 14 },
    footerLink: { fontSize: 14 },
    serviceCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
    serviceIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    serviceName: { fontSize: 14, marginBottom: 2 },
    serviceDesc: { fontSize: 12 },
    serviceCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
    otpIconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    otpRow: { flexDirection: "row", gap: 10, justifyContent: "center", marginBottom: 28 },
    otpBox: { width: 46, height: 56, borderRadius: 14, borderWidth: 2, fontSize: 22, textAlign: "center" },
    modalOverlay: { flex: 1, justifyContent: "flex-end" },
    modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
    modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#ccc", alignSelf: "center", marginBottom: 16 },
    modalTitle: { fontSize: 18, marginBottom: 16 },
    searchWrapper: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
    collegeItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1 },
    collegeName: { fontSize: 15, marginBottom: 2 },
    collegeDomain: { fontSize: 12 },
    modalCancelBtn: { marginTop: 12, paddingVertical: 14, borderRadius: 14, alignItems: "center", borderWidth: 1 },
  });
}
