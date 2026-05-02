import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet,
  useColorScheme, ActivityIndicator, Platform,
} from "react-native";
import { Image } from "expo-image";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth, API_BASE } from "@/contexts/AuthContext";
import { useSSE } from "@/hooks/useSSE";

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function Avatar({ name, avatar, size = 32, C }: any) {
  if (avatar) return <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} cachePolicy="disk" />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: size * 0.35 }}>{getInitials(name || "?")}</Text>
    </View>
  );
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

const ChatroomBubble = React.memo(function ChatroomBubble({
  item, userId, C,
}: { item: any; userId: string | undefined; C: any }) {
  const isMe = item.sender?.id === userId;
  return (
    <View style={[styles.messageRow, isMe && styles.messageRowRight]}>
      {!isMe && <Avatar name={item.sender?.name} avatar={item.sender?.avatar} size={28} C={C} />}
      <View style={styles.messageGroup}>
        {!isMe && (
          <Text style={[styles.senderName, { color: C.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            {item.sender?.name}
          </Text>
        )}
        <View style={[styles.bubble, isMe ? { backgroundColor: C.primary } : { backgroundColor: C.surface, borderColor: C.border, borderWidth: 0.5 }]}>
          <Text style={[styles.bubbleText, { color: isMe ? "#fff" : C.text, fontFamily: "Inter_400Regular" }]}>{item.content}</Text>
          <Text style={[styles.bubbleTime, { color: isMe ? "rgba(255,255,255,0.7)" : C.textTertiary, fontFamily: "Inter_400Regular" }]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    </View>
  );
});

export default function ChatroomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { apiRequest, user, token } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);
  const isWeb = Platform.OS === "web";

  const roomQuery = useQuery({
    queryKey: ["chatrooms"],
    queryFn: async () => {
      const res = await apiRequest("/chat/chatrooms");
      return res.json() as Promise<{ chatrooms: any[] }>;
    },
    select: (data) => data.chatrooms.find(r => r.id === id),
  });

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["chatroom-messages", id],
    queryFn: async ({ pageParam }) => {
      const qs = pageParam ? `?cursor=${pageParam}&limit=30` : "?limit=30";
      const res = await apiRequest(`/chat/chatrooms/${id}/messages${qs}`);
      return res.json() as Promise<{ messages: any[]; nextCursor: string | null }>;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null as string | null,
  });

  const prependMessage = useCallback((msg: any) => {
    queryClient.setQueryData(["chatroom-messages", id], (old: any) => {
      if (!old?.pages) return old;
      const firstPage = old.pages[0] ?? { messages: [], nextCursor: null };
      const existing: any[] = firstPage.messages || [];
      if (existing.some(m => m.id === msg.id)) return old;
      return { ...old, pages: [{ ...firstPage, messages: [msg, ...existing] }, ...old.pages.slice(1)] };
    });
  }, [queryClient, id]);

  useSSE(
    id ? `${API_BASE}/chat/chatrooms/${id}/stream` : null,
    token,
    prependMessage,
  );

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest(`/chat/chatrooms/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onMutate: async (content: string) => {
      await queryClient.cancelQueries({ queryKey: ["chatroom-messages", id] });
      const previous = queryClient.getQueryData(["chatroom-messages", id]);
      const tempId = `optimistic-${Date.now()}`;
      const optimisticMsg = {
        id: tempId,
        content,
        createdAt: new Date().toISOString(),
        sender: { id: user?.id, name: user?.name, avatar: user?.avatar ?? null },
        isSelf: true,
      };
      prependMessage(optimisticMsg);
      setText("");
      inputRef.current?.focus();
      return { previous, tempId };
    },
    onSuccess: (newMsg, _content, context) => {
      queryClient.setQueryData(["chatroom-messages", id], (old: any) => {
        if (!old?.pages) return old;
        const firstPage = old.pages[0] ?? { messages: [], nextCursor: null };
        const existing: any[] = firstPage.messages || [];
        const withoutOptimistic = existing.filter(m => m.id !== context?.tempId);
        const alreadyPresent = withoutOptimistic.some(m => m.id === newMsg.id);
        const updated = alreadyPresent
          ? withoutOptimistic
          : [{ ...newMsg, isSelf: true }, ...withoutOptimistic];
        return { ...old, pages: [{ ...firstPage, messages: updated }, ...old.pages.slice(1)] };
      });
    },
    onError: (_err, _content, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["chatroom-messages", id], context.previous);
      }
    },
  });

  const messages = (data?.pages.flatMap(p => p.messages) ?? []).slice().reverse();
  const room = roomQuery.data;

  const renderItem = useCallback(({ item }: { item: any }) => (
    <ChatroomBubble item={item} userId={user?.id} C={C} />
  ), [user?.id, C]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.background }} behavior="padding" keyboardVerticalOffset={0}>
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 8, backgroundColor: C.background, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: C.text, fontFamily: "Inter_700Bold" }]}>
            {room?.name || "Chatroom"}
          </Text>
          {room && (
            <Text style={[styles.headerMeta, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {room.memberCount} members
            </Text>
          )}
        </View>
        <Feather name="more-vertical" size={20} color={C.text} />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={C.primary} /></View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          inverted
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 12 }}
          showsVerticalScrollIndicator={false}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={isFetchingNextPage ? (
            <View style={{ paddingVertical: 12, alignItems: "center" }}>
              <ActivityIndicator size="small" color={C.primary} />
            </View>
          ) : null}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="hash" size={40} color={C.textTertiary} />
              <Text style={[styles.emptyText, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>
                Be the first to message in {room?.name || "this room"}!
              </Text>
            </View>
          }
        />
      )}

      <View style={[styles.inputBar, { backgroundColor: C.surface, borderTopColor: C.border, paddingBottom: isWeb ? 34 : insets.bottom + 8 }]}>
        <TextInput
          ref={inputRef}
          style={[styles.textInput, { backgroundColor: C.backgroundSecondary, color: C.text, fontFamily: "Inter_400Regular" }]}
          placeholder={`Message ${room?.name || ""}...`}
          placeholderTextColor={C.textTertiary}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
        />
        <Pressable
          style={[styles.sendBtn, { backgroundColor: text.trim() ? C.primary : C.backgroundSecondary }]}
          onPress={() => { const t = text.trim(); if (t) sendMutation.mutate(t); }}
          disabled={!text.trim() || sendMutation.isPending}
        >
          {sendMutation.isPending ? (
            <ActivityIndicator size="small" color={text.trim() ? "#fff" : C.textTertiary} />
          ) : (
            <Feather name="send" size={16} color={text.trim() ? "#fff" : C.textTertiary} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5, gap: 12 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16 },
  headerMeta: { fontSize: 11, marginTop: 1 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 10 },
  messageRowRight: { flexDirection: "row-reverse" },
  messageGroup: { maxWidth: "80%" },
  senderName: { fontSize: 11, marginBottom: 3, marginLeft: 4 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, paddingBottom: 8 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTime: { fontSize: 10, marginTop: 4, textAlign: "right" },
  empty: { flex: 1, alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, textAlign: "center", paddingHorizontal: 20 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 0.5 },
  textInput: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, maxHeight: 120 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", marginBottom: 1 },
});
