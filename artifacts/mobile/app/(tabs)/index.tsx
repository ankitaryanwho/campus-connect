import React, { useState, useCallback, useRef } from "react";
import {
  View, Text, FlatList, Pressable, TextInput, ActivityIndicator,
  StyleSheet, useColorScheme, RefreshControl, Image, Platform, Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ExpoHaptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

interface Post {
  id: string;
  content: string;
  mediaUrls: string[];
  author: { id: string; name: string; avatar?: string; college?: string; program?: string };
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function AvatarComp({ user, size = 40, C }: any) {
  if (user?.avatar) {
    return <Image source={{ uri: user.avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" }]}>
      <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: size * 0.35 }}>{getInitials(user?.name || "?")}</Text>
    </View>
  );
}

function PostCard({ post, C, onLike, onComment, onPress }: any) {
  const [liked, setLiked] = useState(post.isLiked);
  const [likes, setLikes] = useState(post.likesCount);

  const handleLike = () => {
    if (Platform.OS !== "web") ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light);
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
    onLike(post.id);
  };

  return (
    <Pressable onPress={onPress} style={[styles.postCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={styles.postHeader}>
        <Pressable onPress={() => router.push(`/profile/${post.author.id}`)}>
          <AvatarComp user={post.author} size={42} C={C} />
        </Pressable>
        <View style={styles.postHeaderInfo}>
          <Text style={[styles.authorName, { color: C.text, fontFamily: "Inter_600SemiBold" }]}>
            {post.author.name}
          </Text>
          <Text style={[styles.postMeta, { color: C.textTertiary, fontFamily: "Inter_400Regular" }]}>
            {post.author.college || post.author.program || "Student"} · {timeAgo(post.createdAt)}
          </Text>
        </View>
        <Feather name="more-horizontal" size={20} color={C.textTertiary} />
      </View>

      <Text style={[styles.postContent, { color: C.text, fontFamily: "Inter_400Regular" }]}>{post.content}</Text>

      <View style={[styles.postActions, { borderTopColor: C.borderLight }]}>
        <Pressable style={styles.actionBtn} onPress={handleLike}>
          <Feather name="heart" size={18} color={liked ? "#EF4444" : C.textTertiary} fill={liked ? "#EF4444" : "none"} />
          <Text style={[styles.actionCount, { color: liked ? "#EF4444" : C.textTertiary, fontFamily: "Inter_500Medium" }]}>
            {likes > 0 ? likes : ""}
          </Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => onComment(post.id)}>
          <Feather name="message-circle" size={18} color={C.textTertiary} />
          <Text style={[styles.actionCount, { color: C.textTertiary, fontFamily: "Inter_500Medium" }]}>
            {post.commentsCount > 0 ? post.commentsCount : ""}
          </Text>
        </Pressable>
        <Pressable style={styles.actionBtn}>
          <Feather name="share-2" size={18} color={C.textTertiary} />
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { apiRequest, user } = useAuth();
  const queryClient = useQueryClient();
  const isWeb = Platform.OS === "web";

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const res = await apiRequest("/posts");
      if (!res.ok) throw new Error("Failed to load posts");
      return res.json() as Promise<{ posts: Post[] }>;
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await apiRequest(`/posts/${postId}/like`, { method: "POST" });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });

  const posts = data?.posts || [];

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <PostCard
      post={item}
      C={C}
      onLike={(id: string) => likeMutation.mutate(id)}
      onComment={(id: string) => router.push(`/post/${id}`)}
      onPress={() => router.push(`/post/${item.id}`)}
    />
  ), [C]);

  const ListHeader = () => (
    <Pressable
      style={[styles.createPostBox, { backgroundColor: C.surface, borderColor: C.border }]}
      onPress={() => router.push("/new-post")}
    >
      <AvatarComp user={user} size={38} C={C} />
      <View style={[styles.createPostInput, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
        <Text style={[styles.createPostPlaceholder, { color: C.textTertiary, fontFamily: "Inter_400Regular" }]}>
          What's on your mind?
        </Text>
      </View>
      <Pressable
        style={[styles.photoBtn, { backgroundColor: C.primaryLight }]}
        onPress={() => router.push("/new-post")}
      >
        <Feather name="image" size={18} color={C.primary} />
      </Pressable>
    </Pressable>
  );

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 8, backgroundColor: C.background, borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: C.text, fontFamily: "Inter_700Bold" }]}>CampusConnect</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push("/new-post")} style={[styles.headerBtn, { backgroundColor: C.primaryLight }]}>
            <Feather name="plus" size={20} color={C.primary} />
          </Pressable>
          <Pressable style={[styles.headerBtn, { backgroundColor: C.backgroundSecondary }]}>
            <Feather name="bell" size={20} color={C.text} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={item => item.id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: isWeb ? 34 + 84 : 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={C.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="wind" size={48} color={C.textTertiary} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: "Inter_600SemiBold" }]}>No posts yet</Text>
            <Text style={[styles.emptyText, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Be the first to share something!
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 22 },
  headerActions: { flexDirection: "row", gap: 10 },
  headerBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  createPostBox: {
    flexDirection: "row", alignItems: "center", gap: 12, margin: 12, marginBottom: 4,
    padding: 12, borderRadius: 16, borderWidth: 0.5,
  },
  createPostInput: { flex: 1, height: 40, borderRadius: 20, justifyContent: "center", paddingHorizontal: 14, borderWidth: 0.5 },
  createPostPlaceholder: { fontSize: 14 },
  photoBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  postCard: { marginHorizontal: 12, marginTop: 8, borderRadius: 16, borderWidth: 0.5, overflow: "hidden" },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, paddingBottom: 10 },
  postHeaderInfo: { flex: 1 },
  authorName: { fontSize: 14 },
  postMeta: { fontSize: 12, marginTop: 1 },
  postContent: { fontSize: 15, lineHeight: 22, paddingHorizontal: 14, paddingBottom: 12 },
  postActions: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 0.5, gap: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  actionCount: { fontSize: 13 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18 },
  emptyText: { fontSize: 14 },
});
