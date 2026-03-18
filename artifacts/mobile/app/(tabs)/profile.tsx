import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  useColorScheme, ActivityIndicator, Image, Modal, Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function StatBlock({ value, label, C }: any) {
  return (
    <View style={styles.statBlock}>
      <Text style={[styles.statValue, { color: C.text, fontFamily: "Inter_700Bold" }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { user, apiRequest, updateUser, logout } = useAuth();
  const queryClient = useQueryClient();
  const isWeb = Platform.OS === "web";
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [college, setCollege] = useState(user?.college || "");
  const [program, setProgram] = useState(user?.program || "");

  const postsQuery = useQuery({
    queryKey: ["userPosts", user?.id],
    queryFn: async () => {
      const res = await apiRequest(`/users/${user?.id}/posts`);
      return res.json() as Promise<{ posts: any[] }>;
    },
    enabled: !!user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/users/me/profile", {
        method: "PUT",
        body: JSON.stringify({ name, bio, college, program }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      return data;
    },
    onSuccess: (data) => {
      updateUser(data);
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["userPosts"] });
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            queryClient.clear();
            router.replace("/(auth)/login");
          },
        },
      ]
    );
  };

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
        const avatarData = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        const res = await apiRequest("/users/me/profile", {
          method: "PUT",
          body: JSON.stringify({ avatar: avatarData }),
        });
        if (res.ok) {
          const data = await res.json();
          updateUser(data);
          Alert.alert("Done", "Profile picture updated!");
        } else {
          Alert.alert("Error", "Failed to update profile picture.");
        }
      }
    } catch {
      Alert.alert("Error", "Could not open image picker.");
    }
  };

  if (!user) return null;

  const posts = postsQuery.data?.posts || [];
  const roleColors: Record<string, string> = { student: C.primary, provider: C.success, admin: C.error };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 8, backgroundColor: C.background, borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: C.text, fontFamily: "Inter_700Bold" }]}>Profile</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => {
              setName(user.name);
              setBio(user.bio || "");
              setCollege(user.college || "");
              setProgram(user.program || "");
              setEditing(true);
            }}
            style={[styles.headerBtn, { backgroundColor: C.backgroundSecondary }]}
          >
            <Feather name="edit-2" size={18} color={C.text} />
          </Pressable>
          <Pressable onPress={handleLogout} style={[styles.headerBtn, { backgroundColor: C.errorLight }]}>
            <Feather name="log-out" size={18} color={C.error} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: isWeb ? 34 + 84 : 100 }} showsVerticalScrollIndicator={false}>
        {/* Profile Banner */}
        <View style={[styles.banner, { backgroundColor: C.primaryLight }]}>
          <View style={[styles.bannerPattern, { borderColor: C.primary + "30" }]} />
        </View>

        {/* Avatar + Info */}
        <View style={styles.profileSection}>
          <View style={[styles.avatarContainer, { borderColor: C.background }]}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: C.primary, alignItems: "center", justifyContent: "center" }]}>
                <Text style={[styles.avatarText, { fontFamily: "Inter_700Bold" }]}>{getInitials(user.name)}</Text>
              </View>
            )}
            <Pressable style={[styles.editAvatarBtn, { backgroundColor: C.primary }]} onPress={pickAvatar}>
              <Feather name="camera" size={14} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.userName, { color: C.text, fontFamily: "Inter_700Bold" }]}>{user.name}</Text>
              <View style={[styles.roleBadge, { backgroundColor: (roleColors[user.role] || C.primary) + "20" }]}>
                <Text style={[styles.roleBadgeText, { color: roleColors[user.role] || C.primary, fontFamily: "Inter_600SemiBold" }]}>
                  {user.role}
                </Text>
              </View>
            </View>
            <Text style={[styles.userEmail, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>{user.email}</Text>
            {user.bio ? (
              <Text style={[styles.userBio, { color: C.text, fontFamily: "Inter_400Regular" }]}>{user.bio}</Text>
            ) : (
              <Pressable onPress={() => setEditing(true)}>
                <Text style={[styles.addBio, { color: C.primary, fontFamily: "Inter_400Regular" }]}>+ Add bio</Text>
              </Pressable>
            )}
            <View style={styles.metaRow}>
              {user.college && (
                <View style={styles.metaItem}>
                  <Feather name="map-pin" size={13} color={C.textTertiary} />
                  <Text style={[styles.metaText, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>{user.college}</Text>
                </View>
              )}
              {user.program && (
                <View style={styles.metaItem}>
                  <Feather name="book" size={13} color={C.textTertiary} />
                  <Text style={[styles.metaText, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>{user.program}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { backgroundColor: C.surface, borderColor: C.border }]}>
          <StatBlock value={user.postsCount} label="Posts" C={C} />
          <View style={[styles.statDivider, { backgroundColor: C.border }]} />
          <StatBlock value={user.followersCount} label="Followers" C={C} />
          <View style={[styles.statDivider, { backgroundColor: C.border }]} />
          <StatBlock value={user.followingCount} label="Following" C={C} />
        </View>

        {/* Posts */}
        <View style={styles.postsSection}>
          <Text style={[styles.sectionTitle, { color: C.text, fontFamily: "Inter_700Bold" }]}>My Posts</Text>
          {postsQuery.isLoading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} />
          ) : posts.length === 0 ? (
            <View style={styles.emptyPosts}>
              <Feather name="edit" size={36} color={C.textTertiary} />
              <Text style={[styles.emptyPostsText, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>
                No posts yet
              </Text>
              <Pressable
                style={[styles.createPostBtn, { backgroundColor: C.primaryLight }]}
                onPress={() => router.push("/new-post")}
              >
                <Text style={[styles.createPostBtnText, { color: C.primary, fontFamily: "Inter_600SemiBold" }]}>Create first post</Text>
              </Pressable>
            </View>
          ) : (
            posts.map(post => (
              <Pressable
                key={post.id}
                style={[styles.postItem, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => router.push(`/post/${post.id}`)}
              >
                <Text style={[styles.postItemContent, { color: C.text, fontFamily: "Inter_400Regular" }]} numberOfLines={3}>
                  {post.content}
                </Text>
                <View style={styles.postItemMeta}>
                  <View style={styles.postMetaItem}>
                    <Feather name="heart" size={13} color={C.textTertiary} />
                    <Text style={[styles.postMetaText, { color: C.textTertiary, fontFamily: "Inter_400Regular" }]}>{post.likesCount}</Text>
                  </View>
                  <View style={styles.postMetaItem}>
                    <Feather name="message-circle" size={13} color={C.textTertiary} />
                    <Text style={[styles.postMetaText, { color: C.textTertiary, fontFamily: "Inter_400Regular" }]}>{post.commentsCount}</Text>
                  </View>
                  <Text style={[styles.postDate, { color: C.textTertiary, fontFamily: "Inter_400Regular" }]}>
                    {new Date(post.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editing} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={[styles.modalSheet, { backgroundColor: C.surface }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: C.text, fontFamily: "Inter_700Bold" }]}>Edit Profile</Text>
                <Pressable onPress={() => setEditing(false)}>
                  <Feather name="x" size={22} color={C.text} />
                </Pressable>
              </View>

              {[
                { label: "Name", value: name, onChange: setName, placeholder: "Your name" },
                { label: "Bio", value: bio, onChange: setBio, placeholder: "Tell your story...", multiline: true },
                { label: "College", value: college, onChange: setCollege, placeholder: "Your college" },
                { label: "Program", value: program, onChange: setProgram, placeholder: "e.g. BCA" },
              ].map(field => (
                <View key={field.label} style={{ marginBottom: 14 }}>
                  <Text style={[styles.fieldLabel, { color: C.textSecondary, fontFamily: "Inter_500Medium" }]}>{field.label}</Text>
                  <View style={[styles.fieldInput, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
                    <TextInput
                      style={[styles.fieldInputText, { color: C.text, fontFamily: "Inter_400Regular" }, field.multiline && { minHeight: 80, textAlignVertical: "top" }]}
                      value={field.value}
                      onChangeText={field.onChange}
                      placeholder={field.placeholder}
                      placeholderTextColor={C.textTertiary}
                      multiline={field.multiline}
                    />
                  </View>
                </View>
              ))}

              <Pressable
                style={[styles.saveBtn, { backgroundColor: C.primary }, updateMutation.isPending && { opacity: 0.7 }]}
                onPress={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>Save Changes</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 22 },
  headerActions: { flexDirection: "row", gap: 10 },
  headerBtn: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  banner: { height: 100, position: "relative", overflow: "hidden" },
  bannerPattern: { position: "absolute", inset: -20, borderRadius: 100, borderWidth: 40, opacity: 0.3 },
  profileSection: { paddingHorizontal: 16, paddingBottom: 16, marginTop: -30 },
  avatarContainer: { width: 88, height: 88, borderRadius: 44, borderWidth: 4, marginBottom: 12, position: "relative" },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { color: "#fff", fontSize: 30 },
  editAvatarBtn: { position: "absolute", bottom: 0, right: -4, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  profileInfo: { gap: 6 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  userName: { fontSize: 22 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  roleBadgeText: { fontSize: 12 },
  userEmail: { fontSize: 13 },
  userBio: { fontSize: 14, lineHeight: 20 },
  addBio: { fontSize: 14 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 13 },
  statsRow: { flexDirection: "row", marginHorizontal: 16, borderRadius: 16, borderWidth: 0.5, paddingVertical: 16, marginBottom: 24 },
  statBlock: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20 },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 0.5, marginVertical: 4 },
  postsSection: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, marginBottom: 14 },
  postItem: { borderRadius: 14, borderWidth: 0.5, padding: 14, marginBottom: 10 },
  postItemContent: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  postItemMeta: { flexDirection: "row", alignItems: "center", gap: 12 },
  postMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  postMetaText: { fontSize: 12 },
  postDate: { marginLeft: "auto", fontSize: 12 },
  emptyPosts: { alignItems: "center", paddingVertical: 40, gap: 14 },
  emptyPostsText: { fontSize: 14 },
  createPostBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  createPostBtnText: { fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 50 },
  modalHandle: { width: 40, height: 4, backgroundColor: "#ccc", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20 },
  fieldLabel: { fontSize: 13, marginBottom: 8 },
  fieldInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  fieldInputText: { fontSize: 15 },
  saveBtn: { marginTop: 8, paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 16 },
});
