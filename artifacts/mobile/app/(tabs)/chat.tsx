import React, { useState, useRef } from "react";
import {
  View, Text, FlatList, Pressable, StyleSheet,
  useColorScheme, Platform, TextInput,
  TouchableOpacity, Animated,
} from "react-native";
import { Image } from "expo-image";
import { PLACEHOLDER_BLURHASH } from "@/constants/imagePlaceholder";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { RetryableError } from "@/components/RetryableError";

const isWeb = Platform.OS === "web";

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  return `${d}d`;
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_GRADIENTS = [
  ["#667eea", "#764ba2"], ["#f093fb", "#f5576c"], ["#4facfe", "#00f2fe"],
  ["#43e97b", "#38f9d7"], ["#fa709a", "#fee140"], ["#a18cd1", "#fbc2eb"],
];

function getGradient(name: string) {
  let hash = 0;
  for (let c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function GradientAvatar({ name, avatar, size = 50, online = false }: any) {
  const grad = getGradient(name || "?");
  return (
    <View>
      {avatar
        ? <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" cachePolicy="disk" placeholder={PLACEHOLDER_BLURHASH} transition={200} />
        : (
          <LinearGradient colors={grad as any} style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: size * 0.36 }}>{getInitials(name || "?")}</Text>
          </LinearGradient>
        )
      }
      {online && (
        <View style={{ position: "absolute", bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: "#10B981", borderWidth: 2, borderColor: "#fff" }} />
      )}
    </View>
  );
}

function SkeletonConversationRow({ C, isDark }: any) {
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
    <Animated.View style={{ opacity, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: C.borderLight }}>
      <View style={[{ width: 52, height: 52, borderRadius: 26 }, bg]} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={[{ height: 12, width: "45%", borderRadius: 6 }, bg]} />
        <View style={[{ height: 10, width: "68%", borderRadius: 5 }, bg]} />
      </View>
      <View style={[{ height: 10, width: 28, borderRadius: 5 }, bg]} />
    </Animated.View>
  );
}

const ROOM_COLORS: Record<string, [string, string]> = {
  tech: ["#5B4FE8", "#7B73F0"],
  marketplace: ["#10B981", "#34D399"],
  program: ["#F59E0B", "#FBBF24"],
  general: ["#F97316", "#FB923C"],
  career: ["#06B6D4", "#22D3EE"],
  social: ["#EC4899", "#F472B6"],
};

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { apiRequest, user } = useAuth();
  const [mode, setMode] = useState<"dms" | "rooms">("dms");
  const [search, setSearch] = useState("");
  const tabAnim = useRef(new Animated.Value(0)).current;
  const [hasLoaded, setHasLoaded] = useState(false);

  useFocusEffect(React.useCallback(() => { setHasLoaded(true); }, []));

  const conversationsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await apiRequest("/chat/conversations");
      return res.json() as Promise<{ conversations: any[] }>;
    },
    enabled: hasLoaded && mode === "dms",
  });

  const chatroomsQuery = useQuery({
    queryKey: ["chatrooms"],
    queryFn: async () => {
      const res = await apiRequest("/chat/chatrooms");
      return res.json() as Promise<{ chatrooms: any[] }>;
    },
    enabled: hasLoaded && mode === "rooms",
  });

  const switchMode = (m: "dms" | "rooms") => {
    Animated.spring(tabAnim, {
      toValue: m === "dms" ? 0 : 1,
      useNativeDriver: false,
    }).start();
    setMode(m);
  };

  const isLoading = mode === "dms" ? conversationsQuery.isLoading : chatroomsQuery.isLoading;
  const isError = mode === "dms" ? conversationsQuery.isError : chatroomsQuery.isError;
  const refetchCurrent = mode === "dms" ? conversationsQuery.refetch : chatroomsQuery.refetch;
  const conversations = (conversationsQuery.data?.conversations || []).filter((c: any) => {
    if (!search) return true;
    const other = c.participants?.find((p: any) => p?.id !== user?.id);
    return other?.name?.toLowerCase().includes(search.toLowerCase());
  });
  const chatrooms = (chatroomsQuery.data?.chatrooms || []).filter((r: any) =>
    !search || r.name?.toLowerCase().includes(search.toLowerCase())
  );

  const tabIndicatorLeft = tabAnim.interpolate({ inputRange: [0, 1], outputRange: ["1%", "51%"] });

  const renderConversation = ({ item }: any) => {
    const other = item.participants?.find((p: any) => p?.id !== user?.id);
    if (!other) return null;
    const isOnline = Math.random() > 0.6; // Simulated online state
    return (
      <TouchableOpacity
        style={[styles.convRow, { borderBottomColor: C.borderLight }]}
        onPress={() => router.push(`/chat/${item.id}`)}
        activeOpacity={0.7}
      >
        <GradientAvatar name={other.name} avatar={other.avatar} size={52} online={isOnline} />
        <View style={styles.convContent}>
          <View style={styles.convTop}>
            <Text style={[styles.convName, { color: C.text }]} numberOfLines={1}>{other.name}</Text>
            <Text style={[styles.convTime, { color: item.unreadCount > 0 ? C.primary : C.textTertiary }]}>
              {item.lastMessage ? timeAgo(item.lastMessage.createdAt) : ""}
            </Text>
          </View>
          <View style={styles.convBottom}>
            <Text style={[styles.convPreview, { color: item.unreadCount > 0 ? C.text : C.textSecondary, fontFamily: item.unreadCount > 0 ? "Inter_500Medium" : "Inter_400Regular" }]} numberOfLines={1}>
              {item.lastMessage?.content || "No messages yet"}
            </Text>
            {item.unreadCount > 0 && (
              <LinearGradient colors={["#5B4FE8", "#7B73F0"]} style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount > 9 ? "9+" : item.unreadCount}</Text>
              </LinearGradient>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderChatroom = ({ item }: any) => {
    const [c1, c2] = ROOM_COLORS[item.category] || ["#5B4FE8", "#7B73F0"];
    const initial = (item.name || "#").replace("#", "").slice(0, 2).toUpperCase();
    return (
      <TouchableOpacity
        style={[styles.roomCard, { backgroundColor: C.surface, borderColor: C.border }]}
        onPress={() => router.push(`/chatroom/${item.id}`)}
        activeOpacity={0.8}
      >
        <LinearGradient colors={[c1, c2]} style={styles.roomIcon}>
          <Text style={styles.roomIconText}>#</Text>
        </LinearGradient>
        <View style={styles.roomInfo}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <Text style={[styles.roomName, { color: C.text }]}>{item.name}</Text>
            <View style={[styles.roomCategoryTag, { backgroundColor: c1 + "22" }]}>
              <Text style={[styles.roomCategoryText, { color: c1 }]}>{item.category}</Text>
            </View>
          </View>
          <Text style={[styles.roomDesc, { color: C.textSecondary }]} numberOfLines={1}>
            {item.description || item.lastMessage?.content || "No messages yet"}
          </Text>
          <View style={styles.roomMeta}>
            <Feather name="users" size={11} color={C.textTertiary} />
            <Text style={[styles.roomMetaText, { color: C.textTertiary }]}>{item.memberCount} members</Text>
            <View style={[styles.liveDot, { backgroundColor: "#10B981" }]} />
            <Text style={[styles.roomMetaText, { color: "#10B981" }]}>active</Text>
          </View>
        </View>
        <Feather name="chevron-right" size={18} color={C.textTertiary} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 10, backgroundColor: C.background, borderBottomColor: C.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: C.text }]}>Messages</Text>
          <Text style={[styles.headerSub, { color: C.textSecondary }]}>
            {mode === "dms" ? `${conversations.length} conversations` : `${chatrooms.length} chatrooms`}
          </Text>
        </View>
        <TouchableOpacity style={[styles.composeBtn, { backgroundColor: C.primaryLight, borderColor: C.primary + "44" }]} activeOpacity={0.8}>
          <Feather name="edit-2" size={18} color={C.primary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
        <Feather name="search" size={16} color={C.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: C.text }]}
          placeholder="Search messages..."
          placeholderTextColor={C.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Feather name="x-circle" size={16} color={C.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Mode toggle */}
      <View style={[styles.tabContainer, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
        <Animated.View style={[styles.tabIndicator, { left: tabIndicatorLeft, backgroundColor: C.surface }]} />
        <TouchableOpacity style={styles.tabBtn} onPress={() => switchMode("dms")}>
          <Feather name="message-circle" size={15} color={mode === "dms" ? C.primary : C.textTertiary} />
          <Text style={[styles.tabBtnText, { color: mode === "dms" ? C.primary : C.textTertiary }]}>Direct</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabBtn} onPress={() => switchMode("rooms")}>
          <Feather name="hash" size={15} color={mode === "rooms" ? C.primary : C.textTertiary} />
          <Text style={[styles.tabBtnText, { color: mode === "rooms" ? C.primary : C.textTertiary }]}>Chatrooms</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <SkeletonConversationRow key={i} C={C} isDark={colorScheme === "dark"} />
          ))}
        </View>
      ) : isError ? (
        <RetryableError onRetry={refetchCurrent} />
      ) : mode === "dms" ? (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: isWeb ? 120 : 110 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <LinearGradient colors={[C.primaryLight, C.background]} style={styles.emptyInner}>
                <Feather name="message-circle" size={52} color={C.primary} style={{ opacity: 0.6 }} />
                <Text style={[styles.emptyTitle, { color: C.text }]}>No conversations yet</Text>
                <Text style={[styles.emptyText, { color: C.textSecondary }]}>Visit a profile to start chatting</Text>
              </LinearGradient>
            </View>
          }
        />
      ) : (
        <FlatList
          data={chatrooms}
          renderItem={renderChatroom}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 14, paddingBottom: isWeb ? 120 : 110, gap: 10 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>DISCOVER COMMUNITIES</Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <LinearGradient colors={[C.primaryLight, C.background]} style={styles.emptyInner}>
                <Feather name="hash" size={52} color={C.primary} style={{ opacity: 0.6 }} />
                <Text style={[styles.emptyTitle, { color: C.text }]}>No chatrooms yet</Text>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  composeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 0.5 },
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    margin: 12, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, borderWidth: 0.5,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  tabContainer: {
    flexDirection: "row", marginHorizontal: 12, marginBottom: 8,
    borderRadius: 14, borderWidth: 0.5, padding: 4, position: "relative",
  },
  tabIndicator: {
    position: "absolute", top: 4, bottom: 4, width: "48%", borderRadius: 10,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: 10 },
  tabBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  convRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  convContent: { flex: 1 },
  convTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  convName: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  convTime: { fontSize: 11, fontFamily: "Inter_500Medium" },
  convBottom: { flexDirection: "row", alignItems: "center", gap: 8 },
  convPreview: { fontSize: 13, flex: 1 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  unreadText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  roomCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, borderWidth: 0.5, padding: 14 },
  roomIcon: { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  roomIconText: { fontSize: 20, color: "#fff", fontFamily: "Inter_700Bold" },
  roomInfo: { flex: 1 },
  roomName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  roomCategoryTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  roomCategoryText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  roomDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 5 },
  roomMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  roomMetaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  liveDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 6 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 10 },
  emptyState: { margin: 16, borderRadius: 20, overflow: "hidden" },
  emptyInner: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 24, gap: 10, borderRadius: 20 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
