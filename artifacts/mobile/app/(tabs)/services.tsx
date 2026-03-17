import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  useColorScheme, FlatList, ActivityIndicator, Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

const SERVICE_TABS = [
  { id: "assignments", label: "Assignments", icon: "file-text", color: "#5B4FE8" },
  { id: "coaching", label: "Coaching", icon: "user-check", color: "#10B981" },
  { id: "deliveries", label: "Delivery", icon: "package", color: "#F59E0B" },
  { id: "tasks", label: "Tasks", icon: "check-square", color: "#EF4444" },
];

function ServiceCard({ item, type, C, onAction, currentUserId }: any) {
  const isOwner = item.poster?.id === currentUserId || item.mentor?.id === currentUserId || item.requester?.id === currentUserId;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": case "available": case "pending": return C.success;
      case "accepted": case "booked": case "in_progress": return C.warning;
      case "completed": case "delivered": return C.primary;
      default: return C.textTertiary;
    }
  };

  const getActionLabel = () => {
    if (isOwner) return null;
    switch (type) {
      case "assignments": return item.status === "open" ? "Accept" : null;
      case "coaching": return item.status === "available" ? "Book" : null;
      case "deliveries": return item.status === "pending" ? "Accept" : null;
      case "tasks": return item.status === "open" ? "Apply" : null;
      default: return null;
    }
  };

  const getPrice = () => {
    const amount = item.price || item.budget || item.fee || 0;
    return `₹${parseFloat(amount).toFixed(0)}`;
  };

  const poster = item.poster || item.mentor || item.requester;
  const actionLabel = getActionLabel();

  return (
    <View style={[styles.serviceCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: C.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={2}>
            {item.title || item.item}
          </Text>
          {poster && (
            <Text style={[styles.cardAuthor, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>
              by {poster.name}
            </Text>
          )}
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.price, { color: C.primary, fontFamily: "Inter_700Bold" }]}>{getPrice()}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status), fontFamily: "Inter_500Medium" }]}>
              {item.status}
            </Text>
          </View>
        </View>
      </View>

      {item.description && (
        <Text style={[styles.cardDesc, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      {item.subject && (
        <View style={[styles.tag, { backgroundColor: C.primaryLight }]}>
          <Text style={[styles.tagText, { color: C.primary, fontFamily: "Inter_500Medium" }]}>{item.subject}</Text>
        </View>
      )}

      {item.category && (
        <View style={[styles.tag, { backgroundColor: C.backgroundSecondary }]}>
          <Feather name="tag" size={11} color={C.textTertiary} />
          <Text style={[styles.tagText, { color: C.textSecondary, fontFamily: "Inter_500Medium" }]}>{item.category}</Text>
        </View>
      )}

      {item.deliveryMode && (
        <View style={[styles.tag, { backgroundColor: C.infoLight }]}>
          <Feather name="box" size={11} color={C.info} />
          <Text style={[styles.tagText, { color: C.info, fontFamily: "Inter_500Medium" }]}>{item.deliveryMode}</Text>
        </View>
      )}

      {actionLabel && (
        <Pressable
          style={[styles.actionBtn, { backgroundColor: C.primary }]}
          onPress={() => onAction(item.id)}
        >
          <Text style={[styles.actionBtnText, { fontFamily: "Inter_600SemiBold" }]}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { apiRequest, user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("assignments");
  const isWeb = Platform.OS === "web";

  const endpointMap: Record<string, string> = {
    assignments: "/services/assignments",
    coaching: "/services/coaching",
    deliveries: "/services/deliveries",
    tasks: "/services/tasks",
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["services", activeTab],
    queryFn: async () => {
      const res = await apiRequest(endpointMap[activeTab]);
      return res.json();
    },
  });

  const actionMutation = useMutation({
    mutationFn: async (id: string) => {
      const actionMap: Record<string, string> = {
        assignments: "accept",
        coaching: "book",
        deliveries: "accept",
        tasks: "apply",
      };
      const res = await apiRequest(`${endpointMap[activeTab]}/${id}/${actionMap[activeTab]}`, { method: "POST" });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services", activeTab] }),
  });

  const items = data?.assignments || data?.sessions || data?.deliveries || data?.tasks || [];
  const activeService = SERVICE_TABS.find(t => t.id === activeTab);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 8, backgroundColor: C.background, borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: C.text, fontFamily: "Inter_700Bold" }]}>Services</Text>
        <Pressable style={[styles.addBtn, { backgroundColor: C.primary }]}>
          <Feather name="plus" size={18} color="#fff" />
        </Pressable>
      </View>

      {/* Service Category Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
        {SERVICE_TABS.map(tab => (
          <Pressable
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && { backgroundColor: tab.color }]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Feather name={tab.icon as any} size={16} color={activeTab === tab.id ? "#fff" : C.textSecondary} />
            <Text style={[styles.tabLabel, { color: activeTab === tab.id ? "#fff" : C.textSecondary, fontFamily: "Inter_500Medium" }]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ServiceCard
              item={item}
              type={activeTab}
              C={C}
              onAction={(id: string) => actionMutation.mutate(id)}
              currentUserId={user?.id}
            />
          )}
          contentContainerStyle={{ padding: 12, paddingBottom: isWeb ? 34 + 84 : 100, gap: 12 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name={activeService?.icon as any} size={44} color={C.textTertiary} />
              <Text style={[styles.emptyTitle, { color: C.text, fontFamily: "Inter_600SemiBold" }]}>
                No {activeService?.label} yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>
                Be the first to post one!
              </Text>
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
  addBtn: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tabsContainer: { paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  tab: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: "transparent",
  },
  tabLabel: { fontSize: 13 },
  serviceCard: { borderRadius: 16, borderWidth: 0.5, padding: 14 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginBottom: 10 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, lineHeight: 20 },
  cardAuthor: { fontSize: 12, marginTop: 3 },
  cardRight: { alignItems: "flex-end", gap: 6 },
  price: { fontSize: 18 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11 },
  cardDesc: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start", marginTop: 4 },
  tagText: { fontSize: 11 },
  actionBtn: { paddingVertical: 10, borderRadius: 10, alignItems: "center", marginTop: 12 },
  actionBtnText: { color: "#fff", fontSize: 14 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18 },
  emptySubtitle: { fontSize: 13 },
});
