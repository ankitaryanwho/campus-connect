import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "react-native";

const isWeb = Platform.OS === "web";

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    booked: "Booked",
    accepted: "Accepted",
    rejected: "Rejected",
    in_progress: "In Progress",
    completed: "Arrived",
    delivered: "Delivered",
    cancelled: "Cancelled",
    payment_marked: "Payment Sent",
    payment_confirmed: "Confirmed",
  };
  return map[s] || s;
}

function statusColor(s: string): string {
  if (s === "delivered") return "#10B981";
  if (s === "accepted" || s === "in_progress") return "#8B5CF6";
  if (s === "booked") return "#F59E0B";
  if (s === "rejected" || s === "cancelled") return "#EF4444";
  if (s === "completed") return "#5B4FE8";
  return "#A8A29E";
}

function serviceTypeLabel(t: string): string {
  const map: Record<string, string> = {
    assignments: "Assignment",
    certifications: "Certification",
    projects: "Project",
  };
  return map[t] || t;
}

function serviceTypeEmoji(t: string): string {
  const map: Record<string, string> = {
    assignments: "📝",
    certifications: "🏆",
    projects: "💼",
  };
  return map[t] || "📦";
}

function formatAmount(n: any): string {
  const num = typeof n === "string" ? parseFloat(n) : n || 0;
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-IN");
}

function BookingCard({
  booking,
  isProvider,
  C,
}: {
  booking: any;
  isProvider: boolean;
  C: any;
}) {
  const isLister = booking._myPerspective === "lister";
  const listing = booking.listing;
  const title =
    listing?.title ||
    listing?.subject ||
    listing?.courseName ||
    listing?.projectTitle ||
    `${serviceTypeLabel(booking._type)} Order`;
  const studentName = booking.student?.name || "Student";
  const providerName = booking.provider?.name || listing?.poster?.name || "—";
  const amount = booking.amount ?? listing?.price ?? listing?.budget ?? 0;
  const sc = statusColor(booking.status);

  return (
    <View
      style={[
        S.card,
        { backgroundColor: C.surface, borderColor: C.border },
      ]}
    >
      {/* Header row: emoji + type tag + status */}
      <View style={S.cardHeader}>
        <View style={[S.typeTag, { backgroundColor: sc + "15" }]}>
          <Text style={S.typeEmoji}>{serviceTypeEmoji(booking._type)}</Text>
          <Text style={[S.typeText, { color: sc }]}>
            {serviceTypeLabel(booking._type)}
          </Text>
        </View>
        <View style={[S.statusBadge, { backgroundColor: sc + "18" }]}>
          <View style={[S.statusDot, { backgroundColor: sc }]} />
          <Text style={[S.statusText, { color: sc }]}>
            {statusLabel(booking.status)}
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text style={[S.cardTitle, { color: C.text }]} numberOfLines={2}>
        {title}
      </Text>

      {/* Order By + Agent row */}
      <View style={S.metaRow}>
        <View style={S.metaItem}>
          <Feather name="user" size={12} color={C.textTertiary} />
          <Text style={[S.metaLabel, { color: C.textTertiary }]}>
            Order By{" "}
            <Text style={[S.metaValue, { color: C.text }]}>{studentName}</Text>
          </Text>
        </View>
        <View style={[S.metaItem, { justifyContent: "flex-end" }]}>
          <Feather name="briefcase" size={12} color={C.textTertiary} />
          <Text style={[S.metaLabel, { color: C.textTertiary }]}>
            Agent{" "}
            <Text style={[S.metaValue, { color: C.text }]}>{providerName}</Text>
          </Text>
        </View>
      </View>

      {/* Price */}
      <View style={S.priceRow}>
        <Text style={[S.priceLabel, { color: C.textSecondary }]}>Amount</Text>
        <Text style={[S.priceValue, { color: C.primary }]}>
          ₹{formatAmount(amount)}
        </Text>
      </View>

      {/* Action buttons */}
      {booking.status !== "delivered" && booking.status !== "cancelled" && (
        <View style={S.actions}>
          {isProvider && isLister ? (
            <TouchableOpacity
              style={[S.actionBtn, { backgroundColor: C.primary }]}
              onPress={() => router.push("/(tabs)/services")}
              activeOpacity={0.85}
            >
              <Feather name="edit-3" size={14} color="#fff" />
              <Text style={S.actionBtnText}>Update Order Status</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[S.actionBtn, { backgroundColor: "#8B5CF6" }]}
              onPress={() => router.push("/(tabs)/services")}
              activeOpacity={0.85}
            >
              <Feather name="map-pin" size={14} color="#fff" />
              <Text style={S.actionBtnText}>Track Order</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

export default function ServiceHistoryScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { user, apiRequest } = useAuth();
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [refreshing, setRefreshing] = useState(false);

  const isProvider = user?.role === "provider";

  const historyQuery = useQuery({
    queryKey: ["serviceHistory"],
    queryFn: async () => {
      const res = await apiRequest("/services/my-history");
      if (!res.ok) throw new Error("Failed to load history");
      return res.json() as Promise<{ active: any[]; completed: any[] }>;
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await historyQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [historyQuery]);

  const active = historyQuery.data?.active || [];
  const completed = historyQuery.data?.completed || [];

  // For providers: split active into "lister" (jobs they accepted) and "booker" (jobs they booked)
  const activeAsLister = active.filter((b) => b._myPerspective === "lister");
  const activeAsBooker = active.filter((b) => b._myPerspective === "booker");

  const renderEmpty = (msg: string) => (
    <View style={[S.empty, { borderColor: C.border }]}>
      <Feather name="inbox" size={36} color={C.textTertiary} style={{ opacity: 0.5 }} />
      <Text style={[S.emptyText, { color: C.textSecondary }]}>{msg}</Text>
    </View>
  );

  const renderActiveContent = () => {
    if (historyQuery.isLoading) {
      return <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />;
    }
    if (active.length === 0) {
      return renderEmpty("No active jobs yet.\nBook a service to get started.");
    }

    if (isProvider) {
      return (
        <>
          {activeAsLister.length > 0 && (
            <View>
              <View style={[S.groupHeader, { borderColor: C.border }]}>
                <Feather name="briefcase" size={14} color="#5B4FE8" />
                <Text style={[S.groupTitle, { color: C.text }]}>
                  Jobs I&apos;m Doing
                </Text>
                <View style={[S.groupCount, { backgroundColor: "#EDE9FE" }]}>
                  <Text style={[S.groupCountText, { color: "#5B4FE8" }]}>
                    {activeAsLister.length}
                  </Text>
                </View>
              </View>
              {activeAsLister.map((b) => (
                <BookingCard key={b.id} booking={b} isProvider={isProvider} C={C} />
              ))}
            </View>
          )}

          {activeAsBooker.length > 0 && (
            <View style={{ marginTop: activeAsLister.length > 0 ? 8 : 0 }}>
              <View style={[S.groupHeader, { borderColor: C.border }]}>
                <Feather name="shopping-bag" size={14} color="#F59E0B" />
                <Text style={[S.groupTitle, { color: C.text }]}>
                  My Own Bookings
                </Text>
                <View style={[S.groupCount, { backgroundColor: "#FEF3C7" }]}>
                  <Text style={[S.groupCountText, { color: "#D97706" }]}>
                    {activeAsBooker.length}
                  </Text>
                </View>
              </View>
              {activeAsBooker.map((b) => (
                <BookingCard key={b.id} booking={b} isProvider={isProvider} C={C} />
              ))}
            </View>
          )}

          {activeAsLister.length === 0 && activeAsBooker.length === 0 &&
            renderEmpty("No active jobs.")}
        </>
      );
    }

    // Student view
    return active.map((b) => (
      <BookingCard key={b.id} booking={b} isProvider={isProvider} C={C} />
    ));
  };

  const renderCompletedContent = () => {
    if (historyQuery.isLoading) {
      return <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />;
    }
    if (completed.length === 0) {
      return renderEmpty("No completed jobs yet.");
    }
    return completed.map((b) => (
      <BookingCard key={b.id} booking={b} isProvider={isProvider} C={C} />
    ));
  };

  return (
    <View style={[S.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View
        style={[
          S.header,
          {
            paddingTop: isWeb ? 56 : insets.top + 12,
            backgroundColor: C.surface,
            borderBottomColor: C.border,
          },
        ]}
      >
        <Pressable style={S.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={C.text} />
        </Pressable>
        <View style={S.headerCenter}>
          <Text style={[S.headerTitle, { color: C.text }]}>Your Activity</Text>
          <Text style={[S.headerSub, { color: C.textSecondary }]}>
            {active.length} active · {completed.length} completed
          </Text>
        </View>
        <Pressable style={S.refreshBtn} onPress={onRefresh}>
          <Feather name="refresh-cw" size={16} color={C.textSecondary} />
        </Pressable>
      </View>

      {/* Tab switcher */}
      <View style={[S.tabBar, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        {(["active", "completed"] as const).map((tab) => {
          const isActive = activeTab === tab;
          const count = tab === "active" ? active.length : completed.length;
          return (
            <Pressable
              key={tab}
              style={[S.tabItem, isActive && [S.tabItemActive, { borderBottomColor: "#5B4FE8" }]]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  S.tabText,
                  { color: isActive ? "#5B4FE8" : C.textSecondary },
                  isActive && S.tabTextActive,
                ]}
              >
                {tab === "active" ? "Active Jobs" : "Completed Jobs"}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    S.tabBadge,
                    {
                      backgroundColor: isActive ? "#5B4FE8" : C.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      S.tabBadgeText,
                      { color: isActive ? "#fff" : C.textSecondary },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={S.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
          />
        }
      >
        {activeTab === "active" ? renderActiveContent() : renderCompletedContent()}
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  refreshBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
  },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    paddingHorizontal: 16,
  },
  tabItem: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabItemActive: {},
  tabText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  tabTextActive: { fontFamily: "Inter_700Bold" },
  tabBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 5,
  },
  tabBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },

  // Content
  content: { padding: 14, gap: 10, paddingBottom: 100 },

  // Group headers (provider view)
  groupHeader: {
    flexDirection: "row", alignItems: "center", gap: 7,
    marginBottom: 8, paddingBottom: 8, borderBottomWidth: 0.5,
  },
  groupTitle: { fontSize: 13, fontFamily: "Inter_700Bold", flex: 1 },
  groupCount: {
    minWidth: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 6,
  },
  groupCountText: { fontSize: 11, fontFamily: "Inter_700Bold" },

  // Card
  card: {
    borderRadius: 16, borderWidth: 0.5,
    padding: 14, gap: 10,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  typeTag: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  typeEmoji: { fontSize: 12 },
  typeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 21 },

  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  metaLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  metaValue: { fontFamily: "Inter_600SemiBold" },

  priceRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 8, borderTopWidth: 0.5, borderTopColor: "#F0EDEA",
  },
  priceLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  priceValue: { fontSize: 17, fontFamily: "Inter_700Bold" },

  actions: { marginTop: 2 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, paddingVertical: 11, borderRadius: 12,
  },
  actionBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Empty state
  empty: {
    alignItems: "center", paddingVertical: 60, gap: 12,
    borderWidth: 0.5, borderRadius: 16, borderStyle: "dashed",
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    textAlign: "center", lineHeight: 22,
  },
});
