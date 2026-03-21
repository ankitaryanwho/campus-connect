import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet,
  useColorScheme, ActivityIndicator, Image, Platform, KeyboardAvoidingView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function Avatar({ name, avatar, size = 36, C }: any) {
  if (avatar) return <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: size * 0.35 }}>{getInitials(name || "?")}</Text>
    </View>
  );
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { apiRequest, user } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);
  const isWeb = Platform.OS === "web";

  const convQuery = useQuery({
    queryKey: ["conversation", id],
    queryFn: async () => {
      const res = await apiRequest("/chat/conversations");
      const data = await res.json();
      return data.conversations?.find((c: any) => c.id === id);
    },
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["messages", id],
    queryFn: async () => {
      const res = await apiRequest(`/chat/conversations/${id}/messages`);
      return res.json() as Promise<{ messages: any[] }>;
    },
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/chat/conversations/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: text.trim() }),
      });
      return res.json();
    },
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["messages", id] });
      inputRef.current?.focus();
    },
  });

  const messages = (data?.messages || []).slice().reverse();
  const conversation = convQuery.data;
  const other = conversation?.participants?.find((p: any) => p?.id !== user?.id);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.background }} behavior="padding" keyboardVerticalOffset={0}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 8, backgroundColor: C.background, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>
        {other && (
          <Pressable style={styles.headerUser} onPress={() => router.push(`/profile/${other.id}`)}>
            <Avatar name={other.name} avatar={other.avatar} size={34} C={C} />
            <View>
              <Text style={[styles.headerName, { color: C.text, fontFamily: "Inter_600SemiBold" }]}>{other.name}</Text>
              <Text style={[styles.headerStatus, { color: C.success, fontFamily: "Inter_400Regular" }]}>Online</Text>
            </View>
          </Pressable>
        )}
        <View style={styles.headerIcons}>
          <Feather name="phone" size={20} color={C.text} />
          <Feather name="more-vertical" size={20} color={C.text} />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          inverted
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 12 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isMe = item.senderId === user?.id;
            return (
              <View style={[styles.messageRow, isMe && styles.messageRowRight]}>
                {!isMe && <Avatar name={item.senderName} avatar={item.senderAvatar} size={30} C={C} />}
                <View style={[styles.bubble, isMe ? { backgroundColor: C.primary } : { backgroundColor: C.surface, borderColor: C.border, borderWidth: 0.5 }]}>
                  <Text style={[styles.bubbleText, { color: isMe ? "#fff" : C.text, fontFamily: "Inter_400Regular" }]}>{item.content}</Text>
                  <Text style={[styles.bubbleTime, { color: isMe ? "rgba(255,255,255,0.7)" : C.textTertiary, fontFamily: "Inter_400Regular" }]}>
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Feather name="message-circle" size={40} color={C.textTertiary} />
              <Text style={[styles.emptyChatText, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>
                Say hello to start the conversation!
              </Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={[styles.inputBar, { backgroundColor: C.surface, borderTopColor: C.border, paddingBottom: isWeb ? 34 : insets.bottom + 8 }]}>
        <Pressable style={[styles.attachBtn, { backgroundColor: C.backgroundSecondary }]}>
          <Feather name="plus" size={20} color={C.textSecondary} />
        </Pressable>
        <TextInput
          ref={inputRef}
          style={[styles.textInput, { backgroundColor: C.backgroundSecondary, color: C.text, fontFamily: "Inter_400Regular" }]}
          placeholder="Message..."
          placeholderTextColor={C.textTertiary}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
        />
        <Pressable
          style={[styles.sendBtn, { backgroundColor: text.trim() ? C.primary : C.backgroundSecondary }]}
          onPress={() => text.trim() && sendMutation.mutate()}
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
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 0.5, gap: 12,
  },
  headerUser: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerName: { fontSize: 15 },
  headerStatus: { fontSize: 11 },
  headerIcons: { flexDirection: "row", gap: 16 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 8 },
  messageRowRight: { flexDirection: "row-reverse" },
  bubble: { maxWidth: "75%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, paddingBottom: 8 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTime: { fontSize: 10, marginTop: 4, textAlign: "right" },
  emptyChat: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyChatText: { fontSize: 14 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 0.5 },
  attachBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", marginBottom: 1 },
  textInput: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, maxHeight: 120 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", marginBottom: 1 },
});
