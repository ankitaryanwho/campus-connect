import React, { useState, useRef } from "react";
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet,
  useColorScheme, ActivityIndicator, Image, Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function Avatar({ user, size = 40, C }: any) {
  if (user?.avatar) return <Image source={{ uri: user.avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: size * 0.35 }}>{getInitials(user?.name || "?")}</Text>
    </View>
  );
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { apiRequest, user } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const inputRef = useRef<TextInput>(null);
  const isWeb = Platform.OS === "web";

  const postQuery = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      const res = await apiRequest(`/posts/${id}`);
      return res.json();
    },
  });

  const commentsQuery = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const res = await apiRequest(`/posts/${id}/comments`);
      return res.json() as Promise<{ comments: any[] }>;
    },
  });

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  React.useEffect(() => {
    if (postQuery.data) {
      setLiked(postQuery.data.isLiked);
      setLikesCount(postQuery.data.likesCount);
    }
  }, [postQuery.data]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/posts/${id}/like`, { method: "POST" });
      return res.json();
    },
    onMutate: () => {
      setLiked(l => !l);
      setLikesCount(c => liked ? c - 1 : c + 1);
    },
    onSuccess: (data) => {
      setLiked(data.liked);
      setLikesCount(data.likesCount);
    },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/posts/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: comment.trim() }),
      });
      return res.json();
    },
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["comments", id] });
      inputRef.current?.focus();
    },
  });

  const post = postQuery.data;
  const comments = commentsQuery.data?.comments || [];

  if (postQuery.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.background }} behavior="padding" keyboardVerticalOffset={0}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 8, backgroundColor: C.background, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text, fontFamily: "Inter_600SemiBold" }]}>Post</Text>
        <Feather name="more-horizontal" size={22} color={C.text} />
      </View>

      <FlatList
        data={comments}
        keyExtractor={item => item.id}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          post ? (
            <View style={[styles.postContainer, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.postHeader}>
                <Pressable onPress={() => router.push(`/profile/${post.author.id}`)}>
                  <Avatar user={post.author} size={44} C={C} />
                </Pressable>
                <View style={styles.postHeaderInfo}>
                  <Text style={[styles.authorName, { color: C.text, fontFamily: "Inter_600SemiBold" }]}>{post.author.name}</Text>
                  <Text style={[styles.postDate, { color: C.textTertiary, fontFamily: "Inter_400Regular" }]}>
                    {post.author.program || post.author.college} · {timeAgo(post.createdAt)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.postContent, { color: C.text, fontFamily: "Inter_400Regular" }]}>{post.content}</Text>
              <View style={[styles.postStats, { borderColor: C.borderLight }]}>
                <Text style={[styles.statText, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {likesCount} likes · {post.commentsCount} comments
                </Text>
              </View>
              <View style={[styles.postActions, { borderColor: C.borderLight }]}>
                <Pressable style={styles.actionBtn} onPress={() => likeMutation.mutate()}>
                  <Feather name="heart" size={20} color={liked ? "#EF4444" : C.textTertiary} />
                  <Text style={[styles.actionText, { color: liked ? "#EF4444" : C.textSecondary, fontFamily: "Inter_500Medium" }]}>Like</Text>
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={() => inputRef.current?.focus()}>
                  <Feather name="message-circle" size={20} color={C.textTertiary} />
                  <Text style={[styles.actionText, { color: C.textSecondary, fontFamily: "Inter_500Medium" }]}>Comment</Text>
                </Pressable>
                <Pressable style={styles.actionBtn}>
                  <Feather name="share-2" size={20} color={C.textTertiary} />
                  <Text style={[styles.actionText, { color: C.textSecondary, fontFamily: "Inter_500Medium" }]}>Share</Text>
                </Pressable>
              </View>
              <Text style={[styles.commentsHeader, { color: C.text, fontFamily: "Inter_600SemiBold", borderColor: C.borderLight }]}>
                Comments
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[styles.commentItem, { borderBottomColor: C.borderLight }]}>
            <Pressable onPress={() => router.push(`/profile/${item.author?.id}`)}>
              <Avatar user={item.author} size={36} C={C} />
            </Pressable>
            <View style={styles.commentBody}>
              <View style={[styles.commentBubble, { backgroundColor: C.backgroundSecondary }]}>
                <Text style={[styles.commentAuthor, { color: C.text, fontFamily: "Inter_600SemiBold" }]}>{item.author?.name}</Text>
                <Text style={[styles.commentContent, { color: C.text, fontFamily: "Inter_400Regular" }]}>{item.content}</Text>
              </View>
              <Text style={[styles.commentTime, { color: C.textTertiary, fontFamily: "Inter_400Regular" }]}>{timeAgo(item.createdAt)}</Text>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.noComments}>
            <Text style={[styles.noCommentsText, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>No comments yet. Be first!</Text>
          </View>
        }
      />

      {/* Comment Input */}
      <View style={[styles.commentInput, { backgroundColor: C.surface, borderTopColor: C.border, paddingBottom: isWeb ? 34 : insets.bottom + 8 }]}>
        <Avatar user={user} size={34} C={C} />
        <TextInput
          ref={inputRef}
          style={[styles.commentTextInput, { backgroundColor: C.backgroundSecondary, color: C.text, fontFamily: "Inter_400Regular" }]}
          placeholder="Write a comment..."
          placeholderTextColor={C.textTertiary}
          value={comment}
          onChangeText={setComment}
          multiline
          maxLength={500}
        />
        <Pressable
          style={[styles.sendBtn, { backgroundColor: comment.trim() ? C.primary : C.backgroundSecondary }]}
          onPress={() => comment.trim() && commentMutation.mutate()}
          disabled={!comment.trim() || commentMutation.isPending}
        >
          {commentMutation.isPending ? (
            <ActivityIndicator size="small" color={comment.trim() ? "#fff" : C.textTertiary} />
          ) : (
            <Feather name="send" size={16} color={comment.trim() ? "#fff" : C.textTertiary} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 17 },
  postContainer: { borderBottomWidth: 6, borderColor: "#F3F4F6" },
  postHeader: { flexDirection: "row", gap: 12, padding: 16, paddingBottom: 12 },
  postHeaderInfo: { flex: 1 },
  authorName: { fontSize: 15 },
  postDate: { fontSize: 12, marginTop: 2 },
  postContent: { fontSize: 17, lineHeight: 26, paddingHorizontal: 16, paddingBottom: 16 },
  postStats: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 0.5, borderBottomWidth: 0.5 },
  statText: { fontSize: 13 },
  postActions: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 0.5 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  actionText: { fontSize: 14 },
  commentsHeader: { fontSize: 16, padding: 16, paddingBottom: 12, borderTopWidth: 0.5 },
  commentItem: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  commentBody: { flex: 1, gap: 4 },
  commentBubble: { borderRadius: 14, padding: 12, paddingHorizontal: 14 },
  commentAuthor: { fontSize: 13, marginBottom: 3 },
  commentContent: { fontSize: 14, lineHeight: 20 },
  commentTime: { fontSize: 11, paddingLeft: 4 },
  noComments: { paddingVertical: 24, alignItems: "center" },
  noCommentsText: { fontSize: 14 },
  commentInput: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 14, paddingTop: 10, borderTopWidth: 0.5 },
  commentTextInput: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, maxHeight: 120 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", marginBottom: 2 },
});
