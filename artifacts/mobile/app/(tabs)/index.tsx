import React, { useState, useCallback, useRef } from "react";
import {
  View, Text, FlatList, Pressable, StyleSheet,
  useColorScheme, RefreshControl, Image, Platform,
  Animated, TouchableOpacity, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ExpoHaptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

const { width: SW } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

interface Post {
  id: string;
  content: string;
  mediaUrls: string[];
  author: { id: string; name: string; avatar?: string; college?: string; program?: string; verified?: boolean };
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_GRADIENTS = [
  ["#667eea", "#764ba2"],
  ["#f093fb", "#f5576c"],
  ["#4facfe", "#00f2fe"],
  ["#43e97b", "#38f9d7"],
  ["#fa709a", "#fee140"],
  ["#a18cd1", "#fbc2eb"],
  ["#ffecd2", "#fcb69f"],
  ["#ff9a9e", "#fecfef"],
];

function getGradient(name: string) {
  let hash = 0;
  for (let c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

// ─── Components ──────────────────────────────────────────────────────────────

function GradientAvatar({ name, avatar, size = 44, ring = false, ringColor = "#5B4FE8" }: any) {
  const grad = getGradient(name || "?");
  const wrap = ring ? { padding: 2, borderRadius: (size + 4) / 2, backgroundColor: ringColor } : {};
  const inner = (
    avatar
      ? <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      : (
        <LinearGradient colors={grad as any} style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: size * 0.36 }}>{getInitials(name || "?")}</Text>
        </LinearGradient>
      )
  );
  return ring ? <View style={wrap}>{inner}</View> : inner;
}

// Skeleton loader
function SkeletonCard({ C }: any) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const bg = { backgroundColor: C.border };
  return (
    <Animated.View style={[styles.skeletonCard, { backgroundColor: C.surface, borderColor: C.border, opacity }]}>
      <View style={styles.skeletonHeader}>
        <View style={[styles.skeletonAvatar, bg]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[styles.skeletonLine, bg, { width: "50%" }]} />
          <View style={[styles.skeletonLine, bg, { width: "30%" }]} />
        </View>
      </View>
      <View style={[styles.skeletonLine, bg, { width: "90%", marginBottom: 8 }]} />
      <View style={[styles.skeletonLine, bg, { width: "70%" }]} />
    </Animated.View>
  );
}

// Post Card
function PostCard({ post, C, onLike, onComment }: any) {
  const [liked, setLiked] = useState(post.isLiked);
  const [likes, setLikes] = useState(post.likesCount);
  const [saved, setSaved] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const tapRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taps = useRef(0);

  const animateLikeButton = () => {
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.3, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  const showDoubleTapHeart = () => {
    heartOpacity.setValue(1);
    Animated.sequence([
      Animated.timing(heartOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.delay(600),
      Animated.timing(heartOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const handleTap = () => {
    taps.current += 1;
    if (taps.current === 2) {
      if (tapRef.current) clearTimeout(tapRef.current);
      taps.current = 0;
      if (!liked) {
        setLiked(true);
        setLikes(l => l + 1);
        onLike(post.id);
      }
      showDoubleTapHeart();
      if (Platform.OS !== "web") ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium);
    } else {
      tapRef.current = setTimeout(() => {
        taps.current = 0;
        router.push(`/post/${post.id}`);
      }, 280);
    }
  };

  const handleLike = () => {
    if (Platform.OS !== "web") ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light);
    setLiked(!liked);
    setLikes(l => liked ? l - 1 : l + 1);
    onLike(post.id);
    animateLikeButton();
  };

  return (
    <Pressable onPress={handleTap} style={[styles.postCard, { backgroundColor: C.surface }]}>
      {/* Header */}
      <View style={styles.postHeader}>
        <Pressable onPress={() => router.push(`/profile/${post.author.id}`)}>
          <GradientAvatar name={post.author.name} avatar={post.author.avatar} size={42} ring={!!post.author.verified} ringColor="#5B4FE8" />
        </Pressable>
        <View style={styles.postHeaderInfo}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={[styles.authorName, { color: C.text }]}>{post.author.name}</Text>
            {post.author.verified && (
              <LinearGradient colors={["#5B4FE8", "#7B73F0"]} style={styles.verifiedBadge}>
                <Feather name="check" size={9} color="#fff" />
              </LinearGradient>
            )}
          </View>
          <Text style={[styles.postMeta, { color: C.textTertiary }]}>
            {post.author.college || post.author.program || "Student"} · {timeAgo(post.createdAt)}
          </Text>
        </View>
        <Pressable style={[styles.followBtn, { borderColor: C.border }]}>
          <Text style={[styles.followBtnText, { color: C.primary }]}>Follow</Text>
        </Pressable>
      </View>

      {/* Content */}
      {post.content ? (
        <Text style={[styles.postContent, { color: C.text }]}>{post.content}</Text>
      ) : null}

      {/* Media */}
      {post.mediaUrls?.length > 0 && (
        <View style={styles.mediaContainer}>
          {post.mediaUrls.length === 1 ? (
            <Image source={{ uri: post.mediaUrls[0] }} style={styles.mediaSingle} resizeMode="cover" />
          ) : (
            <View style={styles.mediaGrid}>
              {post.mediaUrls.slice(0, 4).map((uri: string, i: number) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={[styles.mediaGridItem, post.mediaUrls.length === 2 ? { width: "49.5%", height: 180 } : { width: "49.5%", height: 120 }]}
                  resizeMode="cover"
                />
              ))}
            </View>
          )}
          {/* Double-tap heart overlay */}
          <Animated.View style={[StyleSheet.absoluteFill, styles.heartOverlay, { opacity: heartOpacity }]} pointerEvents="none">
            <Feather name="heart" size={80} color="#fff" />
          </Animated.View>
        </View>
      )}

      {/* Actions */}
      <View style={[styles.postActions, { borderTopColor: C.borderLight }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleLike} activeOpacity={0.7}>
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Feather name="heart" size={20} color={liked ? "#EF4444" : C.textTertiary} />
          </Animated.View>
          {likes > 0 && <Text style={[styles.actionCount, { color: liked ? "#EF4444" : C.textTertiary }]}>{likes}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onComment(post.id)} activeOpacity={0.7}>
          <Feather name="message-circle" size={20} color={C.textTertiary} />
          {post.commentsCount > 0 && <Text style={[styles.actionCount, { color: C.textTertiary }]}>{post.commentsCount}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
          <Feather name="share-2" size={20} color={C.textTertiary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.actionBtn} onPress={() => setSaved(!saved)} activeOpacity={0.7}>
          <Feather name="bookmark" size={20} color={saved ? C.primary : C.textTertiary} />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

// Stories bar item
function StoryItem({ story, C, isMe = false }: any) {
  return (
    <Pressable style={styles.storyItem} onPress={() => router.push(isMe ? "/new-post" : `/profile/${story.id}`)}>
      <LinearGradient
        colors={isMe ? [C.primary, "#7B73F0"] : (getGradient(story.name || "?") as any)}
        style={styles.storyRing}
      >
        <View style={[styles.storyAvatarInner, { backgroundColor: C.background }]}>
          <GradientAvatar name={story.name} avatar={story.avatar} size={52} />
        </View>
      </LinearGradient>
      {isMe && (
        <View style={[styles.storyAddBtn, { backgroundColor: C.primary }]}>
          <Feather name="plus" size={10} color="#fff" />
        </View>
      )}
      <Text style={[styles.storyName, { color: C.text }]} numberOfLines={1}>
        {isMe ? "Your story" : story.name?.split(" ")[0]}
      </Text>
    </Pressable>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { apiRequest, user } = useAuth();
  const queryClient = useQueryClient();

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
    />
  ), [C]);

  const ListHeader = () => (
    <>
      {/* Stories */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ id: "me", name: user?.name || "You", avatar: user?.avatar, isMe: true }, ...(posts.slice(0, 8).map(p => p.author))]}
        keyExtractor={(item, i) => `story-${item.id}-${i}`}
        contentContainerStyle={styles.storiesContainer}
        renderItem={({ item, index }) => (
          <StoryItem key={`s-${index}`} story={item} C={C} isMe={index === 0} />
        )}
        style={[styles.storiesList, { borderBottomColor: C.borderLight }]}
      />

      {/* Create post box */}
      <Pressable
        style={[styles.createBox, { backgroundColor: C.surface, borderColor: C.border }]}
        onPress={() => router.push("/new-post")}
      >
        <GradientAvatar name={user?.name || "?"} avatar={user?.avatar} size={38} />
        <View style={[styles.createInput, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
          <Text style={[styles.createPlaceholder, { color: C.textTertiary }]}>What's on your mind?</Text>
        </View>
        <View style={[styles.createMediaBtn, { backgroundColor: C.primaryLight }]}>
          <Feather name="image" size={16} color={C.primary} />
        </View>
      </Pressable>

      {posts.length > 0 && (
        <Text style={[styles.feedLabel, { color: C.textTertiary }]}>RECENT POSTS</Text>
      )}
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 10, borderBottomColor: C.border, backgroundColor: C.background }]}>
        <Text style={[styles.headerBrand, { color: C.text }]}>Campus<Text style={{ color: C.primary }}>Connect</Text></Text>
        <View style={styles.headerRight}>
          <Pressable style={[styles.headerIconBtn, { backgroundColor: C.backgroundSecondary }]} onPress={() => router.push("/new-post")}>
            <Feather name="plus-square" size={20} color={C.text} />
          </Pressable>
          <Pressable style={[styles.headerIconBtn, { backgroundColor: C.backgroundSecondary }]}>
            <Feather name="bell" size={20} color={C.text} />
            <View style={[styles.notifDot, { backgroundColor: C.error }]} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <FlatList
          data={[1, 2, 3]}
          keyExtractor={i => String(i)}
          renderItem={() => <SkeletonCard C={C} />}
          contentContainerStyle={{ padding: 12, gap: 12 }}
          scrollEnabled={false}
        />
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={item => item.id}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ paddingBottom: isWeb ? 120 : 110 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.primary} colors={[C.primary]} />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: C.borderLight }} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <LinearGradient colors={[C.primaryLight, C.background]} style={styles.emptyGradient}>
                <Feather name="wind" size={52} color={C.primary} style={{ opacity: 0.6 }} />
                <Text style={[styles.emptyTitle, { color: C.text }]}>Nothing to see yet</Text>
                <Text style={[styles.emptyText, { color: C.textSecondary }]}>Be the first to share something with your campus!</Text>
                <Pressable style={[styles.emptyBtn, { backgroundColor: C.primary }]} onPress={() => router.push("/new-post")}>
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={styles.emptyBtnText}>Create Post</Text>
                </Pressable>
              </LinearGradient>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5,
  },
  headerBrand: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerRight: { flexDirection: "row", gap: 8 },
  headerIconBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  notifDot: { position: "absolute", top: 7, right: 7, width: 8, height: 8, borderRadius: 4 },
  storiesList: { borderBottomWidth: 0.5 },
  storiesContainer: { paddingHorizontal: 12, paddingVertical: 14, gap: 14 },
  storyItem: { alignItems: "center", width: 68 },
  storyRing: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 5 },
  storyAvatarInner: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center" },
  storyAddBtn: { position: "absolute", bottom: 24, right: 2, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  storyName: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  createBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    margin: 12, marginTop: 10, padding: 12, borderRadius: 16, borderWidth: 0.5,
  },
  createInput: { flex: 1, height: 40, borderRadius: 20, justifyContent: "center", paddingHorizontal: 14, borderWidth: 0.5 },
  createPlaceholder: { fontSize: 14, fontFamily: "Inter_400Regular" },
  createMediaBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  feedLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  postCard: { paddingTop: 14 },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingBottom: 10 },
  postHeaderInfo: { flex: 1 },
  authorName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  verifiedBadge: { width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  postMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  followBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  followBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  postContent: { fontSize: 15, lineHeight: 22, fontFamily: "Inter_400Regular", paddingHorizontal: 14, paddingBottom: 12 },
  mediaContainer: { position: "relative", marginBottom: 12 },
  mediaSingle: { width: "100%", height: 300 },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 2 },
  mediaGridItem: { borderRadius: 2 },
  heartOverlay: { alignItems: "center", justifyContent: "center" },
  postActions: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 14,
    paddingVertical: 10, borderTopWidth: 0.5, gap: 2,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10 },
  actionCount: { fontSize: 13, fontFamily: "Inter_500Medium" },
  skeletonCard: { padding: 14, borderRadius: 16, borderWidth: 0.5, marginHorizontal: 12 },
  skeletonHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  skeletonAvatar: { width: 42, height: 42, borderRadius: 21 },
  skeletonLine: { height: 12, borderRadius: 6, marginBottom: 6 },
  emptyState: { margin: 16, borderRadius: 20, overflow: "hidden" },
  emptyGradient: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 24, gap: 12, borderRadius: 20 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  emptyBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
