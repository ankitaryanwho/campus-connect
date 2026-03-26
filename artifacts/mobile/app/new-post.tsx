import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  useColorScheme, ActivityIndicator, Platform,
  Image, ScrollView, KeyboardAvoidingView, Switch,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

export default function NewPostScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { apiRequest, user } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [content, setContent] = useState("");
  const [mediaUris, setMediaUris] = useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const isWeb = Platform.OS === "web";

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: true,
        selectionLimit: 4,
      });
      if (!result.canceled && result.assets.length > 0) {
        const uris = result.assets.map(a =>
          a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri
        );
        setMediaUris(prev => [...prev, ...uris].slice(0, 4));
      }
    } catch {
      showToast("Could not open image picker", "error");
    }
  };

  const removeMedia = (idx: number) => {
    setMediaUris(prev => prev.filter((_, i) => i !== idx));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!content.trim() && mediaUris.length === 0) throw new Error("Please write something first");
      const res = await apiRequest("/posts", {
        method: "POST",
        body: JSON.stringify({ content: content.trim(), mediaUrls: mediaUris, isAnonymous }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create post");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      showToast(isAnonymous ? "Anonymous post shared!" : "Post shared!", "success");
      router.back();
    },
    onError: (err: any) => showToast(err.message || "Failed to post", "error"),
  });

  const canPost = content.trim().length > 0 || mediaUris.length > 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
      <View style={[styles.container, { backgroundColor: C.background, paddingTop: isWeb ? 67 : insets.top + 10 }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <Pressable onPress={() => router.back()} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: C.text, fontFamily: "Inter_600SemiBold" }]}>New Post</Text>
          <Pressable
            style={[styles.postBtn, { backgroundColor: canPost ? C.primary : C.backgroundSecondary }, createMutation.isPending && { opacity: 0.7 }]}
            onPress={() => createMutation.mutate()}
            disabled={!canPost || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={[styles.postBtnText, { color: canPost ? "#fff" : C.textTertiary, fontFamily: "Inter_600SemiBold" }]}>Post</Text>
            )}
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* User Info / Anonymous toggle */}
          <View style={styles.userRow}>
            {isAnonymous ? (
              <View style={[styles.anonAvatar]}>
                <Feather name="user-x" size={22} color="#fff" />
              </View>
            ) : (
              <View style={[styles.userAvatar, { backgroundColor: C.primary }]}>
                <Text style={[styles.userAvatarText, { fontFamily: "Inter_700Bold" }]}>
                  {user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.userName, { color: isAnonymous ? "#6B7280" : C.text, fontFamily: "Inter_600SemiBold" }]}>
                {isAnonymous ? "Profile Hidden" : user?.name}
              </Text>
              <Text style={[styles.userProgram, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {isAnonymous
                  ? `${user?.program || ""}${user?.year ? ` • ${user.year}${user.year === 1 ? "st" : user.year === 2 ? "nd" : user.year === 3 ? "rd" : "th"} Year` : ""}` || "Anonymous"
                  : user?.program || user?.college || "Student"}
              </Text>
            </View>
          </View>

          {/* Anonymous Toggle */}
          <Pressable
            style={[styles.anonToggleRow, { backgroundColor: isAnonymous ? "#F0FDF4" : C.backgroundSecondary, borderColor: isAnonymous ? "#10B981" : C.border }]}
            onPress={() => setIsAnonymous(prev => !prev)}
          >
            <View style={styles.anonToggleLeft}>
              <Feather name={isAnonymous ? "eye-off" : "eye"} size={18} color={isAnonymous ? "#10B981" : C.textSecondary} />
              <View>
                <Text style={[styles.anonToggleTitle, { color: isAnonymous ? "#10B981" : C.text, fontFamily: "Inter_600SemiBold" }]}>
                  {isAnonymous ? "Posting Anonymously" : "Post Anonymously"}
                </Text>
                <Text style={[styles.anonToggleSub, { color: C.textTertiary, fontFamily: "Inter_400Regular" }]}>
                  {isAnonymous ? "Only program & year are visible to others" : "Hide your identity from other users"}
                </Text>
              </View>
            </View>
            <Switch
              value={isAnonymous}
              onValueChange={setIsAnonymous}
              trackColor={{ false: C.border, true: "#10B981" }}
              thumbColor="#fff"
            />
          </Pressable>

          {/* Content Input */}
          <TextInput
            style={[styles.textInput, { color: C.text, fontFamily: "Inter_400Regular" }]}
            placeholder="What's on your mind? Share updates, ask questions, find study partners..."
            placeholderTextColor={C.textTertiary}
            multiline
            value={content}
            onChangeText={setContent}
            autoFocus
            textAlignVertical="top"
            maxLength={500}
          />

          {/* Character count */}
          <Text style={[styles.charCount, { color: content.length > 450 ? C.error : C.textTertiary, fontFamily: "Inter_400Regular" }]}>
            {content.length}/500
          </Text>

          {/* Selected images preview */}
          {mediaUris.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
              {mediaUris.map((uri, idx) => (
                <View key={idx} style={styles.mediaThumbWrap}>
                  <Image source={{ uri }} style={styles.mediaThumb} />
                  <Pressable style={[styles.removeMediaBtn, { backgroundColor: C.error }]} onPress={() => removeMedia(idx)}>
                    <Feather name="x" size={12} color="#fff" />
                  </Pressable>
                </View>
              ))}
              {mediaUris.length < 4 && (
                <Pressable style={[styles.addMoreMedia, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]} onPress={pickImage}>
                  <Feather name="plus" size={24} color={C.primary} />
                </Pressable>
              )}
            </ScrollView>
          )}
        </ScrollView>

        {/* Actions toolbar */}
        <View style={[styles.actions, { borderTopColor: C.border, paddingBottom: isWeb ? 34 : insets.bottom + 10, backgroundColor: C.background }]}>
          <Pressable style={styles.actionItem} onPress={pickImage}>
            <Feather name="image" size={22} color={C.primary} />
            <Text style={[styles.actionLabel, { color: C.primary, fontFamily: "Inter_500Medium" }]}>Photo</Text>
          </Pressable>
          <Pressable style={styles.actionItem} onPress={pickImage}>
            <Feather name="paperclip" size={22} color={C.textSecondary} />
            <Text style={[styles.actionLabel, { color: C.textSecondary, fontFamily: "Inter_500Medium" }]}>File</Text>
          </Pressable>
          <Pressable style={styles.actionItem} onPress={() => setContent(prev => prev + " @")}>
            <Feather name="at-sign" size={22} color={C.textSecondary} />
            <Text style={[styles.actionLabel, { color: C.textSecondary, fontFamily: "Inter_500Medium" }]}>Mention</Text>
          </Pressable>
          <Pressable style={styles.actionItem} onPress={() => setContent(prev => prev + " #")}>
            <Feather name="hash" size={22} color={C.textSecondary} />
            <Text style={[styles.actionLabel, { color: C.textSecondary, fontFamily: "Inter_500Medium" }]}>Tag</Text>
          </Pressable>
          {mediaUris.length > 0 && (
            <View style={[styles.mediaCount, { backgroundColor: C.primary }]}>
              <Text style={[styles.mediaCountText, { fontFamily: "Inter_700Bold" }]}>{mediaUris.length}/4</Text>
            </View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  cancelBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  cancelText: { fontSize: 16 },
  headerTitle: { fontSize: 16 },
  postBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  postBtnText: { fontSize: 14 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, paddingBottom: 8 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  anonAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#6B7280", alignItems: "center", justifyContent: "center" },
  userAvatarText: { color: "#fff", fontSize: 16 },
  userName: { fontSize: 15 },
  userProgram: { fontSize: 12, marginTop: 2 },
  anonToggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  anonToggleLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  anonToggleTitle: { fontSize: 13, marginBottom: 2 },
  anonToggleSub: { fontSize: 11, lineHeight: 15 },
  textInput: { minHeight: 120, fontSize: 17, lineHeight: 26, paddingHorizontal: 16, paddingBottom: 16 },
  charCount: { paddingHorizontal: 16, paddingBottom: 8, fontSize: 12, textAlign: "right" },
  mediaRow: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  mediaThumbWrap: { position: "relative" },
  mediaThumb: { width: 90, height: 90, borderRadius: 12 },
  removeMediaBtn: { position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  addMoreMedia: { width: 90, height: 90, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  actions: { flexDirection: "row", borderTopWidth: 0.5, paddingHorizontal: 16, paddingTop: 14, gap: 20, alignItems: "center" },
  actionItem: { alignItems: "center", gap: 4 },
  actionLabel: { fontSize: 10 },
  mediaCount: { marginLeft: "auto", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  mediaCountText: { color: "#fff", fontSize: 12 },
});
