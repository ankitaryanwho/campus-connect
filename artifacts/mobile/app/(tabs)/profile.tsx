import React, { useState, useCallback } from "react";
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
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { PLACEHOLDER_BLURHASH } from "@/constants/imagePlaceholder";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { PostActionsMenu } from "@/components/PostActionsMenu";
import { AuthorBadge } from "@/components/AuthorBadge";
import { resolveBadge } from "@/constants/badges";
import { RetryableError } from "@/components/RetryableError";

const isWeb = Platform.OS === "web";
const { width: SW } = Dimensions.get("window");

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatAmount(n: any): string {
  const num = typeof n === "string" ? parseFloat(n) : n || 0;
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-IN");
}

const BADGE_META: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  verified: { label: "Verified", icon: "check-circle", color: "#5B4FE8" },
  top_contributor: { label: "Top Contributor", icon: "star", color: "#F59E0B" },
  campus_leader: { label: "Campus Leader", icon: "award", color: "#8B5CF6" },
  expert: { label: "Expert", icon: "shield", color: "#10B981" },
  ambassador: { label: "Ambassador", icon: "user-check", color: "#3B82F6" },
  staff: { label: "Staff", icon: "briefcase", color: "#EF4444" },
};

const SERVICE_META: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  assignments: { label: "Assignments", icon: "file-text", color: "#5B4FE8" },
  coaching: { label: "Coaching", icon: "users", color: "#10B981" },
  deliveries: { label: "Deliveries", icon: "truck", color: "#F59E0B" },
  tasks: { label: "Tasks", icon: "clipboard", color: "#EF4444" },
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = Colors[isDark ? "dark" : "light"];
  const { user, apiRequest, updateUser, logout } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { forceRegisterPushToken } = useNotifications();
  const [hasLoaded, setHasLoaded] = useState(false);

  useFocusEffect(useCallback(() => { setHasLoaded(true); }, []));

  const postsQuery = useQuery({
    queryKey: ["userPosts", user?.id],
    queryFn: async () => {
      const res = await apiRequest(`/users/${user?.id}/posts`);
      return res.json() as Promise<{ posts: any[] }>;
    },
    enabled: hasLoaded && !!user?.id,
  });

  const earningsQuery = useQuery({
    queryKey: ["earnings"],
    queryFn: async () => {
      const res = await apiRequest("/services/my-earnings");
      if (!res.ok) return { today: 0, yesterday: 0, thisWeek: 0, allTime: 0, total: 0, orders: 0, history: [] };
      return res.json();
    },
    enabled: hasLoaded && user?.role === "provider",
  });

  const handleLogout = async () => {
    await logout();
    queryClient.clear();
    router.replace("/(auth)/login");
  };

  const callTestEndpoint = async () => {
    const res = await apiRequest("/notifications/test", { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Test failed");
    return data as {
      userId: string;
      firebaseConfigured: boolean;
      tokenCount: number;
      results: Array<{ ok?: boolean; type: string; errorCode?: string; errorMessage?: string }>;
    };
  };

  // Two-step diagnose:
  //   1. Ask the server how many push tokens this user has and try sending a test.
  //   2. If zero tokens, force a fresh registration on the device and re-test —
  //      surfacing the *exact* failure reason if it can't get a token.
  const testPushMutation = useMutation({
    mutationFn: async () => {
      let data = await callTestEndpoint();
      if (!data.firebaseConfigured) {
        return { stage: "no_firebase" as const, data };
      }
      if (data.tokenCount === 0) {
        const reg = await forceRegisterPushToken();
        if (!reg.ok) {
          return { stage: "register_failed" as const, data, regReason: reg.reason };
        }
        // Registration just succeeded — re-fetch tokens to confirm and send test.
        data = await callTestEndpoint();
        if (data.tokenCount === 0) {
          return { stage: "still_no_token" as const, data, regReason: reg.reason };
        }
      }
      return { stage: "tested" as const, data };
    },
    onSuccess: (out) => {
      if (out.stage === "no_firebase") {
        showToast("Push not configured on server", "error");
        return;
      }
      if (out.stage === "register_failed") {
        showToast(out.regReason, "error");
        return;
      }
      if (out.stage === "still_no_token") {
        showToast(`Token reached device but server didn't store it. ${out.regReason}`, "error");
        return;
      }
      const fcmResults = out.data.results.filter((r) => r.type === "fcm");
      const okCount = fcmResults.filter((r) => r.ok).length;
      if (okCount > 0) {
        showToast(`Test sent to ${okCount} device(s) — check your notifications!`, "success");
      } else {
        const firstErr = fcmResults.find((r) => !r.ok);
        showToast(`Push failed: ${firstErr?.errorCode || firstErr?.errorMessage || "unknown"}`, "error");
      }
    },
    onError: (err: any) => showToast(err.message || "Test failed", "error"),
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
          showToast("Profile picture updated!", "success");
        } else {
          showToast("Failed to update profile picture", "error");
        }
      }
    } catch {
      showToast("Could not open image picker", "error");
    }
  };

  // Track which own-post has its 3-dot action menu open.
  // Declared before the early return so hook order stays stable.
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);

  if (!user) return null;

  const openEditProfile = () => router.push("/edit-profile");

  const posts = postsQuery.data?.posts || [];
  const badge = user.verificationBadge
    ? BADGE_META[user.verificationBadge]
    : null;
  const openedPost = posts.find((p: any) => p.id === openMenuPostId);

  let svcs: string[] = [];
  try {
    svcs = JSON.parse(user.services || "[]");
  } catch {}

  // Top bar height = top safe inset + paddingTop offset (10) + button height (40) + paddingBottom (12)
  const topBarPadTop = isWeb ? 67 : insets.top + 10;
  const TOP_BAR_HEIGHT = topBarPadTop + 40 + 12;
  // Cover gradient covers top bar + the centered identity block.
  // Required content inside cover (below TOP_BAR_HEIGHT + 12 padding):
  //   badge chip ~38 (only when present) + avatar 120 + name 32 + email 20 + spacers 22 ≈ 194 + badge
  // We add ~58px below to clear the floating buttons (which overlap by 28px).
  const COVER_HEIGHT = TOP_BAR_HEIGHT + 12 + (badge ? 38 : 0) + 194 + 58;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Floating top bar (overlays gradient) */}
      <View style={[styles.topBar, { paddingTop: topBarPadTop }]}>
        <Pressable style={styles.glassBtn} onPress={openEditProfile}>
          <Feather name="edit-2" size={18} color="#fff" />
        </Pressable>
        <Text style={styles.topTitle}>Profile</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            style={styles.glassBtn}
            onPress={() => testPushMutation.mutate()}
            disabled={testPushMutation.isPending}
          >
            {testPushMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="bell" size={18} color="#fff" />
            )}
          </Pressable>
          <Pressable
            style={[styles.glassBtn, styles.glassBtnDanger]}
            onPress={handleLogout}
          >
            <Feather name="log-out" size={18} color="#FFE4E6" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: isWeb ? 120 : 110 }}
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
              { top: -50, right: -50, width: 250, height: 250, borderRadius: 125 },
            ]}
          />
          <View
            style={[
              styles.coverCircle,
              { bottom: -80, left: -40, width: 180, height: 180, borderRadius: 90 },
            ]}
          />

          {/* Verification badge chip (above avatar, glass) */}
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
            <Pressable onPress={pickAvatar} style={styles.avatarPressable}>
              <View style={styles.avatarRing}>
                <View
                  style={[styles.avatarInner, { backgroundColor: C.surface }]}
                >
                  {user.avatar ? (
                    <Image
                      source={{ uri: user.avatar }}
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
                        {getInitials(user.name)}
                      </Text>
                    </LinearGradient>
                  )}
                </View>
              </View>
              <View
                style={[
                  styles.cameraBtn,
                  { backgroundColor: C.surface, borderColor: C.border },
                ]}
              >
                <Feather name="camera" size={14} color={C.textSecondary} />
              </View>
            </Pressable>

            {/* Name + verified */}
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {user.name}
              </Text>
              <AuthorBadge badge={resolveBadge(user)} size={16} />
            </View>

            {/* Email + dot + role pill */}
            <View style={styles.emailRow}>
              <Text style={styles.userEmail} numberOfLines={1}>
                {user.email}
              </Text>
              <View style={styles.emailDot} />
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>{user.role}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Floating Edit Profile + Share buttons (overlap gradient bottom) */}
        <View style={styles.heroActions}>
          <TouchableOpacity
            style={[
              styles.editProfileBtn,
              { backgroundColor: C.surface },
            ]}
            onPress={openEditProfile}
            activeOpacity={0.85}
          >
            <Feather name="edit-2" size={16} color={C.text} />
            <Text style={[styles.editProfileText, { color: C.text }]}>
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

        {/* Bio + Meta */}
        <View style={styles.bioBlock}>
          {user.bio ? (
            <Text style={[styles.bioText, { color: C.text }]}>{user.bio}</Text>
          ) : (
            <Pressable onPress={openEditProfile}>
              <Text style={[styles.bioAdd, { color: C.primary }]}>
                + Add a bio to tell your story
              </Text>
            </Pressable>
          )}
          {(user.college || user.program) && (
            <View style={styles.metaRow}>
              {user.college && (
                <View style={styles.metaItem}>
                  <Feather name="map-pin" size={14} color={C.textTertiary} />
                  <Text
                    style={[styles.metaText, { color: C.textSecondary }]}
                    numberOfLines={1}
                  >
                    {user.college}
                  </Text>
                </View>
              )}
              {user.program && (
                <View style={styles.metaItem}>
                  <Feather name="book-open" size={14} color={C.textTertiary} />
                  <Text
                    style={[styles.metaText, { color: C.textSecondary }]}
                    numberOfLines={1}
                  >
                    {user.program}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Combined stats pill */}
        <View style={styles.statsBlock}>
          <View
            style={[
              styles.statsPill,
              { backgroundColor: C.surface, borderColor: C.border },
            ]}
          >
            {[
              { label: "POSTS", value: user.postsCount ?? 0 },
              { label: "FOLLOWERS", value: user.followersCount ?? 0 },
              { label: "FOLLOWING", value: user.followingCount ?? 0 },
            ].map((s, i, arr) => (
              <React.Fragment key={s.label}>
                <View style={styles.statCol}>
                  <Text style={[styles.statValue, { color: C.text }]}>
                    {s.value}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: C.textTertiary }]}
                  >
                    {s.label}
                  </Text>
                </View>
                {i < arr.length - 1 && (
                  <View
                    style={[
                      styles.statDivider,
                      { backgroundColor: C.border },
                    ]}
                  />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Services Offered */}
        {svcs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>
              Services Offered
            </Text>
            <View style={styles.servicesRow}>
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
                      styles.svcPill,
                      {
                        backgroundColor: C.surface,
                        borderColor: C.border,
                      },
                    ]}
                  >
                    <View
                      style={[styles.svcDot, { backgroundColor: meta.color }]}
                    />
                    <Text style={[styles.svcPillText, { color: C.text }]}>
                      {meta.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Earnings (provider only) */}
        {user.role === "provider" && (
          <View style={styles.section}>
            <Text
              style={[styles.sectionTitle, { color: C.text, marginBottom: 12 }]}
            >
              Earnings
            </Text>
            <LinearGradient
              colors={["#0F0C29", "#302B63", "#24243E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.earningsCard}
            >
              <View style={[styles.earningsCircle, { top: -30, right: -30 }]} />
              <View
                style={[
                  styles.earningsCircle,
                  {
                    bottom: -50,
                    left: -20,
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                  },
                ]}
              />

              <View style={styles.earningsHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.earningsLabel}>Today's Earnings</Text>
                  {earningsQuery.isLoading ? (
                    <ActivityIndicator
                      color="#fff"
                      style={{ marginVertical: 6, alignSelf: "flex-start" }}
                    />
                  ) : (
                    <Text style={styles.earningsAmount}>
                      ₹{formatAmount(earningsQuery.data?.today || 0)}
                    </Text>
                  )}
                </View>
                <View style={styles.earningsTrendIcon}>
                  <Feather name="trending-up" size={20} color="#34D399" />
                </View>
              </View>

              {/* All Time Earnings — secondary headline */}
              <View style={styles.allTimeBlock}>
                <Text style={styles.allTimeLabel}>All Time Earnings</Text>
                {earningsQuery.isLoading ? (
                  <ActivityIndicator
                    color="#fff"
                    style={{ marginVertical: 4, alignSelf: "flex-start" }}
                  />
                ) : (
                  <Text style={styles.allTimeAmount}>
                    ₹
                    {formatAmount(
                      earningsQuery.data?.allTime ??
                        earningsQuery.data?.total ??
                        0,
                    )}
                  </Text>
                )}
              </View>

              {/* Mini bar chart */}
              <View style={styles.miniChart}>
                {[35, 60, 45, 80, 55, 70, 90].map((h, i) => (
                  <View key={i} style={styles.miniChartBarWrap}>
                    <LinearGradient
                      colors={["#34D399", "#6EE7B7"]}
                      style={[styles.miniChartBar, { height: `${h}%` as any }]}
                    />
                  </View>
                ))}
              </View>

              <View style={styles.earningsFooter}>
                <View>
                  <Text style={styles.earningsStat}>
                    ₹{formatAmount(earningsQuery.data?.thisWeek || 0)}
                  </Text>
                  <Text style={styles.earningsStatLabel}>This Week</Text>
                </View>
                <View style={styles.earningsFooterDivider} />
                <View>
                  <Text style={styles.earningsStat}>
                    {earningsQuery.data?.orders || 0}
                  </Text>
                  <Text style={styles.earningsStatLabel}>Orders Done</Text>
                </View>
                <TouchableOpacity
                  style={styles.exploreBtn}
                  activeOpacity={0.85}
                  onPress={() => router.push("/earnings")}
                >
                  <LinearGradient
                    colors={["#34D399", "#059669"]}
                    style={styles.exploreBtnGradient}
                  >
                    <Text style={styles.exploreBtnText}>Explore</Text>
                    <Feather name="arrow-right" size={14} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Posts section */}
        <View style={styles.section}>
          <View style={styles.postsHeader}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>
              My Posts
            </Text>
            {posts.length > 0 && (
              <View
                style={[styles.postCount, { backgroundColor: C.primaryLight }]}
              >
                <Text style={[styles.postCountText, { color: C.primary }]}>
                  {posts.length}
                </Text>
              </View>
            )}
          </View>

          {postsQuery.isLoading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} />
          ) : postsQuery.isError ? (
            <RetryableError onRetry={postsQuery.refetch} />
          ) : posts.length === 0 ? (
            <View
              style={[
                styles.emptyPosts,
                { backgroundColor: C.surface, borderColor: C.border },
              ]}
            >
              <LinearGradient
                colors={[C.primaryLight, "transparent"]}
                style={styles.emptyPostsInner}
              >
                <Feather
                  name="edit"
                  size={36}
                  color={C.primary}
                  style={{ opacity: 0.5 }}
                />
                <Text style={[styles.emptyPostsText, { color: C.text }]}>
                  No posts yet
                </Text>
                <TouchableOpacity
                  style={[styles.createPostBtn, { backgroundColor: C.primary }]}
                  onPress={() => router.push("/new-post")}
                  activeOpacity={0.85}
                >
                  <Feather name="plus" size={14} color="#fff" />
                  <Text style={styles.createPostBtnText}>
                    Create First Post
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          ) : (
            posts.map((post: any) => (
              <TouchableOpacity
                key={post.id}
                style={[
                  styles.postCard,
                  { backgroundColor: C.surface, borderColor: C.border },
                  post.hidden && { opacity: 0.78 },
                ]}
                onPress={() => router.push(`/post/${post.id}`)}
                activeOpacity={0.8}
              >
                {post.mediaUrls?.length > 0 && (
                  <Image
                    source={{ uri: post.mediaUrls[0] }}
                    style={styles.postThumb}
                    contentFit="cover"
                    cachePolicy="disk"
                    placeholder={PLACEHOLDER_BLURHASH}
                    transition={200}
                  />
                )}
                {/* 3-dot menu — owner-only on own profile, so always shown */}
                <TouchableOpacity
                  style={styles.postCardMore}
                  onPress={(e: any) => { e?.stopPropagation?.(); setOpenMenuPostId(post.id); }}
                  hitSlop={10}
                  activeOpacity={0.7}
                >
                  <View style={styles.postCardMoreInner}>
                    <Feather name="more-vertical" size={16} color={C.text} />
                  </View>
                </TouchableOpacity>
                <View style={styles.postCardBody}>
                  {/* Status pills (Hidden / Edited) */}
                  {(post.hidden || post.editedAt) && (
                    <View style={{ flexDirection: "row", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                      {post.hidden && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#FEF3C7", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                          <Feather name="eye-off" size={9} color="#B45309" />
                          <Text style={{ fontSize: 9, color: "#B45309", fontFamily: "Inter_600SemiBold" }}>HIDDEN</Text>
                        </View>
                      )}
                      {post.editedAt && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#EEF2FF", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                          <Feather name="edit-2" size={9} color="#5B4FE8" />
                          <Text style={{ fontSize: 9, color: "#5B4FE8", fontFamily: "Inter_600SemiBold" }}>EDITED</Text>
                        </View>
                      )}
                    </View>
                  )}
                  <Text
                    style={[styles.postCardText, { color: C.text }]}
                    numberOfLines={2}
                  >
                    {post.content}
                  </Text>
                  <View style={styles.postCardMeta}>
                    <View style={styles.postMetaItem}>
                      <Feather name="heart" size={12} color="#EF4444" />
                      <Text
                        style={[styles.postMetaText, { color: C.textTertiary }]}
                      >
                        {post.likesCount}
                      </Text>
                    </View>
                    <View style={styles.postMetaItem}>
                      <Feather
                        name="message-circle"
                        size={12}
                        color={C.primary}
                      />
                      <Text
                        style={[styles.postMetaText, { color: C.textTertiary }]}
                      >
                        {post.commentsCount}
                      </Text>
                    </View>
                    <Text style={[styles.postDate, { color: C.textTertiary }]}>
                      {new Date(post.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {openedPost && (
        <PostActionsMenu
          post={{ id: openedPost.id, content: openedPost.content, hidden: openedPost.hidden }}
          visible={!!openMenuPostId}
          onClose={() => setOpenMenuPostId(null)}
          isDark={isDark}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Floating top bar over gradient
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
  topTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
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
  glassBtnDanger: {
    backgroundColor: "rgba(239,68,68,0.25)",
    borderColor: "rgba(255,255,255,0.1)",
  },

  // Cover gradient
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
  bannerBadgeWrap: {
    alignItems: "center",
    marginBottom: 12,
  },
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
  avatarPressable: { position: "relative", marginBottom: 16 },
  avatarRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
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
  avatarText: { color: "#fff", fontSize: 32, fontFamily: "Inter_700Bold" },
  cameraBtn: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
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

  // Floating buttons (overlap gradient bottom)
  heroActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    marginTop: -28,
    marginBottom: 24,
  },
  editProfileBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: "#5B4FE8",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  editProfileText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  shareBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#5B4FE8",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },

  // Bio + meta block
  bioBlock: { paddingHorizontal: 24, marginBottom: 20, alignItems: "center" },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 12,
  },
  bioAdd: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginBottom: 12,
    textAlign: "center",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    maxWidth: 140,
  },

  // Combined stats pill
  statsBlock: { paddingHorizontal: 24, marginBottom: 24 },
  statsPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.6,
  },
  statDivider: { width: 1, height: 32, alignSelf: "center" },

  // Sections
  section: { paddingHorizontal: 24, marginBottom: 24 },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },

  // Services
  servicesRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  svcPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  svcDot: { width: 8, height: 8, borderRadius: 4 },
  svcPillText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // Earnings Card
  earningsCard: { borderRadius: 24, padding: 20, overflow: "hidden" },
  earningsCircle: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  earningsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  earningsLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 4,
  },
  earningsAmount: {
    color: "#fff",
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  earningsTrendIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(52,211,153,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  allTimeBlock: {
    marginTop: 6,
    marginBottom: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  allTimeLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 4,
  },
  allTimeAmount: {
    color: "#34D399",
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  miniChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 44,
    gap: 4,
    marginBottom: 18,
  },
  miniChartBarWrap: { flex: 1, height: "100%", justifyContent: "flex-end" },
  miniChartBar: { borderRadius: 4, opacity: 0.8 },
  earningsFooter: { flexDirection: "row", alignItems: "center", gap: 4 },
  earningsStat: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  earningsStatLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  earningsFooterDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginHorizontal: 16,
  },
  exploreBtn: { marginLeft: "auto", borderRadius: 20, overflow: "hidden" },
  exploreBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  exploreBtnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },

  // Posts
  postsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  postCount: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  postCountText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  postCardMore: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 2,
  },
  postCardMoreInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyPosts: { borderRadius: 20, borderWidth: 0.5, overflow: "hidden" },
  emptyPostsInner: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyPostsText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  createPostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  createPostBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  postCard: {
    borderRadius: 20,
    borderWidth: 0.5,
    marginBottom: 12,
    overflow: "hidden",
  },
  postThumb: { width: "100%", height: 140 },
  postCardBody: { padding: 16 },
  postCardText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    marginBottom: 10,
  },
  postCardMeta: { flexDirection: "row", alignItems: "center", gap: 12 },
  postMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  postMetaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  postDate: {
    marginLeft: "auto",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },

  // Edit Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: "90%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#ccc",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  editLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  editInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  editInputText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  saveBtn: {},
  saveBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
