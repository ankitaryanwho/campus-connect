import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Image } from "expo-image";
import { PLACEHOLDER_BLURHASH } from "@/constants/imagePlaceholder";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { BADGE_META } from "@/constants/badges";
import { AuthorBadge } from "@/components/AuthorBadge";
import { PostActionsMenu } from "@/components/PostActionsMenu";

const SERVICE_META: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  assignments: { label: "Assignments", icon: "file-text", color: "#5B4FE8" },
  coaching: { label: "Coaching", icon: "users", color: "#10B981" },
  deliveries: { label: "Deliveries", icon: "truck", color: "#F59E0B" },
  tasks: { label: "Tasks", icon: "clipboard", color: "#EF4444" },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en", { day: "numeric", month: "short" });
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = Colors[isDark ? "dark" : "light"];
  const { apiRequest, user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const isWeb = Platform.OS === "web";
  const isMe = currentUser?.id === id;
  const [openMenuPostId, setOpenMenuPostId] = React.useState<string | null>(null);

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
  if (!profile) return null;

  const posts = postsQuery.data?.posts || [];
  const badge = profile.verificationBadge
    ? BADGE_META[profile.verificationBadge]
    : null;

  let svcs: string[] = [];
  try {
    svcs = JSON.parse(profile.services || "[]");
  } catch {}

  // Top bar height = top safe inset + paddingTop offset (10) + button height (40) + paddingBottom (12)
  const topBarPadTop = isWeb ? 67 : insets.top + 10;
  const TOP_BAR_HEIGHT = topBarPadTop + 40 + 12;
  // Cover gradient covers top bar + the centered identity block.
  // Required content: badge ~38 + avatar 120 + name ~36 + email ~22 + spacers ~24 ≈ 202 + badge
  // Plus 80px clearance below so the floating buttons (-28 marginTop) leave the
  // identity row visually clear even on Android with larger font scaling.
  const COVER_HEIGHT = TOP_BAR_HEIGHT + 12 + (badge ? 38 : 0) + 202 + 80;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Floating top bar (overlays gradient) */}
      <View style={[styles.topBar, { paddingTop: topBarPadTop }]}>
        <Pressable
          style={styles.glassBtn}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Feather name="arrow-left" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.topTitle}>Profile</Text>
        <Pressable style={styles.glassBtn} hitSlop={8}>
          <Feather name="more-horizontal" size={20} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: isWeb ? 60 : 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Indigo cover gradient */}
        <LinearGradient
          colors={["#5B4FE8", "#7B73F0"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.cover,
            { height: COVER_HEIGHT, paddingTop: TOP_BAR_HEIGHT + 12 },
          ]}
        >
          {/* Decorative circles */}
          <View
            style={[
              styles.coverCircle,
              {
                top: -50,
                right: -50,
                width: 250,
                height: 250,
                borderRadius: 125,
              },
            ]}
          />
          <View
            style={[
              styles.coverCircle,
              {
                bottom: -80,
                left: -40,
                width: 180,
                height: 180,
                borderRadius: 90,
              },
            ]}
          />

          {/* Verification badge chip */}
          {badge && (
            <View style={styles.bannerBadgeWrap}>
              <View style={styles.bannerBadge}>
                <Feather name={badge.icon as any} size={12} color="#fff" />
                <Text style={styles.bannerBadgeText}>{badge.label}</Text>
              </View>
            </View>
          )}

          {/* Centered hero identity */}
          <View style={styles.heroCenter}>
            <View style={styles.avatarRing}>
              <View
                style={[styles.avatarInner, { backgroundColor: C.surface }]}
              >
                {profile.avatar ? (
                  <Image
                    source={{ uri: profile.avatar }}
                    style={styles.avatar}
                    cachePolicy="disk"
                    placeholder={PLACEHOLDER_BLURHASH}
                    transition={200}
                  />
                ) : (
                  <LinearGradient
                    colors={["#5B4FE8", "#9F94F8"]}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarText}>
                      {getInitials(profile.name)}
                    </Text>
                  </LinearGradient>
                )}
              </View>
            </View>

            {/* Name + verification badge */}
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {profile.name}
              </Text>
              {(profile.verified || profile.verificationBadge) && (
                <View style={styles.verifiedCircle}>
                  <AuthorBadge author={profile} size={20} />
                </View>
              )}
            </View>

            {/* Email + dot + role pill */}
            <View style={styles.emailRow}>
              {profile.email && (
                <>
                  <Text style={styles.userEmail} numberOfLines={1}>
                    {profile.email}
                  </Text>
                  <View style={styles.emailDot} />
                </>
              )}
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>{profile.role}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Floating action buttons (overlap gradient bottom) */}
        {!isMe ? (
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={[
                styles.primaryActionBtn,
                {
                  backgroundColor: profile.isFollowing ? C.surface : C.primary,
                  borderWidth: profile.isFollowing ? 1 : 0,
                  borderColor: C.border,
                },
              ]}
              onPress={() => followMutation.mutate()}
              disabled={followMutation.isPending}
              activeOpacity={0.85}
            >
              {followMutation.isPending ? (
                <ActivityIndicator
                  size="small"
                  color={profile.isFollowing ? C.text : "#fff"}
                />
              ) : (
                <>
                  <Feather
                    name={profile.isFollowing ? "user-check" : "user-plus"}
                    size={16}
                    color={profile.isFollowing ? C.text : "#fff"}
                  />
                  <Text
                    style={[
                      styles.primaryActionText,
                      { color: profile.isFollowing ? C.text : "#fff" },
                    ]}
                  >
                    {profile.isFollowing ? "Following" : "Follow"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: C.surface }]}
              onPress={() => startChatMutation.mutate()}
              disabled={startChatMutation.isPending}
              activeOpacity={0.85}
            >
              {startChatMutation.isPending ? (
                <ActivityIndicator size="small" color={C.text} />
              ) : (
                <Feather name="message-circle" size={20} color={C.text} />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: C.surface }]}
              onPress={() => router.push("/(tabs)/profile" as any)}
              activeOpacity={0.85}
            >
              <Feather name="edit-2" size={16} color={C.text} />
              <Text style={[styles.primaryActionText, { color: C.text }]}>
                Edit Profile
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: C.surface }]}
              activeOpacity={0.85}
            >
              <Feather name="share-2" size={20} color={C.text} />
            </TouchableOpacity>
          </View>
        )}

        {/* Bio + Meta */}
        <View style={styles.bioBlock}>
          {profile.bio ? (
            <Text style={[styles.bioText, { color: C.text }]}>
              {profile.bio}
            </Text>
          ) : null}
          {(profile.college || profile.program) && (
            <View style={styles.metaRow}>
              {profile.college && (
                <View style={styles.metaItem}>
                  <Feather name="map-pin" size={14} color={C.textTertiary} />
                  <Text
                    style={[styles.metaText, { color: C.textSecondary }]}
                    numberOfLines={1}
                  >
                    {profile.college}
                  </Text>
                </View>
              )}
              {profile.program && (
                <View style={styles.metaItem}>
                  <Feather name="book" size={14} color={C.textTertiary} />
                  <Text
                    style={[styles.metaText, { color: C.textSecondary }]}
                    numberOfLines={1}
                  >
                    {profile.program}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Combined stats pill */}
        <View
          style={[
            styles.statsCard,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
        >
          {[
            { value: profile.postsCount ?? 0, label: "Posts" },
            { value: profile.followersCount ?? 0, label: "Followers" },
            { value: profile.followingCount ?? 0, label: "Following" },
          ].map((stat, i) => (
            <React.Fragment key={stat.label}>
              {i > 0 && (
                <View
                  style={[styles.statsDivider, { backgroundColor: C.border }]}
                />
              )}
              <View style={styles.statBlock}>
                <Text style={[styles.statValue, { color: C.text }]}>
                  {stat.value}
                </Text>
                <Text style={[styles.statLabel, { color: C.textSecondary }]}>
                  {stat.label}
                </Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Services Offered */}
        {svcs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>
              Services offered
            </Text>
            <View style={styles.svcRow}>
              {svcs.map((svc) => {
                const meta = SERVICE_META[svc] || {
                  label: svc,
                  icon: "star",
                  color: C.primary,
                };
                return (
                  <View
                    key={svc}
                    style={[
                      styles.svcChip,
                      { backgroundColor: C.surface, borderColor: C.border },
                    ]}
                  >
                    <View
                      style={[styles.svcDot, { backgroundColor: meta.color }]}
                    />
                    <Text style={[styles.svcLabel, { color: C.text }]}>
                      {meta.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Posts */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Posts</Text>
          {postsQuery.isLoading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} />
          ) : posts.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: C.surface, borderColor: C.border },
              ]}
            >
              <Feather name="file-text" size={28} color={C.textTertiary} />
              <Text style={[styles.emptyText, { color: C.textSecondary }]}>
                No posts yet
              </Text>
            </View>
          ) : (
            posts.map((post) => (
              <Pressable
                key={post.id}
                style={[
                  styles.postItem,
                  { backgroundColor: C.surface, borderColor: C.border },
                ]}
                onPress={() => router.push(`/post/${post.id}`)}
              >
                {isMe && (
                  <Pressable
                    onPress={(e: any) => {
                      e?.stopPropagation?.();
                      setOpenMenuPostId(post.id);
                    }}
                    hitSlop={8}
                    style={{ position: "absolute", top: 8, right: 8, padding: 6, zIndex: 5 }}
                  >
                    <Feather name="more-horizontal" size={18} color={C.textSecondary} />
                  </Pressable>
                )}
                <View style={{ flexDirection: "row", gap: 6, marginHorizontal: 14, marginTop: 12, flexWrap: "wrap" }}>
                  {post.editedAt && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EEF2FF", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                      <Feather name="edit-2" size={9} color="#5B4FE8" />
                      <Text style={{ fontSize: 9, color: "#5B4FE8", fontFamily: "Inter_600SemiBold" }}>EDITED</Text>
                    </View>
                  )}
                  {post.hidden && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FEF3C7", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                      <Feather name="eye-off" size={9} color="#92400E" />
                      <Text style={{ fontSize: 9, color: "#92400E", fontFamily: "Inter_600SemiBold" }}>HIDDEN</Text>
                    </View>
                  )}
                </View>
                {post.content ? (
                  <Text
                    style={[styles.postContent, { color: C.text }]}
                    numberOfLines={3}
                  >
                    {post.content}
                  </Text>
                ) : null}

                {Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0 && (
                  <View style={styles.mediaContainer}>
                    {post.mediaUrls.length === 1 ? (
                      <Image
                        source={{ uri: post.mediaUrls[0] }}
                        style={styles.mediaSingle}
                        contentFit="cover"
                        cachePolicy="disk"
                        placeholder={PLACEHOLDER_BLURHASH}
                        transition={200}
                      />
                    ) : (
                      <View style={styles.mediaGrid}>
                        {post.mediaUrls
                          .slice(0, 4)
                          .map((uri: string, i: number) => (
                            <Image
                              key={i}
                              source={{ uri }}
                              style={[
                                styles.mediaGridItem,
                                post.mediaUrls.length === 2
                                  ? { width: "49.5%", height: 160 }
                                  : { width: "49.5%", height: 110 },
                              ]}
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

                <View style={styles.postMeta}>
                  <View style={styles.postMetaItem}>
                    <Feather name="heart" size={13} color={C.textTertiary} />
                    <Text
                      style={[
                        styles.postMetaText,
                        { color: C.textTertiary },
                      ]}
                    >
                      {post.likesCount ?? 0}
                    </Text>
                  </View>
                  <View style={styles.postMetaItem}>
                    <Feather
                      name="message-circle"
                      size={13}
                      color={C.textTertiary}
                    />
                    <Text
                      style={[
                        styles.postMetaText,
                        { color: C.textTertiary },
                      ]}
                    >
                      {post.commentsCount ?? 0}
                    </Text>
                  </View>
                  {post.createdAt && (
                    <Text
                      style={[
                        styles.postMetaText,
                        { color: C.textTertiary, marginLeft: "auto" },
                      ]}
                    >
                      {formatDate(post.createdAt)}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
      <PostActionsMenu
        post={posts.find((p: any) => p.id === openMenuPostId) || null}
        visible={!!openMenuPostId}
        onClose={() => setOpenMenuPostId(null)}
        onChanged={() => {
          queryClient.invalidateQueries({ queryKey: ["userPosts", id] });
          queryClient.invalidateQueries({ queryKey: ["posts"] });
        }}
        isDark={isDark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Top bar (absolute, over gradient)
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  glassBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },

  // Cover
  cover: {
    overflow: "hidden",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
  },
  coverCircle: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  bannerBadgeWrap: { alignItems: "center", marginBottom: 12 },
  bannerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  bannerBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },

  // Hero center
  heroCenter: { alignItems: "center" },
  avatarRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    marginBottom: 16,
  },
  avatarInner: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 32,
    fontFamily: "Inter_700Bold",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 6,
    width: "100%",
    paddingHorizontal: 8,
  },
  userName: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.5,
    flexShrink: 1,
    textAlign: "center",
  },
  verifiedCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "100%",
  },
  userEmail: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Inter_400Regular",
    flexShrink: 1,
  },
  emailDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  rolePillText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Floating buttons
  heroActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginTop: -28,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: "#5B4FE8",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryActionText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  shareBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  // Bio + Meta
  bioBlock: { paddingHorizontal: 24, marginTop: 20, alignItems: "center" },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 18,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "48%",
  },
  metaText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },

  // Stats
  statsCard: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 18,
    borderRadius: 24,
    borderWidth: 1,
  },
  statsDivider: { width: 1, marginVertical: 6 },
  statBlock: { flex: 1, alignItems: "center" },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  // Sections
  section: { paddingHorizontal: 20, marginTop: 28 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  svcRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  svcChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  svcDot: { width: 8, height: 8, borderRadius: 4 },
  svcLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },

  // Posts
  postItem: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    overflow: "hidden",
  },
  postContent: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    marginBottom: 10,
  },
  mediaContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  mediaSingle: { width: "100%", height: 220 },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 2 },
  mediaGridItem: { borderRadius: 2 },
  postMeta: { flexDirection: "row", alignItems: "center", gap: 14 },
  postMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  postMetaText: { fontSize: 12, fontFamily: "Inter_400Regular" },

  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
