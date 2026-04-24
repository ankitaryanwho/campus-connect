import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, Platform, Modal, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "/api";
const PURPLE = "#5B4FE8";
const CREAM = "#FAF8F4";
const TEXT = "#1A1A2E";
const BORDER = "#E8E4F0";
const ICON_BG = "#EDE9FE";

const PROGRAMS = ["BCA", "BTech", "MBA", "MTech", "BSc", "BCom", "BA", "Other"];

const ALL_SERVICES = [
  { id: "assignments", label: "Assignments", icon: "file-text" as const, desc: "Help students with assignment work" },
  { id: "certifications", label: "Certifications", icon: "award" as const, desc: "Help with certification projects" },
  { id: "deliveries", label: "Deliveries", icon: "truck" as const, desc: "Campus delivery & pickup runs" },
  { id: "tasks", label: "Tasks & Gigs", icon: "clipboard" as const, desc: "Freelance tasks for students" },
];

const YEARS = [
  { value: 1, label: "1st Year" },
  { value: 2, label: "2nd Year" },
  { value: 3, label: "3rd Year" },
  { value: 4, label: "4th Year" },
];

const GENDERS = [
  { value: "male", label: "Male", emoji: "👨" },
  { value: "female", label: "Female", emoji: "👩" },
  { value: "other", label: "Other", emoji: "🧑" },
];

interface College {
  id: string;
  name: string;
  domain: string;
}

export default function RegisterScreen() {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [step, setStep] = useState<"form" | "otp">("form");

  const [role, setRole] = useState<"student" | "provider">("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [program, setProgram] = useState("BCA");
  const [year, setYear] = useState(1);
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<string | null>(null);
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
    if (cleaned && idx < 5) otpRefs.current[idx + 1]?.focus();
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
        year,
        phone: phone.trim() || undefined,
        gender: gender || undefined,
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

  if (step === "otp") {
    return (
      <View style={s.screen}>
        <View style={s.blob1} />
        <View style={s.blob2} />
        <View style={s.blob3} />
        <View style={s.ring} />

        <KeyboardAwareScrollViewCompat
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: isWeb ? 60 : insets.top + 24,
            paddingBottom: isWeb ? 40 : insets.bottom + 32,
            paddingHorizontal: 16,
          }}
        >
          <View style={s.card}>
            <Pressable
              onPress={() => { setStep("form"); setOtp(["","","","","",""]); setError(""); }}
              style={{ marginBottom: 24 }}
            >
              <Feather name="arrow-left" size={22} color={TEXT} />
            </Pressable>

            <View style={{ alignItems: "center", marginBottom: 28 }}>
              <View style={s.otpIconWrap}>
                <Feather name="mail" size={28} color={PURPLE} />
              </View>
              <Text style={s.otpTitle}>Verify your email</Text>
              <Text style={s.otpSubtitle}>
                We sent a 6-digit code to{"\n"}
                <Text style={{ color: PURPLE, fontFamily: "Inter_600SemiBold" }}>
                  {email.trim().toLowerCase()}
                </Text>
              </Text>
              <Text style={s.otpHint}>
                Also check your spam/junk folder if you don't see it
              </Text>
            </View>

            <View style={s.otpRow}>
              {otp.map((digit, idx) => (
                <TextInput
                  key={idx}
                  ref={r => { otpRefs.current[idx] = r; }}
                  style={[s.otpBox, { borderColor: digit ? PURPLE : BORDER }]}
                  value={digit}
                  onChangeText={v => handleOtpChange(v, idx)}
                  onKeyPress={e => handleOtpKeyPress(e, idx)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                />
              ))}
            </View>

            {error ? (
              <View style={s.errorBox}>
                <Feather name="alert-circle" size={16} color="#C2410C" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={[s.primaryBtn, loading && { opacity: 0.7 }]}
              onPress={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.primaryBtnText}>Verify & Create Account</Text>
              )}
            </Pressable>

            <Pressable
              onPress={handleSendOtp}
              style={{ alignItems: "center", marginTop: 16 }}
              disabled={sendingOtp}
            >
              <Text style={{ color: PURPLE, fontFamily: "Inter_500Medium", fontSize: 14 }}>
                {sendingOtp ? "Resending..." : "Didn't receive it? Resend OTP"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAwareScrollViewCompat>
      </View>
    );
  }

  return (
    <>
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
        >
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.logoBox}>
                <Feather name="layers" size={28} color="#fff" />
              </View>
              <View style={s.titleRow}>
                <Text style={s.appName}>CampusConnect</Text>
                <Text style={s.version}>v2.0</Text>
              </View>

              <View style={s.tabRow}>
                <Pressable
                  style={s.tab}
                  onPress={() => router.back()}
                >
                  <Text style={[s.tabText, s.tabTextInactive]}>Sign In</Text>
                </Pressable>
                <View style={[s.tab, s.tabActive]}>
                  <Text style={[s.tabText, s.tabTextActive]}>Sign Up</Text>
                </View>
              </View>
            </View>

            <Text style={s.sectionLabel}>I AM A...</Text>
            <View style={s.roleRow}>
              <Pressable
                style={[s.roleCard, role === "student" && s.roleCardActive]}
                onPress={() => { setRole("student"); setError(""); }}
              >
                <Text style={s.roleEmoji}>📚</Text>
                <Text style={[s.roleTitle, role === "student" && { color: PURPLE }]}>Student</Text>
                <Text style={s.roleSubtitle}>Looking for help</Text>
              </Pressable>
              <Pressable
                style={[s.roleCard, role === "provider" && s.roleCardActive]}
                onPress={() => { setRole("provider"); setError(""); }}
              >
                <Text style={s.roleEmoji}>💼</Text>
                <Text style={[s.roleTitle, role === "provider" && { color: PURPLE }]}>Provider</Text>
                <Text style={s.roleSubtitle}>Offering services</Text>
              </Pressable>
            </View>

            <View style={{ gap: 12, marginTop: 20 }}>
              <View style={s.inputWrap}>
                <View style={s.iconCircle}>
                  <Feather name="user" size={16} color={PURPLE} />
                </View>
                <TextInput
                  style={s.input}
                  placeholder="Full Name"
                  placeholderTextColor={TEXT + "55"}
                  value={name}
                  onChangeText={v => { setName(v); setError(""); }}
                  autoCapitalize="words"
                />
              </View>

              <Pressable
                style={[s.inputWrap, selectedCollege && { borderColor: PURPLE, borderWidth: 1 }]}
                onPress={() => setShowCollegePicker(true)}
              >
                <View style={s.iconCircle}>
                  <Feather name="map-pin" size={16} color={PURPLE} />
                </View>
                <Text style={[s.input, { flex: 1, color: selectedCollege ? TEXT : TEXT + "55" }]}>
                  {selectedCollege ? selectedCollege.name : "Select your college"}
                </Text>
                <Feather name="chevron-down" size={18} color={TEXT + "55"} />
              </Pressable>
              {selectedCollege && (
                <Text style={s.hintText}>Domain: @{selectedCollege.domain}</Text>
              )}

              <View style={[
                s.inputWrap,
                email && selectedCollege && !domainValid && { borderColor: "#EF4444", borderWidth: 1 },
              ]}>
                <View style={s.iconCircle}>
                  <Feather name="mail" size={16} color={PURPLE} />
                </View>
                <TextInput
                  style={s.input}
                  placeholder={selectedCollege ? `you@${selectedCollege.domain}` : "College Email"}
                  placeholderTextColor={TEXT + "55"}
                  value={email}
                  onChangeText={v => { setEmail(v); setError(""); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {email.includes("@") && selectedCollege && (
                  <Feather
                    name={domainValid ? "check-circle" : "x-circle"}
                    size={16}
                    color={domainValid ? "#22c55e" : "#EF4444"}
                  />
                )}
              </View>
              {email && selectedCollege && !domainValid && (
                <Text style={[s.hintText, { color: "#EF4444" }]}>
                  Must use your {selectedCollege.name} email (@{selectedCollege.domain})
                </Text>
              )}

              <View style={s.inputWrap}>
                <View style={s.iconCircle}>
                  <Feather name="lock" size={16} color={PURPLE} />
                </View>
                <TextInput
                  style={s.input}
                  placeholder="Password (min. 6 chars)"
                  placeholderTextColor={TEXT + "55"}
                  value={password}
                  onChangeText={v => { setPassword(v); setError(""); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowPassword(p => !p)} hitSlop={8}>
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={18}
                    color={TEXT + "66"}
                  />
                </Pressable>
              </View>

              <View style={s.inputWrap}>
                <View style={s.iconCircle}>
                  <Feather name="phone" size={16} color={PURPLE} />
                </View>
                <TextInput
                  style={s.input}
                  placeholder="Phone Number (Optional)"
                  placeholderTextColor={TEXT + "55"}
                  value={phone}
                  onChangeText={v => { setPhone(v); setError(""); }}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={{ marginTop: 24 }}>
              <Text style={s.sectionLabel}>Program</Text>
              <View style={s.chipsWrap}>
                {PROGRAMS.map(p => (
                  <Pressable
                    key={p}
                    style={[s.chip, program === p && s.chipActive]}
                    onPress={() => setProgram(p)}
                  >
                    <Text style={[s.chipText, program === p && s.chipTextActive]}>{p}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={{ marginTop: 20 }}>
              <Text style={s.sectionLabel}>Academic Year</Text>
              <View style={s.chipsWrap}>
                {YEARS.map(y => (
                  <Pressable
                    key={y.value}
                    style={[s.chip, year === y.value && s.chipActive]}
                    onPress={() => setYear(y.value)}
                  >
                    <Text style={[s.chipText, year === y.value && s.chipTextActive]}>{y.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={{ marginTop: 20 }}>
              <Text style={s.sectionLabel}>
                Gender{" "}
                <Text style={{ color: TEXT + "66", fontFamily: "Inter_400Regular", fontSize: 11 }}>
                  (optional)
                </Text>
              </Text>
              <View style={s.chipsWrap}>
                {GENDERS.map(g => (
                  <Pressable
                    key={g.value}
                    style={[s.chip, gender === g.value && s.chipActive]}
                    onPress={() => setGender(prev => prev === g.value ? null : g.value)}
                  >
                    <Text style={[s.chipText, gender === g.value && s.chipTextActive]}>
                      {g.emoji} {g.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {role === "provider" && (
              <View style={s.servicesBox}>
                <Text style={s.servicesLabel}>Services You Offer</Text>
                <Text style={s.servicesHint}>Select all that apply</Text>
                {ALL_SERVICES.map(svc => {
                  const selected = selectedServices.includes(svc.id);
                  return (
                    <Pressable
                      key={svc.id}
                      style={[s.serviceRow, selected && s.serviceRowActive]}
                      onPress={() => toggleService(svc.id)}
                    >
                      <View style={[s.serviceIcon, selected && { backgroundColor: PURPLE }]}>
                        <Feather
                          name={svc.icon}
                          size={16}
                          color={selected ? "#fff" : TEXT + "66"}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.serviceName, selected && { color: TEXT }]}>{svc.label}</Text>
                        <Text style={s.serviceDesc}>{svc.desc}</Text>
                      </View>
                      <View style={[s.serviceCheck, selected && s.serviceCheckActive]}>
                        {selected && <Feather name="check" size={12} color="#fff" />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {error ? (
              <View style={[s.errorBox, { marginTop: 16 }]}>
                <Feather name="alert-circle" size={16} color="#C2410C" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={[s.primaryBtn, { marginTop: 24 }, sendingOtp && { opacity: 0.7 }]}
              onPress={handleSendOtp}
              disabled={sendingOtp}
            >
              {sendingOtp ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={s.primaryBtnText}>Continue</Text>
                  <Feather name="arrow-right" size={18} color="#fff" />
                </View>
              )}
            </Pressable>
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>Already have an account? </Text>
            <Pressable onPress={() => router.back()}>
              <Text style={s.footerLink}>Sign In →</Text>
            </Pressable>
          </View>
        </KeyboardAwareScrollViewCompat>
      </View>

      <Modal visible={showCollegePicker} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Select College</Text>
            <View style={s.modalSearch}>
              <Feather name="search" size={16} color={TEXT + "66"} />
              <TextInput
                style={s.modalSearchInput}
                placeholder="Search colleges..."
                placeholderTextColor={TEXT + "55"}
                value={collegeSearch}
                onChangeText={setCollegeSearch}
              />
            </View>
            <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              {filteredColleges.length === 0 ? (
                <Text style={{ textAlign: "center", color: TEXT + "66", padding: 24, fontFamily: "Inter_400Regular" }}>
                  No colleges found
                </Text>
              ) : (
                filteredColleges.map(item => (
                  <Pressable
                    key={item.id}
                    style={[
                      s.collegeItem,
                      selectedCollege?.id === item.id && { backgroundColor: ICON_BG },
                    ]}
                    onPress={() => {
                      setSelectedCollege(item);
                      setEmail("");
                      setCollegeSearch("");
                      setShowCollegePicker(false);
                      setError("");
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.collegeName}>{item.name}</Text>
                      <Text style={s.collegeDomain}>@{item.domain}</Text>
                    </View>
                    {selectedCollege?.id === item.id && (
                      <Feather name="check-circle" size={18} color={PURPLE} />
                    )}
                  </Pressable>
                ))
              )}
            </ScrollView>
            <Pressable
              style={s.modalClose}
              onPress={() => { setShowCollegePicker(false); setCollegeSearch(""); }}
            >
              <Text style={s.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },

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
    backgroundColor: PURPLE, opacity: 0.08, bottom: 80, right: -32,
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
  appName: { fontSize: 20, fontFamily: "Inter_700Bold", color: TEXT },
  version: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#9CA3AF" },

  tabRow: {
    flexDirection: "row",
    backgroundColor: CREAM,
    borderRadius: 100,
    padding: 4,
    borderWidth: 1,
    borderColor: BORDER,
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

  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: TEXT,
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  roleRow: { flexDirection: "row", gap: 12 },
  roleCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: BORDER,
    backgroundColor: CREAM,
  },
  roleCardActive: {
    borderColor: PURPLE,
    backgroundColor: "#F3F2FE",
  },
  roleEmoji: { fontSize: 28, marginBottom: 6 },
  roleTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: TEXT,
    marginBottom: 2,
  },
  roleSubtitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: TEXT + "66",
    textAlign: "center",
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
    backgroundColor: ICON_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: TEXT,
    fontFamily: "Inter_400Regular",
  },
  hintText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: TEXT + "66",
    marginTop: -4,
    marginLeft: 4,
  },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.20,
    shadowRadius: 4,
    elevation: 2,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: TEXT + "80",
  },
  chipTextActive: { color: "#fff" },

  servicesBox: {
    marginTop: 24,
    padding: 20,
    backgroundColor: "#F3F2FE",
    borderWidth: 1,
    borderColor: PURPLE + "33",
    borderRadius: 16,
    gap: 8,
  },
  servicesLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: PURPLE,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  servicesHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: TEXT + "66",
    marginBottom: 8,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: "transparent",
  },
  serviceRowActive: {
    backgroundColor: "#fff",
    borderColor: PURPLE + "44",
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceIcon: {
    width: 36, height: 36,
    borderRadius: 10,
    backgroundColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: TEXT + "99",
    marginBottom: 2,
  },
  serviceDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: TEXT + "66",
  },
  serviceCheck: {
    width: 22, height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceCheckActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: "#C2410C",
    fontFamily: "Inter_500Medium",
  },

  primaryBtn: {
    backgroundColor: PURPLE,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
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

  // OTP step
  otpIconWrap: {
    width: 64, height: 64,
    borderRadius: 20,
    backgroundColor: ICON_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  otpTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: TEXT,
    marginTop: 16,
    marginBottom: 8,
  },
  otpSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: TEXT + "99",
    textAlign: "center",
    lineHeight: 22,
  },
  otpHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: TEXT + "66",
    textAlign: "center",
    marginTop: 8,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 20,
  },
  otpBox: {
    flex: 1,
    height: 52,
    backgroundColor: CREAM,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: TEXT,
    textAlign: "center",
  },

  // College modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  modalHandle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: BORDER,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: TEXT,
    marginBottom: 16,
  },
  modalSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: CREAM,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 15,
    color: TEXT,
    fontFamily: "Inter_400Regular",
  },
  collegeItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
    gap: 12,
  },
  collegeName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: TEXT,
    marginBottom: 2,
  },
  collegeDomain: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: TEXT + "66",
  },
  modalClose: {
    marginTop: 12,
    backgroundColor: CREAM,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  modalCloseText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: TEXT + "99",
  },
});
