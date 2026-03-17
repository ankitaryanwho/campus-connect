import React from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  useColorScheme, ActivityIndicator, Image, Alert, Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { apiRequest, user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const isWeb = Platform.OS === "web";
  const isMe = currentUser?.id === id;

  const profileQuery = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      const res = await apiRequest(`/users/${id}`);
      return res.json();
    },
    enabled: !!id,
  });

  const postsQuery = useQuery({
    queryKey: ["userPosts", id],
    queryFn: async () => {
      const res = await apiRequest(`/users/${id}/posts`);
      return res.json() as Promise<{ posts: any[] }>;
    },
    enabled: !!id,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/users/${id}/follow`, { method: "POST" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", id] });
    },
  });

  const startChatMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/chat/conversations", {
        method: "POST",
        body: JSON.stringify({ participantId: id }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      router.push(`/chat/${data.id}`);
    },
  });

  if (profileQuery.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  const profile = profileQuery.data;
  const posts = postsQuery.data?.posts || [];
  const roleColors: Record<string, string> = { student: C.primary, provider: C.success, admin: C.error };

  if (!profile) return null;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 8, backgroundColor: C.background, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text, fontFamily: "Inter_600SemiBold" }]}>{profile.name}</Text>
        <Feather name="more-horizontal" size={22} color={C.text} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: isWeb ? 34 : 100 }} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: (roleColors[profile.role] || C.primary) + "20" }]} />

        <View style={styles.profileSection}>
          <View style={[styles.avatarContainer, { borderColor: C.background }]}>
            {profile.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: roleColors[profile.role] || C.primary, alignItems: "center", justifyContent: "center" }]}>
                <Text style={[styles.avatarText, { fontFamily: "Inter_700Bold" }]}>{getInitials(profile.name)}</Text>
              </View>
            )}
          </View>

          <View style={styles.infoSection}>
            <View style={styles.nameRow}>
              <Text style={[styles.profileName, { color: C.text, fontFamily: "Inter_700Bold" }]}>{profile.name}</Text>
              <View style={[styles.roleBadge, { backgroundColor: (roleColors[profile.role] || C.primary) + "20" }]}>
                <Text style={[styles.roleText, { color: roleColors[profile.role] || C.primary, fontFamily: "Inter_600SemiBold" }]}>
                  {profile.role}
                </Text>
              </View>
            </View>

            {profile.bio && (
              <Text style={[styles.bio, { color: C.text, fontFamily: "Inter_400Regular" }]}>{profile.bio}</Text>
            )}

            <View style={styles.metaRow}>
              {profile.college && (
                <View style={styles.metaItem}>
                  <Feather name="map-pin" size={13} color={C.textTertiary} />
                  <Text style={[styles.metaText, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>{profile.college}</Text>
                </View>
              )}
              {profile.program && (
                <View style={styles.metaItem}>
                  <Feather name="book" size={13} color={C.textTertiary} />
                  <Text style={[styles.metaText, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>{profile.program}</Text>
                </View>
              )}
            </View>

            {!isMe && (
              <View style={styles.actions}>
                <Pressable
                  style={[styles.followBtn, { backgroundColor: profile.isFollowing ? C.backgroundSecondary : C.primary, borderColor: profile.isFollowing ? C.border : "transparent" }]}
                  onPress={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                >
                  <Text style={[styles.followBtnText, { color: profile.isFollowing ? C.text : "#fff", fontFamily: "Inter_600SemiBold" }]}>
                    {profile.isFollowing ? "Following" : "Follow"}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.messageBtn, { borderColor: C.border, backgroundColor: C.surface }]}
                  onPress={() => startChatMutation.mutate()}
                  disabled={startChatMutation.isPending}
                >
                  <Feather name="message-circle" size={18} color={C.text} />
                  <Text style={[styles.messageBtnText, { color: C.text, fontFamily: "Inter_500Medium" }]}>Message</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { backgroundColor: C.surface, borderColor: C.border }]}>
          {[
            { value: profile.postsCount, label: "Posts" },
            { value: profile.followersCount, label: "Followers" },
            { value: profile.followingCount, label: "Following" },
          ].map((stat, i) => (
            <React.Fragment key={stat.label}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
              <View style={styles.statBlock}>
                <Text style={[styles.statValue, { color: C.text, fontFamily: "Inter_700Bold" }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>{stat.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Posts */}
        <View style={styles.postsSection}>
          <Text style={[styles.sectionTitle, { color: C.text, fontFamily: "Inter_700Bold" }]}>Posts</Text>
          {postsQuery.isLoading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} />
          ) : posts.length === 0 ? (
            <View style={styles.emptyPosts}>
              <Text style={[styles.emptyText, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>No posts yet</Text>
            </View>
          ) : (
            posts.map(post => (
              <Pressable
                key={post.id}
                style={[styles.postItem, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => router.push(`/post/${post.id}`)}
              >
                <Text style={[styles.postContent, { color: C.text, fontFamily: "Inter_400Regular" }]} numberOfLines={3}>
                  {post.content}
                </Text>
                <View style={styles.postMeta}>
                  <View style={styles.postMetaItem}>
                    <Feather name="heart" size={13} color={C.textTertiary} />
                    <Text style={[styles.postMetaText, { color: C.textTertiary, fontFamily: "Inter_400Regular" }]}>{post.likesCount}</Text>
                  </View>
                  <View style={styles.postMetaItem}>
                    <Feather name="message-circle" size={13} color={C.textTertiary} />
                    <Text style={[styles.postMetaText, { color: C.textTertiary, fontFamily: "Inter_400Regular" }]}>{post.commentsCount}</Text>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 17 },
  banner: { height: 90 },
  profileSection: { paddingHorizontal: 16, marginTop: -30, marginBottom: 20 },
  avatarContainer: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, marginBottom: 12 },
  avatar: { width: 76, height: 76, borderRadius: 38 },
  avatarText: { color: "#fff", fontSize: 28 },
  infoSection: { gap: 8 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  profileName: { fontSize: 22 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  roleText: { fontSize: 12 },
  bio: { fontSize: 14, lineHeight: 20 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 13 },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  followBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", borderWidth: 1 },
  followBtnText: { fontSize: 14 },
  messageBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  messageBtnText: { fontSize: 14 },
  statsRow: { flexDirection: "row", marginHorizontal: 16, borderRadius: 16, borderWidth: 0.5, paddingVertical: 16, marginBottom: 24 },
  statBlock: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20 },
  statLabel: { fontSize: 12, marginTop: 2 },
  divider: { width: 0.5, marginVertical: 4 },
  postsSection: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, marginBottom: 14 },
  postItem: { borderRadius: 14, borderWidth: 0.5, padding: 14, marginBottom: 10 },
  postContent: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  postMeta: { flexDirection: "row", gap: 12 },
  postMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  postMetaText: { fontSize: 12 },
  emptyPosts: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 14 },
});
