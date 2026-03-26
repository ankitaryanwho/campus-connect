import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet,
  useColorScheme, ActivityIndicator, Image, Platform,
  KeyboardAvoidingView, TouchableOpacity,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

const isWeb = Platform.OS === "web";

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

const GRADIENTS: [string, string][] = [
  ["#667eea", "#764ba2"], ["#f093fb", "#f5576c"],
  ["#4facfe", "#00f2fe"], ["#43e97b", "#38f9d7"],
  ["#fa709a", "#fee140"], ["#a18cd1", "#fbc2eb"],
];
function getGrad(name: string) {
  let h = 0;
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

function Avatar({ user, size = 40, C }: any) {
  if (!user) return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#6B7280", alignItems: "center", justifyContent: "center" }}>
      <Feather name="user-x" size={size * 0.45} color="#fff" />
    </View>
  );
  if (user.isAnonymous) return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#6B7280", alignItems: "center", justifyContent: "center" }}>
      <Feather name="user-x" size={size * 0.45} color="#fff" />
    </View>
  );
  if (user.avatar) return <Image source={{ uri: user.avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  const grad = getGrad(user.name || "?");
  return (
    <LinearGradient colors={grad} style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: size * 0.35 }}>{getInitials(user?.name || "?")}</Text>
    </LinearGradient>
  );
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { apiRequest, user } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [comment, setComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string } | null>(null);
  const inputRef = useRef<TextInput>(null);

  const postQuery = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      const res = await apiRequest(`/posts/${id}`);
      if (!res.ok) throw new Error("Post not found");
      return res.json();
    },
    retry: false,
  });

  const commentsQuery = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const res = await apiRequest(`/posts/${id}/comments`);
      return res.json() as Promise<{ comments: any[] }>;
    },
    refetchInterval: 5000,
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
    onMutate: () => { setLiked(l => !l); setLikesCount(c => liked ? c - 1 : c + 1); },
    onSuccess: (data) => { setLiked(data.liked); setLikesCount(data.likesCount); },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      if (!comment.trim()) throw new Error("Please write a comment");
      const res = await apiRequest(`/posts/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: comment.trim(), parentId: replyTo?.id || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to post");
      return data;
    },
    onSuccess: () => {
      setComment("");
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["comments", id] });
      queryClient.invalidateQueries({ queryKey: ["post", id] });
    },
    onError: (err: any) => showToast(err.message || "Failed to post comment", "error"),
  });

  const handleAuthorPress = (author: any) => {
    if (!author || author.isAnonymous) {
      showToast("Anonymous post — profile is hidden", "info");
      return;
    }
    router.push(`/profile/${author.id}`);
  };

  const handleCommentAuthorPress = (commentAuthor: any, isPostAuthorComment: boolean, postIsAnonymous: boolean) => {
    if (postIsAnonymous && isPostAuthorComment) {
      showToast("Anonymous post — profile is hidden", "info");
      return;
    }
    if (!commentAuthor || commentAuthor.isAnonymous) {
      showToast("Anonymous user — profile is hidden", "info");
      return;
    }
    router.push(`/profile/${commentAuthor.id}`);
  };

  const handleStartAnonChat = async (recipientId: string) => {
    try {
      const res = await apiRequest("/chat/conversations", {
        method: "POST",
        body: JSON.stringify({ participantId: recipientId, isAnonymous: true, anonymousPostId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to start chat");
      router.push(`/chat/${data.id}`);
    } catch (err: any) {
      showToast(err.message || "Could not start chat", "error");
    }
  };

  const startReply = (commentId: string, authorName: string) => {
    setReplyTo({ id: commentId, authorName });
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const post = postQuery.data;
  const comments = commentsQuery.data?.comments || [];
  const isPostAnonymous = post?.isAnonymous;

  if (postQuery.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  if (postQuery.isError) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <Feather name="alert-circle" size={40} color={C.error} />
        <Text style={[styles.errorText, { color: C.text, fontFamily: "Inter_600SemiBold" }]}>Post not found</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.primary }]}>
          <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const yearSuffix = (y: number) => y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th";
  const genderEmoji = (g?: string | null) => g === "male" ? " 👨" : g === "female" ? " 👩" : g === "other" ? " 🧑" : "";
  const anonMeta = isPostAnonymous
    ? ([post?.author?.program, post?.author?.year ? `${post.author.year}${yearSuffix(post.author.year)} Year` : null].filter(Boolean).join(" • ") || "Anonymous") + genderEmoji((post?.author as any)?.gender)
    : null;

  const renderComment = ({ item }: { item: any }) => {
    const isPostAuthorComment = post && item.author && !item.author.isAnonymous
      ? item.authorId === post?.authorId
      : false;
    const commentDisplayName = item.author?.isAnonymous ? "Profile Hidden" : (item.author?.name || "Unknown");

    return (
      <View style={[styles.commentWrapper]}>
        <View style={styles.commentItem}>
          <TouchableOpacity onPress={() => handleCommentAuthorPress(item.author, isPostAuthorComment, isPostAnonymous)}>
            <Avatar user={item.author} size={36} C={C} />
          </TouchableOpacity>
          <View style={styles.commentBody}>
            <View style={[styles.commentBubble, { backgroundColor: C.backgroundSecondary }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <Text style={[styles.commentAuthor, { color: C.text, fontFamily: "Inter_600SemiBold" }]}>{commentDisplayName}</Text>
                {item.author?.isAnonymous && (
                  <View style={{ backgroundColor: "#E5E7EB", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                    <Text style={{ fontSize: 8, color: "#6B7280", fontFamily: "Inter_600SemiBold" }}>ANON</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.commentContent, { color: C.text, fontFamily: "Inter_400Regular" }]}>{item.content}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingLeft: 4 }}>
              <Text style={[styles.commentTime, { color: C.textTertiary, fontFamily: "Inter_400Regular" }]}>{timeAgo(item.createdAt)}</Text>
              <TouchableOpacity onPress={() => startReply(item.id, commentDisplayName)}>
                <Text style={[styles.replyBtn, { color: C.primary, fontFamily: "Inter_600SemiBold" }]}>Reply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Threaded replies */}
        {item.replies && item.replies.length > 0 && (
          <View style={[styles.repliesContainer, { borderLeftColor: C.border }]}>
            {item.replies.map((reply: any) => {
              const replyDisplayName = reply.author?.isAnonymous ? "Profile Hidden" : (reply.author?.name || "Unknown");
              return (
                <View key={reply.id} style={styles.replyItem}>
                  <TouchableOpacity onPress={() => handleCommentAuthorPress(reply.author, false, isPostAnonymous)}>
                    <Avatar user={reply.author} size={28} C={C} />
                  </TouchableOpacity>
                  <View style={styles.replyBody}>
                    <View style={[styles.commentBubble, { backgroundColor: C.backgroundSecondary }]}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <Text style={[styles.replyAuthor, { color: C.text, fontFamily: "Inter_600SemiBold" }]}>{replyDisplayName}</Text>
                        {reply.author?.isAnonymous && (
                          <View style={{ backgroundColor: "#E5E7EB", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 }}>
                            <Text style={{ fontSize: 8, color: "#6B7280", fontFamily: "Inter_600SemiBold" }}>ANON</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.commentContent, { color: C.text, fontFamily: "Inter_400Regular", fontSize: 13 }]}>{reply.content}</Text>
                    </View>
                    <Text style={[styles.commentTime, { color: C.textTertiary, fontFamily: "Inter_400Regular", paddingLeft: 4 }]}>{timeAgo(reply.createdAt)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.background }} behavior="padding" keyboardVerticalOffset={0}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 8, backgroundColor: C.background, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text, fontFamily: "Inter_600SemiBold" }]}>Post</Text>
        {isPostAnonymous && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
            <Feather name="eye-off" size={12} color="#6B7280" />
            <Text style={{ fontSize: 11, color: "#6B7280", fontFamily: "Inter_600SemiBold" }}>Anonymous</Text>
          </View>
        )}
        {!isPostAnonymous && <Feather name="more-horizontal" size={22} color={C.text} />}
      </View>

      <FlatList
        data={comments}
        keyExtractor={item => item.id}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        renderItem={renderComment}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          post ? (
            <View style={[styles.postContainer, { backgroundColor: C.surface, borderColor: C.border }]}>
              {/* Post author */}
              <View style={styles.postHeader}>
                <TouchableOpacity onPress={() => handleAuthorPress(post.author)}>
                  <Avatar user={post.author} size={46} C={C} />
                </TouchableOpacity>
                <View style={styles.postHeaderInfo}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.authorName, { color: C.text, fontFamily: "Inter_600SemiBold" }]}>
                      {isPostAnonymous ? "Profile Hidden" : post.author?.name}
                    </Text>
                    {isPostAnonymous && (
                      <View style={{ backgroundColor: "#E5E7EB", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 9, color: "#6B7280", fontFamily: "Inter_600SemiBold" }}>ANON</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.postDate, { color: C.textTertiary, fontFamily: "Inter_400Regular" }]}>
                    {isPostAnonymous ? anonMeta : (post.author?.program || post.author?.college)} · {timeAgo(post.createdAt)}
                  </Text>
                </View>
                {/* Start anon chat button — shown to non-owners on anonymous posts */}
                {isPostAnonymous && !post.isOwnPost && (
                  <TouchableOpacity
                    style={[styles.anonChatBtn, { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" }]}
                    onPress={() => handleStartAnonChat(user?.id || "")}
                  >
                    <Feather name="message-square" size={14} color="#6B7280" />
                    <Text style={{ fontSize: 11, color: "#6B7280", fontFamily: "Inter_500Medium" }}>Message</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Anonymous notice banner */}
              {isPostAnonymous && (
                <View style={[styles.anonBanner, { backgroundColor: "#F9FAFB", borderColor: "#E5E7EB" }]}>
                  <Feather name="shield" size={14} color="#6B7280" />
                  <Text style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular", flex: 1 }}>
                    This is an anonymous post. The author's identity is hidden for privacy.
                  </Text>
                </View>
              )}

              <Text style={[styles.postContent, { color: C.text, fontFamily: "Inter_400Regular" }]}>{post.content}</Text>

              {/* Media */}
              {post.mediaUrls?.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  {post.mediaUrls.length === 1 ? (
                    <Image source={{ uri: post.mediaUrls[0] }} style={{ width: "100%", height: 280 }} resizeMode="cover" />
                  ) : (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 2 }}>
                      {post.mediaUrls.slice(0, 4).map((uri: string, i: number) => (
                        <Image key={i} source={{ uri }} style={{ width: "49.5%", height: 150 }} resizeMode="cover" />
                      ))}
                    </View>
                  )}
                </View>
              )}

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
                Comments ({post.commentsCount})
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.noComments}>
            <Feather name="message-circle" size={32} color={C.textTertiary} />
            <Text style={[styles.noCommentsText, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>No comments yet. Be the first!</Text>
          </View>
        }
      />

      {/* Comment Input */}
      <View style={[styles.commentInputWrap, { backgroundColor: C.surface, borderTopColor: C.border, paddingBottom: isWeb ? 34 : insets.bottom + 8 }]}>
        {replyTo && (
          <View style={[styles.replyBanner, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
            <Text style={[styles.replyBannerText, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Replying to <Text style={{ fontFamily: "Inter_600SemiBold", color: C.primary }}>@{replyTo.authorName}</Text>
            </Text>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
              <Feather name="x" size={16} color={C.textTertiary} />
            </Pressable>
          </View>
        )}
        <View style={styles.commentInputRow}>
          <Avatar user={user} size={34} C={C} />
          <TextInput
            ref={inputRef}
            style={[styles.commentTextInput, { backgroundColor: C.backgroundSecondary, color: C.text, fontFamily: "Inter_400Regular" }]}
            placeholder={replyTo ? `Reply to ${replyTo.authorName}...` : "Write a comment..."}
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
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 18, marginTop: 8 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 4 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 17 },
  postContainer: { borderBottomWidth: 6, borderColor: "#F3F4F6" },
  postHeader: { flexDirection: "row", gap: 12, padding: 16, paddingBottom: 12, alignItems: "center" },
  postHeaderInfo: { flex: 1 },
  authorName: { fontSize: 15 },
  postDate: { fontSize: 12, marginTop: 2 },
  anonBanner: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 12, padding: 10, borderRadius: 10, borderWidth: 1 },
  anonChatBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  postContent: { fontSize: 17, lineHeight: 26, paddingHorizontal: 16, paddingBottom: 16 },
  postStats: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 0.5, borderBottomWidth: 0.5 },
  statText: { fontSize: 13 },
  postActions: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 0.5 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  actionText: { fontSize: 14 },
  commentsHeader: { fontSize: 16, padding: 16, paddingBottom: 12, borderTopWidth: 0.5 },

  commentWrapper: { borderBottomWidth: 0.5, borderBottomColor: "#F0EDEA" },
  commentItem: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  commentBody: { flex: 1, gap: 4 },
  commentBubble: { borderRadius: 14, padding: 12, paddingHorizontal: 14 },
  commentAuthor: { fontSize: 13 },
  commentContent: { fontSize: 14, lineHeight: 20 },
  commentTime: { fontSize: 11 },
  replyBtn: { fontSize: 12 },

  repliesContainer: { marginLeft: 46, marginBottom: 8, paddingLeft: 12, borderLeftWidth: 2 },
  replyItem: { flexDirection: "row", gap: 8, paddingTop: 8 },
  replyBody: { flex: 1, gap: 3 },
  replyAuthor: { fontSize: 12 },

  noComments: { paddingVertical: 32, alignItems: "center", gap: 8 },
  noCommentsText: { fontSize: 14 },

  commentInputWrap: { borderTopWidth: 0.5 },
  replyBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 0.5 },
  replyBannerText: { fontSize: 13 },
  commentInputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 14, paddingTop: 10 },
  commentTextInput: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, maxHeight: 120 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", marginBottom: 2 },
});
