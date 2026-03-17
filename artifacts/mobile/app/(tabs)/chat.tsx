import React, { useState } from "react";
import {
  View, Text, FlatList, Pressable, StyleSheet,
  useColorScheme, ActivityIndicator, Platform, Image,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function Avatar({ name, avatar, size = 48, color }: any) {
  if (avatar) return <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: size * 0.35 }}>{getInitials(name || "?")}</Text>
    </View>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { apiRequest, user } = useAuth();
  const [mode, setMode] = useState<"dms" | "rooms">("dms");
  const isWeb = Platform.OS === "web";

  const conversationsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await apiRequest("/chat/conversations");
      return res.json() as Promise<{ conversations: any[] }>;
    },
    enabled: mode === "dms",
  });

  const chatroomsQuery = useQuery({
    queryKey: ["chatrooms"],
    queryFn: async () => {
      const res = await apiRequest("/chat/chatrooms");
      return res.json() as Promise<{ chatrooms: any[] }>;
    },
    enabled: mode === "rooms",
  });

  const isLoading = mode === "dms" ? conversationsQuery.isLoading : chatroomsQuery.isLoading;
  const conversations = conversationsQuery.data?.conversations || [];
  const chatrooms = chatroomsQuery.data?.chatrooms || [];

  const categoryColors: Record<string, string> = {
    tech: C.primary, marketplace: C.success, program: C.info, general: C.orange, career: C.cyan,
  };

  const renderConversation = ({ item }: any) => {
    const other = item.participants.find((p: any) => p?.id !== user?.id);
    if (!other) return null;
    return (
      <Pressable
        style={[styles.convItem, { borderBottomColor: C.borderLight }]}
        onPress={() => router.push(`/chat/${item.id}`)}
      >
        <Avatar name={other.name} avatar={other.avatar} size={50} color={C.primary} />
        <View style={styles.convInfo}>
          <View style={styles.convTop}>
            <Text style={[styles.convName, { color: C.text, fontFamily: "Inter_600SemiBold" }]}>{other.name}</Text>
            {item.lastMessage && (
              <Text style={[styles.convTime, { color: C.textTertiary, fontFamily: "Inter_400Regular" }]}>
                {timeAgo(item.lastMessage.createdAt)}
              </Text>
            )}
          </View>
          <Text style={[styles.convPreview, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
            {item.lastMessage?.content || "No messages yet"}
          </Text>
        </View>
        {item.unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: C.primary }]}>
            <Text style={styles.badgeText}>{item.unreadCount}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  const renderChatroom = ({ item }: any) => {
    const color = categoryColors[item.category] || C.primary;
    return (
      <Pressable
        style={[styles.chatroomItem, { backgroundColor: C.surface, borderColor: C.border }]}
        onPress={() => router.push(`/chatroom/${item.id}`)}
      >
        <View style={[styles.chatroomIcon, { backgroundColor: color + "20" }]}>
          <Text style={[styles.chatroomIconText, { color, fontFamily: "Inter_700Bold" }]}>
            {item.name.startsWith("#") ? item.name.slice(1, 2).toUpperCase() : item.name[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.chatroomInfo}>
          <Text style={[styles.chatroomName, { color: C.text, fontFamily: "Inter_600SemiBold" }]}>{item.name}</Text>
          <Text style={[styles.chatroomDesc, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
            {item.description || item.lastMessage?.content || "No messages yet"}
          </Text>
          <View style={styles.chatroomMeta}>
            <Feather name="users" size={11} color={C.textTertiary} />
            <Text style={[styles.chatroomMetaText, { color: C.textTertiary, fontFamily: "Inter_400Regular" }]}>
              {item.memberCount} members
            </Text>
          </View>
        </View>
        <View style={[styles.categoryTag, { backgroundColor: color + "20" }]}>
          <Text style={[styles.categoryTagText, { color, fontFamily: "Inter_500Medium" }]}>{item.category}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 8, backgroundColor: C.background, borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: C.text, fontFamily: "Inter_700Bold" }]}>Messages</Text>
        <Pressable style={[styles.composeBtn, { backgroundColor: C.primaryLight }]}>
          <Feather name="edit-2" size={18} color={C.primary} />
        </Pressable>
      </View>

      {/* Mode Toggle */}
      <View style={[styles.modeToggle, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
        <Pressable
          style={[styles.modeBtn, mode === "dms" && { backgroundColor: C.surface, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }]}
          onPress={() => setMode("dms")}
        >
          <Text style={[styles.modeBtnText, { color: mode === "dms" ? C.text : C.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            Direct
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeBtn, mode === "rooms" && { backgroundColor: C.surface, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }]}
          onPress={() => setMode("rooms")}
        >
          <Text style={[styles.modeBtnText, { color: mode === "rooms" ? C.text : C.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            Chatrooms
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : mode === "dms" ? (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: isWeb ? 34 + 84 : 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="message-circle" size={44} color={C.textTertiary} />
              <Text style={[styles.emptyTitle, { color: C.text, fontFamily: "Inter_600SemiBold" }]}>No conversations</Text>
              <Text style={[styles.emptyText, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>
                Visit a profile to start chatting
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={chatrooms}
          renderItem={renderChatroom}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 12, paddingBottom: isWeb ? 34 + 84 : 100, gap: 10 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="hash" size={44} color={C.textTertiary} />
              <Text style={[styles.emptyTitle, { color: C.text, fontFamily: "Inter_600SemiBold" }]}>No chatrooms yet</Text>
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
  headerTitle: { fontSize: 22 },
  composeBtn: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modeToggle: {
    flexDirection: "row", margin: 12, borderRadius: 14, padding: 3, borderWidth: 0.5,
  },
  modeBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 11 },
  modeBtnText: { fontSize: 14 },
  convItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5,
  },
  convInfo: { flex: 1 },
  convTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  convName: { fontSize: 15 },
  convTime: { fontSize: 11 },
  convPreview: { fontSize: 13 },
  badge: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  chatroomItem: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 0.5, padding: 14 },
  chatroomIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  chatroomIconText: { fontSize: 20 },
  chatroomInfo: { flex: 1 },
  chatroomName: { fontSize: 15, marginBottom: 3 },
  chatroomDesc: { fontSize: 12, marginBottom: 6 },
  chatroomMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  chatroomMetaText: { fontSize: 11 },
  categoryTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  categoryTagText: { fontSize: 11 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18 },
  emptyText: { fontSize: 13 },
});
