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
const GRID_GAP = 10;
const GRID_ITEM = (SW - 32 - GRID_GAP) / 2;

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatAmount(n: any): string {
  const num = typeof n === "string" ? parseFloat(n) : n || 0;
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-IN");
}

const BADGE_META: Record<string, { label: string; icon: string; color: string }> = {
  verified:        { label: "Verified",       icon: "check-circle", color: "#5B4FE8" },
  top_contributor: { label: "Top Contributor", icon: "star",         color: "#F59E0B" },
  campus_leader:   { label: "Campus Leader",   icon: "award",        color: "#8B5CF6" },
  expert:          { label: "Expert",          icon: "shield",       color: "#10B981" },
  ambassador:      { label: "Ambassador",      icon: "user-check",   color: "#3B82F6" },
  staff:           { label: "Staff",           icon: "briefcase",    color: "#EF4444" },
};

const SERVICE_META: Record<string, { label: string; icon: string; color: string }> = {
  assignments: { label: "Assignments", icon: "file-text", color: "#5B4FE8" },
  coaching:    { label: "Coaching",    icon: "users",     color: "#10B981" },
  deliveries:  { label: "Deliveries",  icon: "truck",     color: "#F59E0B" },
  tasks:       { label: "Tasks",       icon: "clipboard", color: "#EF4444" },
};

function EditField({ label, value, onChange, placeholder, multiline = false, C }: any) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.editLabel, { color: C.textSecondary }]}>{label}</Text>
      <View style={[styles.editInput, { backgroundColor: C.backgroundSecondary, borderColor: C.border }, multiline && { minHeight: 80 }]}>
        <TextInput
          style={[styles.editInputText, { color: C.text }, multiline && { textAlignVertical: "top" }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={C.textTertiary}
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
      if (!res.ok) return { today: 0, total: 0, orders: 0 };
      return res.json();
    },
    enabled: user?.role === "provider",
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
      showToast("Profile updated!", "success");
    },
    onError: (err: any) => showToast(err.message || "Failed to update profile", "error"),
  });

  const handleLogout = async () => {
    await logout();
    queryClient.clear();
    router.replace("/(auth)/login");
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
        const avatarData = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
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
  const badge = user.verificationBadge ? BADGE_META[user.verificationBadge] : null;
  const roleColors: Record<string, string> = {
    student: "#5B4FE8", provider: "#10B981", admin: "#EF4444", super_admin: "#8B5CF6",
  };
  const roleColor = roleColors[user.role] || "#5B4FE8";

  let svcs: string[] = [];
  try { svcs = JSON.parse(user.services || "[]"); } catch {}

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: isWeb ? 120 : 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Header ─────────────────────────────────────────────────── */}
        <LinearGradient
          colors={["#5B4FE8", "#7B73F0", "#9F98F4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: isWeb ? 56 : insets.top + 16 }]}
        >
          {/* Decorative circles */}
          <View style={[styles.heroCircle, { top: -50, right: -30, width: 180, height: 180, borderRadius: 90 }]} />
          <View style={[styles.heroCircle, { bottom: -40, left: -20, width: 120, height: 120, borderRadius: 60 }]} />

          {/* Top row: logout left, settings right */}
          <View style={styles.heroTopRow}>
            <TouchableOpacity style={styles.heroIconBtn} onPress={handleLogout}>
              <Feather name="log-out" size={16} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
            {badge && (
              <View style={styles.heroBadge}>
                <Feather name={badge.icon as any} size={11} color="#fff" />
                <Text style={styles.heroBadgeText}>{badge.label}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.heroIconBtn} onPress={() => {}}>
              <Feather name="share-2" size={16} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          </View>

          {/* Centered avatar */}
          <View style={styles.heroCenterBlock}>
            <Pressable style={styles.avatarWrap} onPress={pickAvatar}>
              <View style={styles.avatarRing}>
                {user.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
                  </View>
                )}
              </View>
              <View style={styles.cameraBtn}>
                <Feather name="camera" size={11} color="#fff" />
              </View>
            </Pressable>

            <Text style={styles.heroName}>{user.name}</Text>

            <View style={styles.heroSubRow}>
              {user.verified && (
                <View style={styles.verifiedDot}>
                  <Feather name="check" size={10} color="#fff" />
                </View>
              )}
              <View style={[styles.rolePill, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <View style={[styles.roleDot, { backgroundColor: roleColor === "#5B4FE8" ? "#fff" : roleColor }]} />
                <Text style={styles.rolePillText}>{user.role}</Text>
              </View>
            </View>

            {(user.college || user.program) && (
              <View style={styles.heroMetaRow}>
                {user.college && (
                  <View style={styles.heroMetaChip}>
                    <Feather name="map-pin" size={11} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.heroMetaText}>{user.college}</Text>
                  </View>
                )}
                {user.program && (
                  <View style={styles.heroMetaChip}>
                    <Feather name="book-open" size={11} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.heroMetaText}>{user.program}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </LinearGradient>

        {/* ── Stats strip ─────────────────────────────────────────────────── */}
        <View style={[styles.statsStrip, { backgroundColor: C.surface, borderColor: C.border }]}>
          {[
            { value: user.postsCount ?? 0,     label: "Posts"     },
            { value: user.followersCount ?? 0,  label: "Followers" },
            { value: user.followingCount ?? 0,  label: "Following" },
          ].map((stat, i) => (
            <React.Fragment key={stat.label}>
              {i > 0 && <View style={[styles.statDivider, { backgroundColor: C.border }]} />}
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: C.text }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: C.textSecondary }]}>{stat.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* ── Bio + Edit button ────────────────────────────────────────────── */}
        <View style={[styles.bioBlock, { borderColor: C.border }]}>
          {user.bio ? (
            <Text style={[styles.bioText, { color: C.text }]}>{user.bio}</Text>
          ) : (
            <Pressable onPress={() => { setName(user.name); setBio(user.bio || ""); setCollege(user.college || ""); setProgram(user.program || ""); setEditing(true); }}>
              <Text style={[styles.bioAdd, { color: C.primary }]}>+ Add a bio to tell your story</Text>
            </Pressable>
          )}
          <TouchableOpacity
            style={[styles.editBtn, { borderColor: C.primary }]}
            onPress={() => { setName(user.name); setBio(user.bio || ""); setCollege(user.college || ""); setProgram(user.program || ""); setEditing(true); }}
            activeOpacity={0.8}
          >
            <Feather name="edit-2" size={14} color={C.primary} />
            <Text style={[styles.editBtnText, { color: C.primary }]}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* ── Services (provider) ──────────────────────────────────────────── */}
        {svcs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>SERVICES OFFERED</Text>
            <View style={styles.servicesRow}>
              {svcs.map((svc) => {
                const meta = SERVICE_META[svc] || { label: svc, icon: "star", color: C.primary };
                return (
                  <View key={svc} style={[styles.svcChip, { backgroundColor: meta.color + "15", borderColor: meta.color + "30" }]}>
                    <Feather name={meta.icon as any} size={13} color={meta.color} />
                    <Text style={[styles.svcChipText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Earnings card (provider) ─────────────────────────────────────── */}
        {user.role === "provider" && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>EARNINGS</Text>
            <LinearGradient colors={["#0F0C29", "#302B63", "#24243E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.earningsCard}>
              <View style={[styles.earningsCircle, { top: -30, right: -30 }]} />
              <View style={[styles.earningsCircle, { bottom: -50, left: -20, width: 120, height: 120, borderRadius: 60 }]} />
              <View style={styles.earningsHeader}>
                <View>
                  <Text style={styles.earningsLabel}>Today's Earnings</Text>
                  {earningsQuery.isLoading ? (
                    <ActivityIndicator color="#fff" style={{ marginVertical: 6 }} />
                  ) : (
                    <Text style={styles.earningsAmount}>₹{formatAmount(earningsQuery.data?.today || 0)}</Text>
                  )}
                </View>
                <View style={styles.earningsTrendIcon}>
                  <Feather name="trending-up" size={20} color="#34D399" />
                </View>
              </View>
              <View style={styles.miniChart}>
                {[35, 60, 45, 80, 55, 70, 90].map((h, i) => (
                  <View key={i} style={styles.miniChartBarWrap}>
                    <LinearGradient colors={["#34D399", "#6EE7B7"]} style={[styles.miniChartBar, { height: `${h}%` as any }]} />
                  </View>
                ))}
              </View>
              <View style={styles.earningsFooter}>
                <View>
                  <Text style={styles.earningsStat}>₹{formatAmount(earningsQuery.data?.total || 0)}</Text>
                  <Text style={styles.earningsStatLabel}>Total Earned</Text>
                </View>
                <View style={styles.earningsFooterDivider} />
                <View>
                  <Text style={styles.earningsStat}>{earningsQuery.data?.orders || 0}</Text>
                  <Text style={styles.earningsStatLabel}>Orders Done</Text>
                </View>
                <TouchableOpacity style={styles.exploreBtn} activeOpacity={0.85}>
                  <LinearGradient colors={["#34D399", "#059669"]} style={styles.exploreBtnGradient}>
                    <Text style={styles.exploreBtnText}>Explore</Text>
                    <Feather name="arrow-right" size={14} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* ── Posts grid ──────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.postsSectionHeader}>
            <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>MY POSTS</Text>
            {posts.length > 0 && (
              <View style={[styles.postCount, { backgroundColor: C.primaryLight }]}>
                <Text style={[styles.postCountText, { color: C.primary }]}>{posts.length}</Text>
              </View>
            )}
          </View>

          {postsQuery.isLoading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} />
          ) : posts.length === 0 ? (
            <View style={[styles.emptyPosts, { backgroundColor: C.surface, borderColor: C.border }]}>
              <LinearGradient colors={[C.primaryLight, "transparent"]} style={styles.emptyPostsInner}>
                <Feather name="edit" size={36} color={C.primary} style={{ opacity: 0.5 }} />
                <Text style={[styles.emptyPostsText, { color: C.text }]}>No posts yet</Text>
                <TouchableOpacity
                  style={[styles.createPostBtn, { backgroundColor: C.primary }]}
                  onPress={() => router.push("/new-post")}
                  activeOpacity={0.85}
                >
                  <Feather name="plus" size={14} color="#fff" />
                  <Text style={styles.createPostBtnText}>Create First Post</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.grid}>
              {posts.map((post: any, index: number) => (
                <TouchableOpacity
                  key={post.id}
                  style={[styles.gridCard, { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={() => router.push(`/post/${post.id}`)}
                  activeOpacity={0.8}
                >
                  {post.mediaUrls?.length > 0 ? (
                    <Image source={{ uri: post.mediaUrls[0] }} style={styles.gridThumb} resizeMode="cover" />
                  ) : (
                    <LinearGradient
                      colors={index % 2 === 0 ? ["#EEF2FF", "#E0E7FF"] : ["#FAF8F4", "#F0EDEA"]}
                      style={styles.gridThumbPlaceholder}
                    >
                      <Feather name="file-text" size={22} color="#5B4FE8" style={{ opacity: 0.4 }} />
                    </LinearGradient>
                  )}
                  <View style={styles.gridCardBody}>
                    <Text style={[styles.gridCardText, { color: C.text }]} numberOfLines={2}>
                      {post.content}
                    </Text>
                    <View style={styles.gridCardMeta}>
                      <Feather name="heart" size={11} color="#EF4444" />
                      <Text style={[styles.gridMetaText, { color: C.textTertiary }]}>{post.likesCount}</Text>
                      <Feather name="message-circle" size={11} color={C.textTertiary} style={{ marginLeft: 6 }} />
                      <Text style={[styles.gridMetaText, { color: C.textTertiary }]}>{post.commentsCount}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Edit Profile Modal ───────────────────────────────────────────── */}
      <Modal visible={editing} animationType="slide" transparent onRequestClose={() => setEditing(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditing(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: C.surface }]} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <ScrollView>
              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalTitle, { color: C.text }]}>Edit Profile</Text>
                <TouchableOpacity onPress={() => setEditing(false)}>
                  <Feather name="x" size={22} color={C.textSecondary} />
                </TouchableOpacity>
              </View>
              <EditField label="Full Name" value={name} onChange={setName} placeholder="Your full name" C={C} />
              <EditField label="Bio" value={bio} onChange={setBio} placeholder="Tell your campus story..." multiline C={C} />
              <EditField label="College" value={college} onChange={setCollege} placeholder="Your college name" C={C} />
              <EditField label="Program / Branch" value={program} onChange={setProgram} placeholder="e.g. BCA, BTech CSE" C={C} />
              <TouchableOpacity
                style={[styles.saveBtn, { opacity: updateMutation.isPending ? 0.7 : 1, borderRadius: 16, overflow: "hidden" }]}
                onPress={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                activeOpacity={0.85}
              >
                <LinearGradient colors={["#5B4FE8", "#7B73F0"]} style={styles.saveBtnGradient}>
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

  // Hero
  hero: { paddingHorizontal: 20, paddingBottom: 28, overflow: "hidden" },
  heroCircle: { position: "absolute", backgroundColor: "rgba(255,255,255,0.08)" },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  heroIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  heroBadgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  heroCenterBlock: { alignItems: "center", gap: 8 },
  avatarWrap: { position: "relative", marginBottom: 4 },
  avatarRing: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, borderColor: "rgba(255,255,255,0.5)",
    overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%", borderRadius: 48 },
  avatarFallback: { backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 32, fontFamily: "Inter_700Bold" },
  cameraBtn: {
    position: "absolute", bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "#5B4FE8",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#fff",
  },
  heroName: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  heroSubRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  verifiedDot: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  rolePill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  roleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  rolePillText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  heroMetaRow: { flexDirection: "row", gap: 12, flexWrap: "wrap", justifyContent: "center" },
  heroMetaChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroMetaText: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontFamily: "Inter_400Regular" },

  // Stats strip
  statsStrip: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginTop: -1,
    borderRadius: 20, borderWidth: 0.5,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 16 },
  statDivider: { width: 0.5, height: 36 },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },

  // Bio + Edit
  bioBlock: { marginHorizontal: 16, marginTop: 14, paddingTop: 14, borderTopWidth: 0.5, gap: 12 },
  bioText: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular" },
  bioAdd: { fontSize: 14, fontFamily: "Inter_500Medium" },
  editBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    borderWidth: 1.5, borderRadius: 14, paddingVertical: 11,
  },
  editBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Shared section
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 10 },

  // Services
  servicesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  svcChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  svcChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // Earnings
  earningsCard: { borderRadius: 24, padding: 20, overflow: "hidden" },
  earningsCircle: { position: "absolute", width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.05)" },
  earningsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  earningsLabel: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 4 },
  earningsAmount: { color: "#fff", fontSize: 34, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  earningsTrendIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(52,211,153,0.2)", alignItems: "center", justifyContent: "center" },
  miniChart: { flexDirection: "row", alignItems: "flex-end", height: 44, gap: 4, marginBottom: 18 },
  miniChartBarWrap: { flex: 1, height: "100%", justifyContent: "flex-end" },
  miniChartBar: { borderRadius: 4, opacity: 0.8 },
  earningsFooter: { flexDirection: "row", alignItems: "center", gap: 4 },
  earningsStat: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  earningsStatLabel: { color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "Inter_400Regular" },
  earningsFooterDivider: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.15)", marginHorizontal: 16 },
  exploreBtn: { marginLeft: "auto", borderRadius: 20, overflow: "hidden" },
  exploreBtnGradient: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
  exploreBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // Posts grid
  postsSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  postCount: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  postCountText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  emptyPosts: { borderRadius: 20, borderWidth: 0.5, overflow: "hidden", marginTop: 8 },
  emptyPostsInner: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyPostsText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  createPostBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  createPostBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP, marginTop: 8 },
  gridCard: { width: GRID_ITEM, borderRadius: 16, borderWidth: 0.5, overflow: "hidden" },
  gridThumb: { width: "100%", height: GRID_ITEM * 0.75 },
  gridThumbPlaceholder: { width: "100%", height: GRID_ITEM * 0.75, alignItems: "center", justifyContent: "center" },
  gridCardBody: { padding: 10 },
  gridCardText: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", marginBottom: 7 },
  gridCardMeta: { flexDirection: "row", alignItems: "center" },
  gridMetaText: { fontSize: 11, fontFamily: "Inter_400Regular", marginLeft: 3 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: "90%" },
  modalHandle: { width: 40, height: 4, backgroundColor: "#ccc", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  editLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  editInput: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  editInputText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  saveBtn: {},
  saveBtnGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 16 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
