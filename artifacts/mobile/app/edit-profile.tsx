import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Image,
  Platform,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

type FieldId = "name" | "bio" | "college" | "program" | "phone";

interface ProfileData {
  name: string;
  bio: string;
  college: string;
  program: string;
  phone: string;
}

interface FieldConfig {
  id: FieldId;
  icon: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: "default" | "phone-pad";
}

const FIELDS: FieldConfig[] = [
  { id: "name", icon: "user", label: "Name", placeholder: "Your full name" },
  { id: "bio", icon: "align-left", label: "Bio", placeholder: "Tell your campus story...", multiline: true },
  { id: "college", icon: "map-pin", label: "College", placeholder: "Your college name" },
  { id: "program", icon: "book-open", label: "Program", placeholder: "e.g. BCA, BTech CSE" },
  { id: "phone", icon: "phone", label: "Phone", placeholder: "+91 98765 43210", keyboardType: "phone-pad" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, apiRequest, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [activeField, setActiveField] = useState<FieldId | null>(null);
  const [formData, setFormData] = useState<ProfileData>({
    name: user?.name || "",
    bio: user?.bio || "",
    college: user?.college || "",
    program: user?.program || "",
    phone: user?.phone || "",
  });

  const isDirty =
    formData.name !== (user?.name || "") ||
    formData.bio !== (user?.bio || "") ||
    formData.college !== (user?.college || "") ||
    formData.program !== (user?.program || "") ||
    formData.phone !== (user?.phone || "");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/users/me/profile", {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save");
      return data;
    },
    onSuccess: (data) => {
      updateUser(data);
      queryClient.invalidateQueries({ queryKey: ["userPosts"] });
      showToast("Profile updated!", "success");
      router.back();
    },
    onError: (err: any) => showToast(err.message || "Failed to update profile", "error"),
  });

  const pickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const base64DataUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        let avatarUrl = base64DataUri;
        if (base64DataUri.startsWith("data:image/")) {
          const uploadRes = await apiRequest("/upload", {
            method: "POST",
            body: JSON.stringify({ base64: base64DataUri, folder: "campusconnect/avatars" }),
          });
          if (uploadRes.ok) {
            const { url } = await uploadRes.json();
            avatarUrl = url;
          } else {
            showToast("Failed to upload image", "error");
            return;
          }
        }

        const res = await apiRequest("/users/me/profile", {
          method: "PUT",
          body: JSON.stringify({ avatar: avatarUrl }),
        });
        if (res.ok) {
          const data = await res.json();
          updateUser(data);
          showToast("Profile picture updated!", "success");
        } else {
          showToast("Failed to update profile picture", "error");
        }
      }
    } catch {
      showToast("Could not open image picker", "error");
    }
  };

  const toggleField = useCallback((id: FieldId) => {
    LayoutAnimation.configureNext({
      duration: 250,
      create: { type: "easeInEaseOut", property: "opacity" },
      update: { type: "spring", springDamping: 0.8 },
      delete: { type: "easeInEaseOut", property: "opacity" },
    });
    setActiveField((prev) => (prev === id ? null : id));
  }, []);

  const handleChange = (id: FieldId, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  if (!user) return null;

  const paddingTop = Platform.OS === "web" ? 16 : insets.top;

  return (
    <View style={[styles.screen, { paddingTop }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          activeOpacity={0.7}
          hitSlop={10}
        >
          <Feather name="chevron-left" size={26} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={() => {
            setActiveField(null);
            if (isDirty) saveMutation.mutate();
            else router.back();
          }}
          style={styles.headerBtn}
          activeOpacity={0.7}
          hitSlop={10}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color="#5B4FE8" />
          ) : (
            <Text style={styles.doneBtn}>Done</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={pickAvatar}
            activeOpacity={0.85}
            style={styles.avatarWrapper}
          >
            <View style={styles.avatarRing}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
              ) : (
                <LinearGradient
                  colors={["#5B4FE8", "#9B8FFF"]}
                  style={styles.avatarImg}
                >
                  <Text style={styles.avatarInitials}>
                    {getInitials(user.name)}
                  </Text>
                </LinearGradient>
              )}
            </View>
            <View style={styles.cameraBadge}>
              <Feather name="camera" size={16} color="#5B4FE8" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarName}>{formData.name || user.name}</Text>
          <Text style={styles.avatarSub}>{formData.college || user.college}</Text>
        </View>

        {/* Field List */}
        <View style={styles.fieldList}>
          {FIELDS.map((field) => {
            const isActive = activeField === field.id;
            const value = formData[field.id];

            return (
              <View
                key={field.id}
                style={[styles.fieldCard, isActive && styles.fieldCardActive]}
              >
                {/* Row tap target */}
                <TouchableOpacity
                  style={styles.fieldRow}
                  onPress={() => toggleField(field.id)}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={field.icon as any}
                    size={18}
                    color={isActive ? "#5B4FE8" : "#1A1A2E99"}
                  />
                  <Text
                    style={[styles.fieldLabel, isActive && styles.fieldLabelActive]}
                  >
                    {field.label}
                  </Text>
                  <View style={styles.fieldRowRight}>
                    {!isActive && (
                      <Text style={styles.fieldValue} numberOfLines={1}>
                        {value || "—"}
                      </Text>
                    )}
                    <Feather
                      name={isActive ? "chevron-down" : "chevron-right"}
                      size={18}
                      color={isActive ? "#5B4FE8" : "#1A1A2E44"}
                    />
                  </View>
                </TouchableOpacity>

                {/* Expanded inline input */}
                {isActive && (
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={[styles.input, field.multiline && styles.inputMultiline]}
                      value={value}
                      onChangeText={(v) => handleChange(field.id, v)}
                      placeholder={field.placeholder}
                      placeholderTextColor="#1A1A2E55"
                      keyboardType={field.keyboardType || "default"}
                      multiline={field.multiline}
                      textAlignVertical={field.multiline ? "top" : "center"}
                      autoFocus
                      returnKeyType={field.multiline ? "default" : "done"}
                      onSubmitEditing={() => !field.multiline && setActiveField(null)}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating Save pill — visible only when changes are pending */}
      {isDirty && (
        <View style={[styles.savePillWrap, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={styles.savePill}
            onPress={() => saveMutation.mutate()}
            activeOpacity={0.85}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.savePillText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FAF8F4",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: "#FAF8F4",
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#1A1A2E",
    letterSpacing: -0.3,
  },
  doneBtn: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#5B4FE8",
  },

  // Scroll
  scrollContent: {
    paddingBottom: 120,
  },

  // Avatar
  avatarSection: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 28,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 14,
  },
  avatarRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "rgba(91,79,232,0.2)",
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 38,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#5B4FE8",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#1A1A2E",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  avatarSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#1A1A2E88",
  },

  // Fields
  fieldList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  fieldCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  fieldCardActive: {
    borderColor: "rgba(91,79,232,0.2)",
    shadowColor: "#5B4FE8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  fieldLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#1A1A2E",
    flex: 1,
  },
  fieldLabelActive: {
    color: "#5B4FE8",
  },
  fieldRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: 180,
  },
  fieldValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#1A1A2E77",
    textAlign: "right",
    flexShrink: 1,
  },

  // Input
  inputWrap: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 2,
  },
  input: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#1A1A2E",
    borderBottomWidth: 2,
    borderBottomColor: "#5B4FE8",
    paddingBottom: 8,
    paddingTop: 0,
  },
  inputMultiline: {
    minHeight: 64,
    lineHeight: 22,
  },

  // Floating save
  savePillWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
  },
  savePill: {
    height: 52,
    backgroundColor: "#5B4FE8",
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#5B4FE8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  savePillText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
});
