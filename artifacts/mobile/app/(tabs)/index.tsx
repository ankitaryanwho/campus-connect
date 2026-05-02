import React, { useState, useCallback, useRef } from "react";
import {
  View, Text, FlatList, Pressable, StyleSheet,
  useColorScheme, RefreshControl, Platform,
  Animated, TouchableOpacity, ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { PLACEHOLDER_BLURHASH } from "@/constants/imagePlaceholder";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ExpoHaptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { AuthorBadge } from "@/components/AuthorBadge";
import { PostActionsMenu } from "@/components/PostActionsMenu";
import { MarketplaceFeed } from "@/components/MarketplaceFeed";
import { RetryableError, RetryingBanner } from "@/components/RetryableError";
import { throwIfNotOk } from "@/lib/ApiError";
import { useOfflineQueue } from "@/contexts/OfflineQueueContext";

const isWeb = Platform.OS === "web";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Post {
  id: string;
  content: string;
  mediaUrls: string[];
  author: { id: string; name: string; avatar?: string; college?: string; program?: string; year?: number; verified?: boolean; verificationBadge?: string | null; isAnonymous?: boolean };
  isAnonymous: boolean;
  isOwnPost?: boolean;
  hidden?: boolean;
  editedAt?: string | null;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
}

// ─── Design Tokens ───────────────────────────────────────────────────────────

const WARM = {
  bg: "#FAF8F4",
  surface: "#FFFFFF",
  border: "#E7E5E4",
  borderLight: "#F0EDEA",
  text: "#1C1917",
  textSecondary: "#78716C",
  textTertiary: "#A8A29E",
};

const CATEGORIES = [
  { id: "all",          label: "All",          emoji: "✦",  accent: "#1C1917", bg: "#F0EDEA" },
  { id: "confessions",  label: "Confessions",  emoji: "🙈", accent: "#6B7280", bg: "#F3F4F6" },
  { id: "study",        label: "Study Help",   emoji: "📚", accent: "#3B82F6", bg: "#EFF6FF" },
  { id: "events",       label: "Events",       emoji: "🎪", accent: "#8B5CF6", bg: "#F5F3FF" },
  { id: "buysell",      label: "Buy · Sell · Rent", emoji: "🛒", accent: "#F59E0B", bg: "#FFFBEB" },
  { id: "social",       label: "Social",       emoji: "💬", accent: "#10B981", bg: "#ECFDF5" },
] as const;

type CategoryId = typeof CATEGORIES[number]["id"];

function getCategoryInfo(id: CategoryId) {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[0];
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
];

function getGradient(name: string) {
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function detectCategory(content: string): CategoryId {
  const t = content.toLowerCase();
  if (/notes|study|exam|assignment|help|tutor|dbms|algorithm|question|quiz|marks|syllabus|lecture/.test(t)) return "study";
  if (/session|workshop|event|fest|hackathon|register|sunday|monday|tuesday|wednesday|tonight|tomorrow|this week|hosting|seminar/.test(t)) return "events";
  if (/sell|selling|buy|buying|₹|rs\.|price|condition|pickup|available for sale|dm me/.test(t)) return "buysell";
  return "social";
}

// ─── Components ──────────────────────────────────────────────────────────────

function GradientAvatar({ name, avatar, size = 44 }: { name: string; avatar?: string; size?: number }) {
  const grad = getGradient(name || "?");
  if (avatar) {
    return <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" cachePolicy="disk" placeholder={PLACEHOLDER_BLURHASH} transition={200} />;
  }
  return (
    <LinearGradient colors={grad as any} style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: size * 0.36 }}>{getInitials(name || "?")}</Text>
    </LinearGradient>
  );
}

// Compact horizontal card for swim-lane strips
const PostMiniCard = React.memo(function PostMiniCard({ post, accent }: { post: Post; accent: string }) {
  const [liked, setLiked] = useState(post.isLiked);
  const [likes, setLikes] = useState(post.likesCount);
  const { showToast } = useToast();

  const handleLike = () => {
    if (Platform.OS !== "web") ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light);
    setLiked(!liked);
    setLikes(l => liked ? l - 1 : l + 1);
  };

  const handleAuthorPress = () => {
    if (post.isAnonymous) {
      showToast("Anonymous post — profile is hidden", "info");
      return;
    }
    router.push(`/profile/${post.author.id}`);
  };

  const displayName = post.isAnonymous ? "Profile Hidden" : post.author.name;
  const genderEmoji = (g?: string | null) => g === "male" ? " 👨" : g === "female" ? " 👩" : g === "other" ? " 🧑" : "";
  const displayBadge = post.isAnonymous
    ? ([post.author.program, post.author.year ? `${post.author.year}${post.author.year === 1 ? "st" : post.author.year === 2 ? "nd" : post.author.year === 3 ? "rd" : "th"} Year` : null].filter(Boolean).join(" • ") || "Anonymous") + genderEmoji((post.author as any).gender)
    : post.author.program || post.author.college || "Student";

  return (
    <Pressable
      onPress={() => router.push(`/post/${post.id}`)}
      style={[styles.miniCard, { borderLeftColor: accent }]}
    >
      <View style={styles.miniCardHeader}>
        {post.isAnonymous ? (
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#6B7280", alignItems: "center", justifyContent: "center" }}>
            <Feather name="user-x" size={12} color="#fff" />
          </View>
        ) : (
          <GradientAvatar name={post.author.name} avatar={post.author.avatar} size={26} />
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={styles.miniCardAuthor} numberOfLines={1}>{displayName}</Text>
            {!post.isAnonymous && <AuthorBadge author={post.author} size={11} />}
          </View>
          <Text style={styles.miniCardBadge} numberOfLines={1}>{displayBadge}</Text>
        </View>
      </View>
      <Text style={styles.miniCardContent} numberOfLines={3}>{post.content}</Text>
      <View style={styles.miniCardFooter}>
        <Text style={styles.miniCardTime}>{timeAgo(post.createdAt)}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity onPress={handleLike} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Feather name="heart" size={11} color={liked ? "#EF4444" : WARM.textTertiary} />
            <Text style={[styles.miniCardStat, { color: liked ? "#EF4444" : WARM.textTertiary }]}>{likes}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Feather name="message-circle" size={11} color={WARM.textTertiary} />
            <Text style={styles.miniCardStat}>{post.commentsCount}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

// Category swim-lane strip
function CategoryStrip({ categoryId, posts, onSeeAll }: { categoryId: CategoryId; posts: Post[]; onSeeAll: () => void }) {
  const cat = getCategoryInfo(categoryId);
  const icon = categoryId === "study" ? "book-open" :
    categoryId === "events" ? "calendar" :
    categoryId === "buysell" ? "shopping-bag" :
    categoryId === "confessions" ? "eye-off" : "message-circle";

  if (posts.length === 0) return null;

  return (
    <View style={styles.stripSection}>
      <View style={styles.stripHeader}>
        <View style={styles.stripTitleRow}>
          <View style={[styles.stripIconBox, { backgroundColor: cat.bg }]}>
            <Feather name={icon as any} size={14} color={cat.accent} />
          </View>
          <Text style={styles.stripLabel}>{cat.emoji} {cat.label}</Text>
        </View>
        <TouchableOpacity onPress={onSeeAll} style={styles.seeAllBtn}>
          <Text style={[styles.seeAllText, { color: cat.accent }]}>See all</Text>
          <Feather name="chevron-right" size={13} color={cat.accent} />
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stripScroll}
      >
        {posts.slice(0, 5).map(post => (
          <PostMiniCard key={post.id} post={post} accent={cat.accent} />
        ))}
      </ScrollView>
    </View>
  );
}

// Full-width post card (for the feed section)
const PostCard = React.memo(function PostCard({ post, C, onLike, onComment, isDark, onRetryPending }: any) {
  const isPendingPost = (post as any)._pending === true;
  const isFailedPost = (post as any)._failed === true;
  const [liked, setLiked] = useState(post.isLiked);
  const [likes, setLikes] = useState(post.likesCount);
  const [saved, setSaved] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;
  const tapRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taps = useRef(0);
  const cat = getCategoryInfo(detectCategory(post.content));
  const { showToast } = useToast();

  const handleLike = () => {
    if (Platform.OS !== "web") ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light);
    setLiked(!liked);
    setLikes((l: number) => liked ? l - 1 : l + 1);
    onLike(post.id);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.3, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  const handleTap = () => {
    taps.current += 1;
    if (taps.current === 2) {
      if (tapRef.current) clearTimeout(tapRef.current);
      taps.current = 0;
      if (!liked) { setLiked(true); setLikes((l: number) => l + 1); onLike(post.id); }
      if (Platform.OS !== "web") ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium);
    } else {
      tapRef.current = setTimeout(() => {
        taps.current = 0;
        router.push(`/post/${post.id}`);
      }, 280);
    }
  };

  const handleAuthorPress = () => {
    if (post.isAnonymous) {
      showToast("Anonymous post — profile is hidden", "info");
      return;
    }
    router.push(`/profile/${post.author.id}`);
  };

  const displayName = post.isAnonymous ? "Profile Hidden" : post.author.name;
  const yearSuffix = (y: number) => y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th";
  const genderEmojiCard = (g?: string | null) => g === "male" ? " 👨" : g === "female" ? " 👩" : g === "other" ? " 🧑" : "";
  const displayMeta = post.isAnonymous
    ? ([post.author.program, post.author.year ? `${post.author.year}${yearSuffix(post.author.year)} Year` : null].filter(Boolean).join(" • ") || "Anonymous") + genderEmojiCard((post.author as any).gender)
    : post.author.college || post.author.program || "Student";

  return (
    <Pressable
      onPress={handleTap}
      style={[
        styles.postCard,
        {
          backgroundColor: isDark ? C.surface : WARM.surface,
          borderColor: isDark ? C.border : WARM.border,
          borderLeftColor: post.isAnonymous ? "#6B7280" : cat.accent,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.postHeader}>
        <Pressable onPress={handleAuthorPress}>
          {post.isAnonymous ? (
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#6B7280", alignItems: "center", justifyContent: "center" }}>
              <Feather name="user-x" size={18} color="#fff" />
            </View>
          ) : (
            <GradientAvatar name={post.author.name} avatar={post.author.avatar} size={40} />
          )}
        </Pressable>
        <View style={styles.postHeaderInfo}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            <Text style={[styles.authorName, { color: isDark ? C.text : WARM.text }]}>{displayName}</Text>
            {post.isAnonymous && (
              <View style={{ backgroundColor: "#F3F4F6", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 9, color: "#6B7280", fontFamily: "Inter_600SemiBold" }}>ANON</Text>
              </View>
            )}
            {!post.isAnonymous && <AuthorBadge author={post.author} size={15} />}
            {post.hidden && post.isOwnPost && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#FEF3C7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Feather name="eye-off" size={9} color="#B45309" />
                <Text style={{ fontSize: 9, color: "#B45309", fontFamily: "Inter_600SemiBold" }}>HIDDEN</Text>
              </View>
            )}
            {isPendingPost && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: isFailedPost ? "#FEE2E2" : "#FEF9C3", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Feather name={isFailedPost ? "alert-circle" : "clock"} size={9} color={isFailedPost ? "#DC2626" : "#A16207"} />
                <Text style={{ fontSize: 9, color: isFailedPost ? "#DC2626" : "#A16207", fontFamily: "Inter_600SemiBold" }}>{isFailedPost ? "FAILED" : "PENDING"}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.postMeta, { color: isDark ? C.textTertiary : WARM.textTertiary }]}>
            {displayMeta} · {timeAgo(post.createdAt)}
            {post.editedAt ? " · edited" : ""}
          </Text>
        </View>
        {/* Category pill */}
        <View style={[styles.catPill, { backgroundColor: post.isAnonymous ? "#F3F4F6" : cat.bg }]}>
          <Text style={[styles.catPillText, { color: post.isAnonymous ? "#6B7280" : cat.accent }]}>
            {post.isAnonymous ? "🙈" : cat.emoji}
          </Text>
        </View>
        {/* Owner-only 3-dot menu */}
        {post.isOwnPost && (
          <TouchableOpacity
            onPress={(e: any) => { e?.stopPropagation?.(); setMenuOpen(true); }}
            style={styles.moreBtn}
            hitSlop={8}
            activeOpacity={0.7}
          >
            <Feather name="more-vertical" size={18} color={isDark ? C.textSecondary : WARM.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {post.content ? (
        <Text style={[styles.postContent, { color: isDark ? C.text : WARM.text }]}>{post.content}</Text>
      ) : null}

      {post.isOwnPost && (
        <PostActionsMenu
          post={{ id: post.id, content: post.content, hidden: post.hidden }}
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          isDark={isDark}
        />
      )}

      {/* Media */}
      {post.mediaUrls?.length > 0 && (
        <View style={styles.mediaContainer}>
          {post.mediaUrls.length === 1 ? (
            <Image source={{ uri: post.mediaUrls[0] }} style={styles.mediaSingle} contentFit="cover" cachePolicy="disk" placeholder={PLACEHOLDER_BLURHASH} transition={200} />
          ) : (
            <View style={styles.mediaGrid}>
              {post.mediaUrls.slice(0, 4).map((uri: string, i: number) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={[styles.mediaGridItem, post.mediaUrls.length === 2 ? { width: "49.5%", height: 180 } : { width: "49.5%", height: 120 }]}
                  contentFit="cover"
                  cachePolicy="disk"
                  placeholder={PLACEHOLDER_BLURHASH}
                  transition={200}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Tap to retry for failed pending posts */}
      {isPendingPost && isFailedPost && onRetryPending && (
        <Pressable
          onPress={() => onRetryPending((post as any)._queueId)}
          style={{ marginHorizontal: 14, marginBottom: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: "#FEE2E2", alignItems: "center" }}
        >
          <Text style={{ fontSize: 13, color: "#DC2626", fontFamily: "Inter_600SemiBold" }}>Tap to retry</Text>
        </Pressable>
      )}

      {/* Actions */}
      <View style={[styles.postActions, { borderTopColor: isDark ? C.borderLight : WARM.borderLight }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={isPendingPost ? undefined : handleLike} activeOpacity={isPendingPost ? 1 : 0.7}>
          <Animated.View style={{ transform: [{ scale: heartScale }], opacity: isPendingPost ? 0.4 : 1 }}>
            <Feather name="heart" size={19} color={liked ? "#EF4444" : (isDark ? C.textTertiary : WARM.textTertiary)} />
          </Animated.View>
          {likes > 0 && <Text style={[styles.actionCount, { color: liked ? "#EF4444" : (isDark ? C.textTertiary : WARM.textTertiary) }]}>{likes}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={isPendingPost ? undefined : () => onComment(post.id)} activeOpacity={isPendingPost ? 1 : 0.7}>
          <Feather name="message-circle" size={19} color={isDark ? C.textTertiary : WARM.textTertiary} />
          {post.commentsCount > 0 && <Text style={[styles.actionCount, { color: isDark ? C.textTertiary : WARM.textTertiary }]}>{post.commentsCount}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
          <Feather name="share-2" size={19} color={isDark ? C.textTertiary : WARM.textTertiary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.actionBtn} onPress={() => setSaved(!saved)} activeOpacity={0.7}>
          <Feather name="bookmark" size={19} color={saved ? "#F59E0B" : (isDark ? C.textTertiary : WARM.textTertiary)} />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
});

// Skeleton post card for the main feed
function SkeletonPostCard({ isDark, C }: any) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const bg = { backgroundColor: isDark ? C.border : "#E7E5E4" };
  return (
    <Animated.View style={{
      opacity, marginHorizontal: 14, borderRadius: 16, padding: 14,
      backgroundColor: isDark ? C.surface : WARM.surface,
      borderWidth: 0.5, borderColor: isDark ? C.border : WARM.border,
      borderLeftWidth: 3, borderLeftColor: isDark ? C.border : WARM.border,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <View style={[{ width: 40, height: 40, borderRadius: 20 }, bg]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[{ height: 11, width: "50%", borderRadius: 5 }, bg]} />
          <View style={[{ height: 9, width: "35%", borderRadius: 5 }, bg]} />
        </View>
      </View>
      <View style={[{ height: 11, width: "92%", borderRadius: 5, marginBottom: 7 }, bg]} />
      <View style={[{ height: 11, width: "80%", borderRadius: 5, marginBottom: 7 }, bg]} />
      <View style={[{ height: 11, width: "62%", borderRadius: 5, marginBottom: 16 }, bg]} />
      <View style={{ flexDirection: "row", gap: 16 }}>
        <View style={[{ height: 9, width: 44, borderRadius: 5 }, bg]} />
        <View style={[{ height: 9, width: 44, borderRadius: 5 }, bg]} />
      </View>
    </Animated.View>
  );
}

// Skeleton swim-lane strip
function SkeletonStrip({ isDark, C }: any) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const bg = { backgroundColor: isDark ? C.border : "#E7E5E4" };
  return (
    <Animated.View style={{ opacity, paddingHorizontal: 16, marginBottom: 24 }}>
      <View style={[{ height: 14, width: 120, borderRadius: 7, marginBottom: 12 }, bg]} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEnabled={false} contentContainerStyle={{ gap: 12 }}>
        {[1, 2, 3].map(i => (
          <View key={i} style={[styles.miniCard, { borderLeftColor: "#E7E5E4" }]}>
            <View style={[{ height: 11, width: "70%", borderRadius: 5, marginBottom: 8 }, bg]} />
            <View style={[{ height: 11, width: "90%", borderRadius: 5, marginBottom: 6 }, bg]} />
            <View style={[{ height: 11, width: "60%", borderRadius: 5 }, bg]} />
          </View>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = Colors[isDark ? "dark" : "light"];
  const { apiRequest, user } = useAuth();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const { pendingPosts, retryItem: retryQueueItem } = useOfflineQueue();

  const bg = isDark ? C.background : WARM.bg;
  const surfaceBg = isDark ? C.surface : WARM.surface;
  const borderCol = isDark ? C.border : WARM.border;
  const textCol = isDark ? C.text : WARM.text;
  const mutedCol = isDark ? C.textTertiary : WARM.textTertiary;

  const { data, isLoading, isError, isFetching, failureCount, refetch, isRefetching } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const res = await apiRequest("/posts");
      throwIfNotOk(res);
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

  // Group posts by category.
  // Anonymous posts always go to confessions.
  // For non-anonymous posts: use the DB category only when it is explicitly set to a
  // non-default value (study / events / buysell); everything else falls back to
  // keyword-based detection so legacy posts (which defaulted to "social") are
  // correctly distributed across study / events / buysell / social.
  const postsByCategory = React.useMemo(() => {
    const groups: Record<string, Post[]> = { study: [], events: [], buysell: [], social: [], confessions: [] };
    for (const p of posts) {
      let bucket: string;
      if (p.isAnonymous) {
        bucket = "confessions";
      } else {
        const cat = (p as any).category as string | undefined;
        bucket = (cat && cat !== "social" && groups[cat] !== undefined) ? cat : detectCategory(p.content);
      }
      groups[bucket].push(p);
    }
    return groups;
  }, [posts]);

  // Build pending post objects from queue
  const pendingPostItems = React.useMemo<Post[]>(() => {
    return pendingPosts.map(item => ({
      id: item.id,
      content: item.payload.content ?? "",
      mediaUrls: item.payload.mediaUrls ?? [],
      isAnonymous: item.payload.isAnonymous ?? false,
      isOwnPost: true,
      hidden: false,
      editedAt: null,
      likesCount: 0,
      commentsCount: 0,
      isLiked: false,
      createdAt: new Date().toISOString(),
      author: {
        id: user?.id ?? "",
        name: user?.name ?? "You",
        avatar: user?.avatar ?? undefined,
        program: (user as any)?.program ?? undefined,
        college: (user as any)?.college ?? undefined,
      },
      _pending: true,
      _failed: item.status === "failed",
      _queueId: item.id,
      _category: item.payload.category ?? "social",
    } as any));
  }, [pendingPosts, user]);

  // Filtered posts for the feed section
  const feedPosts = React.useMemo(() => {
    const filtered: Post[] = activeCategory === "all"
      ? posts.filter(p => !p.isAnonymous)
      : activeCategory === "confessions"
        ? postsByCategory.confessions
        : postsByCategory[activeCategory] ?? [];
    const relevantPending = pendingPostItems.filter(p => {
      if (!(p as any)._pending) return false;
      if ((p as any).isAnonymous) {
        return activeCategory === "all" || activeCategory === "confessions";
      }
      const cat: string = (p as any)._category ?? "social";
      if (activeCategory === "all") return true;
      return cat === activeCategory;
    });
    return [...relevantPending, ...filtered];
  }, [posts, postsByCategory, activeCategory, pendingPostItems]);

  const handleLike = useCallback((id: string) => likeMutation.mutate(id), [likeMutation.mutate]);
  const handleComment = useCallback((id: string) => router.push(`/post/${id}`), []);

  const handleRetryPending = useCallback((queueId: string) => {
    retryQueueItem(queueId);
  }, [retryQueueItem]);

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <PostCard
      post={item}
      C={C}
      isDark={isDark}
      onLike={handleLike}
      onComment={handleComment}
      onRetryPending={handleRetryPending}
    />
  ), [C, isDark, handleLike, handleComment, handleRetryPending]);

  const ListHeader = () => (
    <View style={{ backgroundColor: bg }}>
      {/* Create post box */}
      <Pressable
        style={[styles.createBox, {
          backgroundColor: activeCategory === "confessions" ? "#F3F4F6" : surfaceBg,
          borderColor: activeCategory === "confessions" ? "#6B7280" : borderCol,
        }]}
        onPress={() => router.push({
          pathname: "/new-post",
          params: {
            category: activeCategory === "all" ? "social" : activeCategory,
            ...(activeCategory === "confessions" ? { forceAnonymous: "1" } : {}),
          },
        })}
      >
        {activeCategory === "confessions" ? (
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#6B7280", alignItems: "center", justifyContent: "center" }}>
            <Feather name="user-x" size={17} color="#fff" />
          </View>
        ) : (
          <GradientAvatar name={user?.name || "?"} avatar={user?.avatar ?? undefined} size={36} />
        )}
        <View style={[styles.createInput, { backgroundColor: isDark ? C.backgroundSecondary : "#F5F3EF", borderColor: borderCol }]}>
          <Text style={[styles.createPlaceholder, { color: mutedCol }]}>
            {activeCategory === "confessions" ? "Share anonymously…" : "What's on your mind?"}
          </Text>
        </View>
        <View style={[styles.createMediaBtn, { backgroundColor: activeCategory === "confessions" ? "#E5E7EB" : (isDark ? C.primaryLight : "#EFF6FF") }]}>
          <Feather name={activeCategory === "confessions" ? "eye-off" : "image"} size={15} color={activeCategory === "confessions" ? "#6B7280" : (isDark ? C.primary : "#3B82F6")} />
        </View>
      </Pressable>

      {/* Swim-lane strips — only shown in "All" mode */}
      {activeCategory === "all" && !isLoading && (
        <View style={{ marginTop: 4 }}>
          {(["confessions", "study", "events", "buysell", "social"] as const).map(catId => (
            postsByCategory[catId].length > 0 && (
              <CategoryStrip
                key={catId}
                categoryId={catId}
                posts={postsByCategory[catId]}
                onSeeAll={() => setActiveCategory(catId)}
              />
            )
          ))}
        </View>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <View style={{ marginTop: 8 }}>
          {[1, 2].map(i => <SkeletonStrip key={i} isDark={isDark} C={C} />)}
        </View>
      )}

      {/* Recent posts label */}
      {feedPosts.length > 0 && (
        <View style={[styles.feedLabelRow, { borderTopColor: borderCol, backgroundColor: bg }]}>
          <Text style={[styles.feedLabel, { color: mutedCol }]}>
            {activeCategory === "all" ? "RECENT POSTS" : getCategoryInfo(activeCategory).label.toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[
        styles.header,
        { paddingTop: isWeb ? 67 : insets.top + 10, borderBottomColor: borderCol, backgroundColor: bg },
      ]}>
        <View>
          <Text style={[styles.headerBrand, { color: textCol }]}>Campus Board</Text>
          <Text style={[styles.headerSub, { color: mutedCol }]}>
            {user?.college || "Your Campus"}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={[styles.headerIconBtn, { backgroundColor: surfaceBg, borderColor: borderCol }]}>
            <Feather name="search" size={18} color={isDark ? C.textSecondary : WARM.textSecondary} />
          </Pressable>
          <Pressable
            style={[styles.headerIconBtn, { backgroundColor: surfaceBg, borderColor: borderCol }]}
            onPress={() => router.push({ pathname: "/new-post", params: { category: activeCategory === "all" || activeCategory === "confessions" ? "social" : activeCategory } })}
          >
            <Feather name="plus" size={18} color={isDark ? C.textSecondary : WARM.textSecondary} />
            <View style={[styles.notifDot, { backgroundColor: C.error }]} />
          </Pressable>
        </View>
      </View>

      {/* Category filter chips */}
      <View style={[styles.chipRow, { backgroundColor: bg, borderBottomColor: borderCol }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          {CATEGORIES.map(cat => {
            const active = activeCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setActiveCategory(cat.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? cat.bg : (isDark ? C.backgroundSecondary : WARM.surface),
                    borderColor: active ? cat.accent + "44" : borderCol,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: active ? cat.accent : mutedCol }]}>
                  {cat.emoji} {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Retry-in-progress banner */}
      {failureCount > 0 && isFetching && !isError && (
        <RetryingBanner attempt={failureCount} />
      )}

      {/* Feed — marketplace replaces regular posts for buy/sell/rent */}
      {activeCategory === "buysell" ? (
        <MarketplaceFeed isDark={isDark} C={C} user={user} />
      ) : isError ? (
        <RetryableError onRetry={refetch} />
      ) : (
        <FlatList
          data={feedPosts}
          renderItem={renderPost}
          keyExtractor={item => item.id}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ paddingBottom: isWeb ? 120 : 110 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10, backgroundColor: bg }} />}
          ListEmptyComponent={
            isLoading ? (
              <View style={{ gap: 10, paddingTop: 4 }}>
                {[1, 2, 3].map(i => <SkeletonPostCard key={i} isDark={isDark} C={C} />)}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>
                  {activeCategory === "study" ? "📚" : activeCategory === "events" ? "🎪" : activeCategory === "social" ? "💬" : "✦"}
                </Text>
                <Text style={[styles.emptyTitle, { color: textCol }]}>Nothing here yet</Text>
                <Text style={[styles.emptyText, { color: mutedCol }]}>
                  {activeCategory === "all"
                    ? "Be the first to post something to your campus board!"
                    : `No ${getCategoryInfo(activeCategory).label.toLowerCase()} posts yet. Be the first!`}
                </Text>
                <Pressable
                  style={[styles.emptyBtn, { backgroundColor: getCategoryInfo(activeCategory).accent }]}
                  onPress={() => router.push("/new-post")}
                >
                  <Feather name="plus" size={15} color="#fff" />
                  <Text style={styles.emptyBtnText}>Create Post</Text>
                </Pressable>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 0.5,
  },
  headerBrand: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  headerRight: { flexDirection: "row", gap: 8 },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    borderWidth: 0.5,
  },
  notifDot: { position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: 3.5 },

  // Category chips
  chipRow: { borderBottomWidth: 0.5 },
  chipScroll: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, flexDirection: "row", alignItems: "center",
  },
  chipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // Create box
  createBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    margin: 14, padding: 12, borderRadius: 14, borderWidth: 0.5,
  },
  createInput: {
    flex: 1, height: 38, borderRadius: 19,
    justifyContent: "center", paddingHorizontal: 14, borderWidth: 0.5,
  },
  createPlaceholder: { fontSize: 13, fontFamily: "Inter_400Regular" },
  createMediaBtn: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },

  // Category swim-lane strip
  stripSection: { marginBottom: 20 },
  stripHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, marginBottom: 10,
  },
  stripTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  stripIconBox: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  stripLabel: { fontSize: 14, fontFamily: "Inter_700Bold", color: WARM.text },
  seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAllText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  stripScroll: { paddingLeft: 16, paddingRight: 8, gap: 10 },

  // Mini card (horizontal swim-lane)
  miniCard: {
    width: 172,
    backgroundColor: WARM.surface,
    borderRadius: 14,
    borderLeftWidth: 3,
    padding: 12,
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    justifyContent: "space-between",
    minHeight: 130,
  },
  miniCardHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
  miniCardAuthor: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: WARM.text, maxWidth: 110 },
  miniCardBadge: { fontSize: 9, fontFamily: "Inter_400Regular", color: WARM.textTertiary },
  miniCardContent: { fontSize: 12, fontFamily: "Inter_400Regular", color: WARM.textSecondary, lineHeight: 17, flex: 1 },
  miniCardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  miniCardTime: { fontSize: 10, fontFamily: "Inter_400Regular", color: WARM.textTertiary },
  miniCardStat: { fontSize: 10, fontFamily: "Inter_500Medium", color: WARM.textTertiary },

  // Feed label
  feedLabelRow: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 0.5 },
  feedLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },

  // Post card (full-width feed)
  postCard: {
    marginHorizontal: 14,
    borderRadius: 16,
    borderWidth: 0.5,
    borderLeftWidth: 3,
    overflow: "hidden",
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, paddingBottom: 10 },
  postHeaderInfo: { flex: 1 },
  authorName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  verifiedBadge: { width: 15, height: 15, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  postMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  catPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  catPillText: { fontSize: 14 },
  moreBtn: { padding: 4, marginLeft: 2 },
  postContent: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", paddingHorizontal: 14, paddingBottom: 12 },
  mediaContainer: { marginBottom: 12 },
  mediaSingle: { width: "100%", height: 260 },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 2 },
  mediaGridItem: { borderRadius: 2 },
  postActions: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 8,
    borderTopWidth: 0.5, gap: 2,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 10 },
  actionCount: { fontSize: 13, fontFamily: "Inter_500Medium" },

  // Empty state
  emptyState: { alignItems: "center", paddingHorizontal: 32, paddingVertical: 52, gap: 10 },
  emptyEmoji: { fontSize: 44, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 22, paddingVertical: 11,
    borderRadius: 22, marginTop: 8,
  },
  emptyBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
