import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable,
  StyleSheet, ActivityIndicator, RefreshControl, Platform,
  DimensionValue,
} from "react-native";
import { router, Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "react-native";

const isWeb = Platform.OS === "web";

// ─── Lookup maps (typed, no `as any`) ─────────────────────────────────────────
const SERVICE_LABEL: Record<string, string> = {
  assignments: "Assignment", certifications: "Certification", projects: "Project",
};
const SERVICE_EMOJI: Record<string, string> = {
  assignments: "📝", certifications: "🏆", projects: "💼",
};
const SERVICE_ACCENT: Record<string, string> = {
  assignments: "#5B4FE8", certifications: "#10B981", projects: "#6366F1",
};
const STATUS_LABEL: Record<string, string> = {
  booked: "Booked", accepted: "Accepted", rejected: "Rejected",
  in_progress: "In Progress", completed: "Done", delivered: "Delivered",
  cancelled: "Cancelled",
};
const STATUS_COLOR: Record<string, string> = {
  delivered: "#10B981", in_progress: "#8B5CF6", accepted: "#5B4FE8",
  booked: "#F59E0B", rejected: "#EF4444", cancelled: "#EF4444",
  completed: "#5B4FE8",
};

function serviceLabel(t: string) { return SERVICE_LABEL[t] ?? t; }
function serviceEmoji(t: string) { return SERVICE_EMOJI[t] ?? "📦"; }
function serviceAccent(t: string) { return SERVICE_ACCENT[t] ?? "#5B4FE8"; }
function statusLabel(s: string) { return STATUS_LABEL[s] ?? s; }
function statusColor(s: string) { return STATUS_COLOR[s] ?? "#A8A29E"; }

function formatRupee(n: string | number | null | undefined): string {
  const num = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return isNaN(num) ? "0" : num.toLocaleString("en-IN");
}

const ACADEMIC_STEPS = [
  { id: "booked",      label: "Booked"      },
  { id: "accepted",    label: "Accepted"    },
  { id: "in_progress", label: "In Progress" },
  { id: "completed",   label: "Done"        },
  { id: "delivered",   label: "Delivered"   },
];

function getStepIndex(status: string): number {
  const idx = ACADEMIC_STEPS.findIndex(s => s.id === status);
  return idx === -1 ? 0 : idx;
}

type ColorTokens = typeof Colors.light;

// ─── Read-only Status Timeline ────────────────────────────────────────────────
function StatusTimeline({ booking, accent }: { booking: BookingItem; accent: string }) {
  const idx = getStepIndex(booking.status);
  const pct: DimensionValue = `${Math.round((idx / (ACADEMIC_STEPS.length - 1)) * 100)}%`;
  return (
    <View style={TL.wrap}>
      <View style={TL.track}>
        <View style={[TL.fill, { backgroundColor: accent, width: pct }]} />
      </View>
      <View style={TL.steps}>
        {ACADEMIC_STEPS.map((step, i) => {
          const done   = i < idx;
          const active = i === idx;
          return (
            <View key={step.id} style={TL.step}>
              {done ? (
                <Feather name="check-circle" size={14} color={accent} />
              ) : active ? (
                <View style={[TL.activeDot, { borderColor: accent }]}>
                  <View style={[TL.activeDotInner, { backgroundColor: accent }]} />
                </View>
              ) : (
                <Feather name="circle" size={14} color="#D6D3D1" />
              )}
              <Text
                numberOfLines={2}
                style={[
                  TL.stepLabel,
                  { color: active ? accent : done ? "#78716C" : "#D6D3D1" },
                  active && TL.stepLabelActive,
                ]}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const TL = StyleSheet.create({
  wrap:  { backgroundColor: "#F8F7FF", borderRadius: 10, padding: 12, gap: 10 },
  track: { height: 4, borderRadius: 2, backgroundColor: "#EDE9FE", overflow: "hidden" },
  fill:  { height: 4, borderRadius: 2 },
  steps: { flexDirection: "row", justifyContent: "space-between" },
  step:  { alignItems: "center", flex: 1, gap: 4 },
  stepLabel:       { fontSize: 9, textAlign: "center", lineHeight: 11, fontFamily: "Inter_400Regular" },
  stepLabelActive: { fontFamily: "Inter_700Bold" },
  activeDot:       { width: 14, height: 14, borderRadius: 7, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  activeDotInner:  { width: 5, height: 5, borderRadius: 3 },
});

// ─── Types ─────────────────────────────────────────────────────────────────────
interface UserRef   { id: string; name?: string }
interface ListingRef { title?: string; subject?: string; courseName?: string; projectTitle?: string; price?: string | number; budget?: string | number; poster?: UserRef }
interface BookingItem {
  id: string;
  _type: string;
  _myPerspective: "lister" | "booker";
  status: string;
  listing?: ListingRef;
  student?: UserRef;
  provider?: UserRef;
  amount?: string | number;
  totalPaid?: string;
}

// ─── Booking Card ──────────────────────────────────────────────────────────────
function BookingCard({ booking, C }: { booking: BookingItem; C: ColorTokens }) {
  const accent    = serviceAccent(booking._type);
  const listing   = booking.listing;
  const sc        = statusColor(booking.status);
  const isLister  = booking._myPerspective === "lister";
  const isTerminal = ["delivered", "rejected", "cancelled", "dismissed"].includes(booking.status);

  const title = listing?.title ?? listing?.subject ?? listing?.courseName ?? listing?.projectTitle
    ?? `${serviceLabel(booking._type)} Order`;
  const studentName  = booking.student?.name  ?? "—";
  const providerName = booking.provider?.name ?? listing?.poster?.name ?? "—";
  const amount       = booking.amount ?? listing?.price ?? listing?.budget ?? 0;

  function openDetail() {
    router.push({
      pathname: "/(tabs)/services" as Href,
      params: { tab: booking._type, openBookingId: booking.id },
    });
  }

  return (
    <View style={[BC.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      {/* Header */}
      <View style={BC.headerRow}>
        <View style={[BC.typeTag, { backgroundColor: accent + "18" }]}>
          <Text style={BC.typeEmoji}>{serviceEmoji(booking._type)}</Text>
          <Text style={[BC.typeText, { color: accent }]}>{serviceLabel(booking._type)}</Text>
        </View>
        <View style={[BC.statusBadge, { backgroundColor: sc + "18" }]}>
          <View style={[BC.statusDot, { backgroundColor: sc }]} />
          <Text style={[BC.statusText, { color: sc }]}>{statusLabel(booking.status)}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={[BC.title, { color: C.text }]} numberOfLines={2}>{title}</Text>

      {/* Order By / Agent */}
      <View style={BC.metaRow}>
        <View style={BC.metaItem}>
          <Feather name="user" size={11} color={C.textTertiary} />
          <Text style={[BC.metaText, { color: C.textTertiary }]}>
            Order By{" "}
            <Text style={[BC.metaHighlight, { color: C.text }]}>{studentName}</Text>
          </Text>
        </View>
        <View style={[BC.metaItem, { justifyContent: "flex-end" }]}>
          <Feather name="briefcase" size={11} color={C.textTertiary} />
          <Text style={[BC.metaText, { color: C.textTertiary }]}>
            Agent{" "}
            <Text style={[BC.metaHighlight, { color: C.text }]}>{providerName}</Text>
          </Text>
        </View>
      </View>

      {/* Status tracker (read-only) */}
      {!["rejected", "cancelled"].includes(booking.status) && (
        <StatusTimeline booking={booking} accent={accent} />
      )}

      {/* Rejected banner */}
      {booking.status === "rejected" && (
        <View style={BC.rejectedBanner}>
          <Feather name="x-circle" size={14} color="#EF4444" />
          <Text style={BC.rejectedText}>Booking rejected by provider.</Text>
        </View>
      )}

      {/* Price row */}
      <View style={[BC.priceRow, { borderTopColor: C.border }]}>
        <View>
          <Text style={[BC.priceLabel, { color: C.textSecondary }]}>Amount</Text>
          <Text style={[BC.priceValue, { color: accent }]}>₹{formatRupee(amount)}</Text>
        </View>
        {booking.totalPaid && parseFloat(booking.totalPaid) > 0
          && !["rejected", "delivered", "cancelled"].includes(booking.status) && (
          <View style={BC.escrowChip}>
            <Feather name="lock" size={11} color="#5B4FE8" />
            <Text style={BC.escrowText}>₹{formatRupee(booking.totalPaid)} in escrow</Text>
          </View>
        )}
      </View>

      {/* Delivered success banner */}
      {booking.status === "delivered" && (
        <View style={BC.deliveredBanner}>
          <Feather name="check-circle" size={14} color="#059669" />
          <Text style={BC.deliveredText}>Delivered successfully!</Text>
        </View>
      )}

      {/* Action button — navigates to Services tab booking detail modal */}
      {!isTerminal && (
        <Pressable
          style={[BC.actionBtn, { backgroundColor: accent }]}
          onPress={openDetail}
          android_ripple={{ color: "rgba(0,0,0,0.1)" }}
        >
          {isLister ? (
            <>
              <Feather name="edit-2" size={14} color="#fff" />
              <Text style={BC.actionBtnText}>Update Order Status</Text>
            </>
          ) : (
            <>
              <Feather name="eye" size={14} color="#fff" />
              <Text style={BC.actionBtnText}>Track Order</Text>
            </>
          )}
          <Feather name="chevron-right" size={14} color="rgba(255,255,255,0.7)" />
        </Pressable>
      )}
    </View>
  );
}

const BC = StyleSheet.create({
  card: {
    borderRadius: 16, borderWidth: 0.5, padding: 14, gap: 10,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  headerRow:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  typeTag:    { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  typeEmoji:  { fontSize: 11 },
  typeText:   { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusDot:   { width: 6, height: 6, borderRadius: 3 },
  statusText:  { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  title:       { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 21 },
  metaRow:     { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 6 },
  metaItem:    { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  metaText:    { fontSize: 12, fontFamily: "Inter_400Regular" },
  metaHighlight: { fontFamily: "Inter_600SemiBold" },
  priceRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTopWidth: 0.5 },
  priceLabel:  { fontSize: 11, fontFamily: "Inter_400Regular" },
  priceValue:  { fontSize: 18, fontFamily: "Inter_700Bold" },
  escrowChip:  { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EDE9FE", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  escrowText:  { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#5B4FE8" },
  actionBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 12, borderRadius: 12 },
  actionBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "center" },
  rejectedBanner:  { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#FEF2F2", padding: 10, borderRadius: 10 },
  rejectedText:    { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#EF4444" },
  deliveredBanner: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#D1FAE5", padding: 10, borderRadius: 10 },
  deliveredText:   { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#059669" },
});

// ─── History response type ─────────────────────────────────────────────────────
interface HistoryData {
  active:    BookingItem[];
  completed: BookingItem[];
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function ServiceHistoryScreen() {
  const insets      = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C           = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { user, apiRequest } = useAuth();
  const [tab, setTab]           = useState<"active" | "completed">("active");
  const [refreshing, setRefreshing] = useState(false);

  const isProvider = user?.role === "provider";

  const historyQuery = useQuery({
    queryKey: ["serviceHistory"],
    queryFn: async (): Promise<HistoryData> => {
      const res = await apiRequest("/services/my-history");
      if (!res.ok) throw new Error("Failed to load history");
      return res.json();
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await historyQuery.refetch(); } finally { setRefreshing(false); }
  }, [historyQuery]);

  const rawActive    = historyQuery.data?.active    ?? [];
  const rawCompleted = historyQuery.data?.completed ?? [];

  // Students only see their own bookings (booker perspective).
  // Providers see both: lister (jobs they do) and booker (services they bought).
  const active    = isProvider ? rawActive    : rawActive.filter(b => b._myPerspective === "booker");
  const completed = isProvider ? rawCompleted : rawCompleted.filter(b => b._myPerspective === "booker");

  const activeAsLister = active.filter(b => b._myPerspective === "lister");
  const activeAsBooker = active.filter(b => b._myPerspective === "booker");

  function renderEmpty(msg: string) {
    return (
      <View style={[S.empty, { borderColor: C.border }]}>
        <Feather name="inbox" size={36} color={C.textTertiary} style={{ opacity: 0.5 }} />
        <Text style={[S.emptyText, { color: C.textSecondary }]}>{msg}</Text>
      </View>
    );
  }

  function renderCard(b: BookingItem) {
    return <BookingCard key={b.id} booking={b} C={C} />;
  }

  function renderActiveContent() {
    if (historyQuery.isLoading) return <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />;
    if (active.length === 0)    return renderEmpty("No active jobs yet.\nBook a service to get started.");

    if (isProvider) {
      return (
        <>
          {activeAsLister.length > 0 && (
            <View>
              <View style={[S.groupHeader, { borderColor: C.border }]}>
                <Feather name="briefcase" size={13} color="#5B4FE8" />
                <Text style={[S.groupTitle, { color: C.text }]}>Jobs I&apos;m Doing</Text>
                <View style={[S.groupBadge, { backgroundColor: "#EDE9FE" }]}>
                  <Text style={[S.groupBadgeText, { color: "#5B4FE8" }]}>{activeAsLister.length}</Text>
                </View>
              </View>
              {activeAsLister.map(renderCard)}
            </View>
          )}
          {activeAsBooker.length > 0 && (
            <View style={{ marginTop: activeAsLister.length > 0 ? 8 : 0 }}>
              <View style={[S.groupHeader, { borderColor: C.border }]}>
                <Feather name="shopping-bag" size={13} color="#F59E0B" />
                <Text style={[S.groupTitle, { color: C.text }]}>My Own Bookings</Text>
                <View style={[S.groupBadge, { backgroundColor: "#FEF3C7" }]}>
                  <Text style={[S.groupBadgeText, { color: "#D97706" }]}>{activeAsBooker.length}</Text>
                </View>
              </View>
              {activeAsBooker.map(renderCard)}
            </View>
          )}
          {activeAsLister.length === 0 && activeAsBooker.length === 0 && renderEmpty("No active jobs.")}
        </>
      );
    }

    return <>{active.map(renderCard)}</>;
  }

  function renderCompletedContent() {
    if (historyQuery.isLoading) return <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />;
    if (completed.length === 0) return renderEmpty("No completed jobs yet.");
    return <>{completed.map(renderCard)}</>;
  }

  return (
    <View style={[S.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[S.header, {
        paddingTop: isWeb ? 56 : insets.top + 12,
        backgroundColor: C.surface,
        borderBottomColor: C.border,
      }]}>
        <Pressable style={S.iconBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={C.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[S.headerTitle, { color: C.text }]}>Your Activity</Text>
          <Text style={[S.headerSub, { color: C.textSecondary }]}>
            {active.length} active · {completed.length} completed
          </Text>
        </View>
        <Pressable style={S.iconBtn} onPress={onRefresh}>
          <Feather name="refresh-cw" size={16} color={C.textSecondary} />
        </Pressable>
      </View>

      {/* Tab bar */}
      <View style={[S.tabBar, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        {(["active", "completed"] as const).map(t => {
          const on  = tab === t;
          const cnt = t === "active" ? active.length : completed.length;
          return (
            <Pressable key={t} style={[S.tabItem, on && S.tabItemOn]} onPress={() => setTab(t)}>
              <Text style={[S.tabText, { color: on ? "#5B4FE8" : C.textSecondary }, on && S.tabTextOn]}>
                {t === "active" ? "Active Jobs" : "Completed Jobs"}
              </Text>
              {cnt > 0 && (
                <View style={[S.tabBadge, { backgroundColor: on ? "#5B4FE8" : C.border }]}>
                  <Text style={[S.tabBadgeText, { color: on ? "#fff" : C.textSecondary }]}>{cnt}</Text>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
      >
        {tab === "active" ? renderActiveContent() : renderCompletedContent()}
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container:    { flex: 1 },
  header:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5, gap: 10 },
  headerTitle:  { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerSub:    { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  iconBtn:      { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  tabBar:       { flexDirection: "row", borderBottomWidth: 0.5, paddingHorizontal: 16 },
  tabItem:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabItemOn:    { borderBottomColor: "#5B4FE8" },
  tabText:      { fontSize: 14, fontFamily: "Inter_500Medium" },
  tabTextOn:    { fontFamily: "Inter_700Bold" },
  tabBadge:     { minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  tabBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  content:      { padding: 14, gap: 10, paddingBottom: 100 },
  groupHeader:  { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8, paddingBottom: 8, borderBottomWidth: 0.5 },
  groupTitle:   { fontSize: 13, fontFamily: "Inter_700Bold", flex: 1 },
  groupBadge:   { minWidth: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  groupBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  empty:        { alignItems: "center", paddingVertical: 60, gap: 12, borderWidth: 0.5, borderRadius: 16, borderStyle: "dashed", marginTop: 8 },
  emptyText:    { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
});
