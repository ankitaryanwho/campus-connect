import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet,
  useColorScheme, ActivityIndicator, Image, Platform,
} from "react-native";
import { KeyboardAvoidingView, useKeyboardState } from "react-native-keyboard-controller";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth, API_BASE } from "@/contexts/AuthContext";
import { useSSE } from "@/hooks/useSSE";

const isWeb = Platform.OS === "web";

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function Avatar({ name, avatar, size = 36, C }: any) {
  if (avatar)
    return <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: size * 0.35 }}>{getInitials(name || "?")}</Text>
    </View>
  );
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function getDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

type ChatItem =
  | { type: "message"; id: string; data: any }
  | { type: "divider"; id: string; label: string };

function buildChatItems(messages: any[]): ChatItem[] {
  // messages are newest-first from API; inverted FlatList renders index 0 at bottom.
  // We insert a date divider AFTER the last message of each day in the array,
  // so it appears visually ABOVE that day's group.
  const result: ChatItem[] = [];
  for (let i = 0; i < messages.length; i++) {
    result.push({ type: "message", id: messages[i].id, data: messages[i] });
    const currentKey = getDateKey(messages[i].createdAt);
    const nextKey = i + 1 < messages.length ? getDateKey(messages[i + 1].createdAt) : null;
    if (nextKey === null || nextKey !== currentKey) {
      result.push({ type: "divider", id: `divider-${currentKey}`, label: formatDateLabel(messages[i].createdAt) });
    }
  }
  return result;
}

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { apiRequest, user, token } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const keyboardVisible = useKeyboardState((s) => s.isVisible);
  const inputRef = useRef<TextInput>(null);

  const convQuery = useQuery({
    queryKey: ["conversation", id],
    queryFn: async () => {
      const res = await apiRequest("/chat/conversations");
      const data = await res.json();
      return data.conversations?.find((c: any) => c.id === id);
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["messages", id],
    queryFn: async () => {
      const res = await apiRequest(`/chat/conversations/${id}/messages`);
      return res.json() as Promise<{ messages: any[] }>;
    },
  });

  const prependMessage = useCallback((msg: any) => {
    queryClient.setQueryData(["messages", id], (old: any) => {
      const existing: any[] = old?.messages || [];
      if (existing.some(m => m.id === msg.id)) return old;
      return { ...old, messages: [msg, ...existing] };
    });
  }, [queryClient, id]);

  useSSE(
    id ? `${API_BASE}/chat/conversations/${id}/stream` : null,
    token,
    prependMessage,
  );

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/chat/conversations/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: text.trim() }),
      });
      return res.json();
    },
    onSuccess: (newMsg) => {
      setText("");
      prependMessage(newMsg);
      inputRef.current?.focus();
    },
  });

  const conversation = convQuery.data;
  const other = conversation?.participants?.find((p: any) => p?.id !== user?.id);

  // API returns newest-first; keep that order — inverted FlatList puts index 0 at bottom.
  const rawMessages = data?.messages || [];
  const chatItems = buildChatItems(rawMessages);

  const renderItem = ({ item, index }: { item: ChatItem; index: number }) => {
    if (item.type === "divider") {
      return (
        <View style={styles.dateDividerRow}>
          <View style={[styles.dateDividerLine, { backgroundColor: C.border }]} />
          <Text style={[styles.dateDividerText, { color: C.textTertiary, backgroundColor: C.background }]}>
            {item.label}
          </Text>
          <View style={[styles.dateDividerLine, { backgroundColor: C.border }]} />
        </View>
      );
    }

    const msg = item.data;
    const isMe = msg.isSelf === true;
    const orderCtx = msg.metadata?.orderContext ?? null;

    // Detect consecutive messages from same sender (for avatar grouping)
    // In inverted list, index+1 is the message ABOVE (older)
    const prevItem = chatItems[index - 1];
    const prevMsg = prevItem?.type === "message" ? prevItem.data : null;
    const showAvatar = !isMe && (!prevMsg || prevMsg.sender?.id !== msg.sender?.id || getDateKey(prevMsg.createdAt) !== getDateKey(msg.createdAt));

    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowRight : styles.messageRowLeft, { marginBottom: 3 }]}>
        {!isMe && (
          <View style={{ width: 30, alignItems: "center", justifyContent: "flex-end" }}>
            {showAvatar && <Avatar name={msg.sender?.name} avatar={msg.sender?.avatar} size={28} C={C} />}
          </View>
        )}

        <View style={[styles.bubbleWrapper, isMe ? { alignItems: "flex-end" } : { alignItems: "flex-start" }]}>
          {orderCtx && (
            <View style={[styles.orderBanner, { backgroundColor: isMe ? "rgba(255,255,255,0.18)" : "#EDE9FE" }]}>
              <Feather name="package" size={11} color={isMe ? "#fff" : "#5B4FE8"} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9, fontFamily: "Inter_600SemiBold", color: isMe ? "rgba(255,255,255,0.85)" : "#5B4FE8" }}>
                  Order Message
                </Text>
                <Text style={{ fontSize: 10, color: isMe ? "rgba(255,255,255,0.7)" : "#78716C", fontFamily: "Inter_500Medium" }} numberOfLines={1}>
                  {orderCtx.title || orderCtx.id?.substring(0, 8)?.toUpperCase()}
                </Text>
              </View>
            </View>
          )}
          <View
            style={[
              styles.bubble,
              isMe
                ? { backgroundColor: C.primary, borderBottomRightRadius: 5 }
                : { backgroundColor: C.surface, borderColor: C.border, borderWidth: 0.5, borderBottomLeftRadius: 5 },
              orderCtx && { borderTopLeftRadius: 5, borderTopRightRadius: 5 },
            ]}
          >
            <Text style={[styles.bubbleText, { color: isMe ? "#fff" : C.text }]}>{msg.content}</Text>
            <Text style={[styles.bubbleTime, { color: isMe ? "rgba(255,255,255,0.65)" : C.textTertiary }]}>
              {formatTime(msg.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.background }}
      behavior={isWeb ? undefined : "padding"}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 8, backgroundColor: C.background, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>
        {other && (
          <Pressable style={styles.headerUser} onPress={() => router.push(`/profile/${other.id}`)}>
            <Avatar name={other.name} avatar={other.avatar} size={36} C={C} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerName, { color: C.text }]} numberOfLines={1}>{other.name}</Text>
              <Text style={[styles.headerStatus, { color: C.success }]}>Online</Text>
            </View>
          </Pressable>
        )}
        <View style={styles.headerIcons}>
          <Pressable hitSlop={8}><Feather name="phone" size={20} color={C.text} /></Pressable>
          <Pressable hitSlop={8}><Feather name="more-vertical" size={20} color={C.text} /></Pressable>
        </View>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={chatItems}
          keyExtractor={item => item.id}
          inverted
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <View style={[styles.emptyIconWrap, { backgroundColor: C.primaryLight }]}>
                <Feather name="message-circle" size={36} color={C.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: C.text }]}>No messages yet</Text>
              <Text style={[styles.emptyText, { color: C.textSecondary }]}>Say hello to start the conversation!</Text>
            </View>
          }
        />
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, {
        backgroundColor: C.surface,
        borderTopColor: C.border,
        paddingBottom: isWeb ? 34
          : Platform.OS === "android"
            ? keyboardVisible ? 6 : insets.bottom + 4
            : insets.bottom + 4,
      }]}>
        <Pressable style={[styles.iconBtn, { backgroundColor: C.backgroundSecondary }]}>
          <Feather name="plus" size={20} color={C.textSecondary} />
        </Pressable>
        <TextInput
          ref={inputRef}
          style={[styles.textInput, { backgroundColor: C.backgroundSecondary, color: C.text }]}
          placeholder="Message..."
          placeholderTextColor={C.textTertiary}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
        />
        <Pressable
          style={[styles.iconBtn, { backgroundColor: text.trim() ? C.primary : C.backgroundSecondary }]}
          onPress={() => text.trim() && sendMutation.mutate()}
          disabled={!text.trim() || sendMutation.isPending}
        >
          {sendMutation.isPending
            ? <ActivityIndicator size="small" color={text.trim() ? "#fff" : C.textTertiary} />
            : <Feather name="send" size={16} color={text.trim() ? "#fff" : C.textTertiary} />
          }
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingBottom: 10,
    borderBottomWidth: 0.5, gap: 8,
  },
  backBtn: { padding: 4 },
  headerUser: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  headerStatus: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  headerIcons: { flexDirection: "row", gap: 18, paddingLeft: 4 },

  listContent: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 8,
    flexGrow: 1,
  },

  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    marginBottom: 2,
  },
  messageRowLeft: { justifyContent: "flex-start" },
  messageRowRight: { flexDirection: "row-reverse", justifyContent: "flex-start" },

  bubbleWrapper: {
    maxWidth: "78%",
    flexShrink: 1,
  },

  orderBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 12, borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
    paddingHorizontal: 10, paddingVertical: 5, marginBottom: 2,
  },

  bubble: {
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingTop: 9,
    paddingBottom: 7,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  bubbleTime: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
    textAlign: "right",
  },

  dateDividerRow: {
    flexDirection: "row", alignItems: "center",
    marginVertical: 14, paddingHorizontal: 4, gap: 10,
  },
  dateDividerLine: { flex: 1, height: 0.5 },
  dateDividerText: {
    fontSize: 11, fontFamily: "Inter_500Medium",
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 20,
  },

  emptyChat: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingTop: 100, gap: 10,
  },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },

  inputBar: {
    flexDirection: "row", alignItems: "flex-end",
    gap: 8, paddingHorizontal: 12, paddingTop: 10,
    borderTopWidth: 0.5,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center", marginBottom: 1,
  },
  textInput: {
    flex: 1, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, fontFamily: "Inter_400Regular",
    maxHeight: 120, minHeight: 38,
  },
});
