import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

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

function StatCard({ value, label, icon, color, C }: any) {
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: C.surface, borderColor: C.border },
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: color + "18" }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.statValue, { color: C.text }]}>{value ?? 0}</Text>
      <Text style={[styles.statLabel, { color: C.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

function EditField({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  keyboardType = "default",
  C,
}: any) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.editLabel, { color: C.textSecondary }]}>
        {label}
      </Text>
      <View
        style={[
          styles.editInput,
          { backgroundColor: C.backgroundSecondary, borderColor: C.border },
          multiline && { minHeight: 80 },
        ]}
      >
        <TextInput
          style={[
            styles.editInputText,
            { color: C.text },
            multiline && { textAlignVertical: "top" },
          ]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={C.textTertiary}
          keyboardType={keyboardType}
          multiline={multiline}
        />
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { user, apiRequest, updateUser, logout } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [college, setCollege] = useState(user?.college || "");
  const [program, setProgram] = useState(user?.program || "");
  const [phone, setPhone] = useState(user?.phone || "");

  const postsQuery = useQuery({
    queryKey: ["userPosts", user?.id],
    queryFn: async () => {
      const res = await apiRequest(`/users/${user?.id}/posts`);
      return res.json() as Promise<{ posts: any[] }>;
    },
    enabled: !!user?.id,
  });

  const earningsQuery = useQuery({
    queryKey: ["earnings"],
    queryFn: async () => {
      const res = await apiRequest("/services/my-earnings");
      if (!res.ok) return { today: 0, yesterday: 0, thisWeek: 0, allTime: 0, total: 0, orders: 0, history: [] };
      return res.json();
    },
    enabled: user?.role === "provider",
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/users/me/profile", {
        method: "PUT",
        body: JSON.stringify({ name, bio, college, program, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      return data;
    },
    onSuccess: (data) => {
      updateUser(data);
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["userPosts"] });
      showToast("Profile updated!", "success");
    },
    onError: (err: any) =>
      showToast(err.message || "Failed to update profile", "error"),
  });

  const handleLogout = async () => {
    await logout();
    queryClient.clear();
    router.replace("/(auth)/login");
  };

  const testPushMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/notifications/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Test failed");
      return data as {
        userId: string;
        firebaseConfigured: boolean;
        tokenCount: number;
        results: Array<{ ok?: boolean; type: string; errorCode?: string; errorMessage?: string }>;
      };
    },
    onSuccess: (data) => {
      if (!data.firebaseConfigured) {
        showToast("Push not configured on server", "error");
        return;
      }
      if (data.tokenCount === 0) {
        showToast("No device registered for this account. Reopen the app and grant notifications.", "error");
        return;
      }
      const fcmResults = data.results.filter((r) => r.type === "fcm");
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

  if (!user) return null;

  const posts = postsQuery.data?.posts || [];
  const badge = user.verificationBadge
    ? BADGE_META[user.verificationBadge]
    : null;
  const roleColors: Record<string, string> = {
    student: C.primary,
    provider: "#10B981",
    admin: "#EF4444",
    super_admin: "#8B5CF6",
  };
  const roleColor = roleColors[user.role] || C.primary;

  let svcs: string[] = [];
  try {
    svcs = JSON.parse(user.services || "[]");
  } catch {}

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Top bar */}
      <View
        style={[styles.topBar, { paddingTop: isWeb ? 67 : insets.top + 10 }]}
      >
        <Pressable
          style={[
            styles.topBtn,
            { backgroundColor: C.backgroundSecondary, borderColor: C.border },
          ]}
          onPress={() => {
            setName(user.name);
            setBio(user.bio || "");
            setCollege(user.college || "");
            setProgram(user.program || "");
            setPhone(user.phone || "");
            setEditing(true);
          }}
        >
          <Feather name="edit-2" size={16} color={C.text} />
        </Pressable>
        <Text style={[styles.topTitle, { color: C.text }]}>Profile</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            style={[
              styles.topBtn,
              { backgroundColor: C.backgroundSecondary, borderColor: C.border },
            ]}
            onPress={() => testPushMutation.mutate()}
            disabled={testPushMutation.isPending}
          >
            {testPushMutation.isPending ? (
              <ActivityIndicator size="small" color={C.text} />
            ) : (
              <Feather name="bell" size={16} color={C.text} />
            )}
          </Pressable>
          <Pressable
            style={[
              styles.topBtn,
              { backgroundColor: C.errorLight, borderColor: C.error + "33" },
            ]}
            onPress={handleLogout}
          >
            <Feather name="log-out" size={16} color={C.error} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: isWeb ? 120 : 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover Banner */}
        <LinearGradient
          colors={["#292524", "#57534E", "#A8A29E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <View style={[styles.bannerCircle, { top: -40, right: -20 }]} />
          <View
            style={[
              styles.bannerCircle,
              {
                bottom: -60,
                left: -30,
                width: 160,
                height: 160,
                borderRadius: 80,
              },
            ]}
          />
          {badge && (
            <View
              style={[
                styles.bannerBadge,
                { backgroundColor: "rgba(255,255,255,0.2)" },
              ]}
            >
              <Feather name={badge.icon as any} size={12} color="#fff" />
              <Text style={styles.bannerBadgeText}>{badge.label}</Text>
            </View>
          )}
        </LinearGradient>

        {/* Avatar + Info */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarRow}>
            {/* Avatar */}
            <Pressable style={styles.avatarWrap} onPress={pickAvatar}>
              <LinearGradient
                colors={["#5B4FE8", "#7B73F0"]}
                style={styles.avatarRing}
              >
                <View
                  style={[
                    styles.avatarInner,
                    { backgroundColor: C.background },
                  ]}
                >
                  {user.avatar ? (
                    <Image
                      source={{ uri: user.avatar }}
                      style={styles.avatar}
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
              </LinearGradient>
              <View style={[styles.cameraBtn, { backgroundColor: C.primary }]}>
                <Feather name="camera" size={12} color="#fff" />
              </View>
            </Pressable>

            {/* Quick actions */}
            <View style={styles.profileActions}>
              <TouchableOpacity
                style={[
                  styles.editProfileBtn,
                  { borderColor: C.border, backgroundColor: C.surface },
                ]}
                onPress={() => {
                  setName(user.name);
                  setBio(user.bio || "");
                  setCollege(user.college || "");
                  setProgram(user.program || "");
                  setPhone(user.phone || "");
                  setEditing(true);
                }}
              >
                <Text style={[styles.editProfileText, { color: C.text }]}>
                  Edit Profile
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.shareBtn,
                  { backgroundColor: C.backgroundSecondary },
                ]}
              >
                <Feather name="share-2" size={16} color={C.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Name + role */}
          <View style={styles.nameBlock}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <Text style={[styles.userName, { color: C.text }]}>
                {user.name}
              </Text>
              {user.verified && (
                <LinearGradient
                  colors={["#5B4FE8", "#7B73F0"]}
                  style={styles.verifiedBadge}
                >
                  <Feather name="check" size={11} color="#fff" />
                </LinearGradient>
              )}
              <View
                style={[styles.rolePill, { backgroundColor: roleColor + "18" }]}
              >
                <View
                  style={[styles.roleDot, { backgroundColor: roleColor }]}
                />
                <Text style={[styles.roleText, { color: roleColor }]}>
                  {user.role}
                </Text>
              </View>
            </View>
            <Text style={[styles.userEmail, { color: C.textSecondary }]}>
              {user.email}
            </Text>
            {user.bio ? (
              <Text style={[styles.userBio, { color: C.text }]}>
                {user.bio}
              </Text>
            ) : (
              <Pressable onPress={() => { setName(user.name); setBio(user.bio || ""); setCollege(user.college || ""); setProgram(user.program || ""); setPhone(user.phone || ""); setEditing(true); }}>
                <Text style={[styles.addBio, { color: C.primary }]}>
                  + Add a bio to tell your story
                </Text>
              </Pressable>
            )}
            {/* College / Program */}
            <View style={styles.metaRow}>
              {user.college && (
                <View style={styles.metaChip}>
                  <Feather name="map-pin" size={12} color={C.textTertiary} />
                  <Text
                    style={[styles.metaChipText, { color: C.textSecondary }]}
                  >
                    {user.college}
                  </Text>
                </View>
              )}
              {user.program && (
                <View style={styles.metaChip}>
                  <Feather name="book-open" size={12} color={C.textTertiary} />
                  <Text
                    style={[styles.metaChipText, { color: C.textSecondary }]}
                  >
                    {user.program}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard
            value={user.postsCount}
            label="Posts"
            icon="file-text"
            color="#5B4FE8"
            C={C}
          />
          <StatCard
            value={user.followersCount}
            label="Followers"
            icon="users"
            color="#10B981"
            C={C}
          />
          <StatCard
            value={user.followingCount}
            label="Following"
            icon="user-plus"
            color="#F59E0B"
            C={C}
          />
        </View>

        {/* Services offered (provider) */}
        {svcs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>
              SERVICES OFFERED
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
                      styles.svcChip,
                      {
                        backgroundColor: meta.color + "15",
                        borderColor: meta.color + "30",
                      },
                    ]}
                  >
                    <Feather
                      name={meta.icon as any}
                      size={13}
                      color={meta.color}
                    />
                    <Text style={[styles.svcChipText, { color: meta.color }]}>
                      {meta.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Earnings Card (provider only) */}
        {user.role === "provider" && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>
              EARNINGS
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
                  <ActivityIndicator color="#fff" style={{ marginVertical: 4, alignSelf: "flex-start" }} />
                ) : (
                  <Text style={styles.allTimeAmount}>
                    ₹{formatAmount(earningsQuery.data?.allTime ?? earningsQuery.data?.total ?? 0)}
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
          <View style={styles.postsSectionHeader}>
            <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>
              MY POSTS
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
                ]}
                onPress={() => router.push(`/post/${post.id}`)}
                activeOpacity={0.8}
              >
                {post.mediaUrls?.length > 0 && (
                  <Image
                    source={{ uri: post.mediaUrls[0] }}
                    style={styles.postThumb}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.postCardBody}>
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

      {/* Edit Profile Modal */}
      <Modal
        visible={editing}
        animationType="slide"
        transparent
        onRequestClose={() => setEditing(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setEditing(false)}
        >
          <Pressable
            style={[styles.modalSheet, { backgroundColor: C.surface }]}
            onPress={() => {}}
          >
            <View style={styles.modalHandle} />
            <ScrollView>
              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalTitle, { color: C.text }]}>
                  Edit Profile
                </Text>
                <TouchableOpacity onPress={() => setEditing(false)}>
                  <Feather name="x" size={22} color={C.textSecondary} />
                </TouchableOpacity>
              </View>

              <EditField
                label="Full Name"
                value={name}
                onChange={setName}
                placeholder="Your full name"
                C={C}
              />
              <EditField
                label="Bio"
                value={bio}
                onChange={setBio}
                placeholder="Tell your campus story..."
                multiline
                C={C}
              />
              <EditField
                label="College"
                value={college}
                onChange={setCollege}
                placeholder="Your college name"
                C={C}
              />
              <EditField
                label="Program / Branch"
                value={program}
                onChange={setProgram}
                placeholder="e.g. BCA, BTech CSE"
                C={C}
              />
              <EditField
                label="Mobile Number"
                value={phone}
                onChange={setPhone}
                placeholder="e.g. +91 98765 43210"
                keyboardType="phone-pad"
                C={C}
              />

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  {
                    opacity: updateMutation.isPending ? 0.7 : 1,
                    borderRadius: 16,
                    overflow: "hidden",
                  },
                ]}
                onPress={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#5B4FE8", "#7B73F0"]}
                  style={styles.saveBtnGradient}
                >
                  {updateMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Feather name="check" size={18} color="#fff" />
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  topBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
  },
  banner: { height: 130, overflow: "hidden" },
  bannerCircle: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  bannerBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  bannerBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  profileHeader: { paddingHorizontal: 16, marginTop: -36, paddingBottom: 8 },
  avatarRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  avatarWrap: { position: "relative" },
  avatarRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 28, fontFamily: "Inter_700Bold" },
  cameraBtn: {
    position: "absolute",
    bottom: 2,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  profileActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 4,
  },
  editProfileBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  editProfileText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  nameBlock: { gap: 5 },
  userName: { fontSize: 22, fontFamily: "Inter_700Bold" },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  roleDot: { width: 6, height: 6, borderRadius: 3 },
  roleText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  userEmail: { fontSize: 13, fontFamily: "Inter_400Regular" },
  userBio: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
  addBio: { fontSize: 14, fontFamily: "Inter_500Medium" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaChipText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 0.5,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginBottom: 10,
  },
  servicesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  svcChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  svcChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
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
  postsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  postCount: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  postCountText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
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
    borderRadius: 16,
    borderWidth: 0.5,
    marginBottom: 10,
    overflow: "hidden",
  },
  postThumb: { width: "100%", height: 140 },
  postCardBody: { padding: 14 },
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
