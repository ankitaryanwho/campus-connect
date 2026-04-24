import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  useColorScheme,
  Platform,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

const isWeb = Platform.OS === "web";

type Period = "today" | "yesterday" | "thisWeek" | "allTime";

const PERIOD_TABS: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "thisWeek", label: "This Week" },
  { key: "allTime", label: "All Time" },
];

const ORDER_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  delivery: { label: "Delivery", icon: "truck", color: "#F59E0B" },
  booking: { label: "Service Booking", icon: "briefcase", color: "#5B4FE8" },
};

type EarningTxn = {
  id: string;
  amount: string | number;
  description: string;
  orderId: string | null;
  orderType: string | null;
  createdAt: string | Date | null;
};

type EarningsResponse = {
  today: number;
  yesterday: number;
  thisWeek: number;
  allTime: number;
  total: number;
  orders: number;
  history: EarningTxn[];
};

function formatAmount(n: number | string): string {
  const num = typeof n === "string" ? parseFloat(n) : n || 0;
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatDateHeading(d: Date, today: Date, yesterday: Date): string {
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { user, apiRequest } = useAuth();

  const [period, setPeriod] = useState<Period>("today");

  const earningsQuery = useQuery<EarningsResponse>({
    queryKey: ["earnings"],
    queryFn: async () => {
      const res = await apiRequest("/services/my-earnings");
      if (!res.ok)
        return { today: 0, yesterday: 0, thisWeek: 0, allTime: 0, total: 0, orders: 0, history: [] };
      return res.json();
    },
    enabled: !!user?.id,
  });

  const data = earningsQuery.data;

  const periodAmount = useMemo(() => {
    if (!data) return 0;
    return data[period] ?? 0;
  }, [data, period]);

  // Filter & group history rows for the selected period
  const grouped = useMemo(() => {
    if (!data?.history?.length) return [] as { dateKey: string; date: Date; total: number; rows: EarningTxn[] }[];

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    const dayOfWeek = weekStart.getDay();
    const offsetToMonday = (dayOfWeek + 6) % 7;
    weekStart.setDate(weekStart.getDate() - offsetToMonday);

    const inPeriod = (d: Date) => {
      if (period === "today") return d >= todayStart;
      if (period === "yesterday") return d >= yesterdayStart && d < todayStart;
      if (period === "thisWeek") return d >= weekStart;
      return true; // allTime
    };

    const buckets = new Map<string, { date: Date; total: number; rows: EarningTxn[] }>();
    for (const t of data.history) {
      if (!t.createdAt) continue;
      const d = new Date(t.createdAt);
      if (isNaN(d.getTime())) continue;
      if (!inPeriod(d)) continue;
      const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
      const key = dayStart.toISOString();
      if (!buckets.has(key)) buckets.set(key, { date: dayStart, total: 0, rows: [] });
      const bucket = buckets.get(key)!;
      bucket.rows.push(t);
      bucket.total += parseFloat((t.amount as unknown as string) || "0");
    }
    return Array.from(buckets.entries())
      .map(([dateKey, v]) => ({ dateKey, ...v }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [data, period]);

  const todayRef = new Date(); todayRef.setHours(0, 0, 0, 0);
  const yesterdayRef = new Date(todayRef); yesterdayRef.setDate(yesterdayRef.getDate() - 1);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: isWeb ? 20 : insets.top + 10, borderBottomColor: C.border }]}>
        <TouchableOpacity
          style={[styles.topBtn, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: C.text }]}>Earnings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={earningsQuery.isFetching && !earningsQuery.isLoading}
            onRefresh={() => earningsQuery.refetch()}
            tintColor={C.primary}
          />
        }
      >
        {/* Hero: total for selected period */}
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={["#0F0C29", "#302B63", "#24243E"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={[styles.heroCircle, { top: -40, right: -30 }]} />
            <View style={[styles.heroCircle, { bottom: -50, left: -20, width: 140, height: 140, borderRadius: 70 }]} />

            <Text style={styles.heroLabel}>
              {PERIOD_TABS.find((p) => p.key === period)?.label} Earnings
            </Text>
            {earningsQuery.isLoading ? (
              <ActivityIndicator color="#fff" style={{ marginVertical: 12, alignSelf: "flex-start" }} />
            ) : (
              <Text style={styles.heroAmount}>₹{formatAmount(periodAmount)}</Text>
            )}

            {/* Quick stats */}
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{data?.orders ?? 0}</Text>
                <Text style={styles.heroStatLabel}>Total Orders</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>₹{formatAmount(data?.allTime ?? 0)}</Text>
                <Text style={styles.heroStatLabel}>All Time</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Period Tabs */}
        <View style={styles.tabsRow}>
          {PERIOD_TABS.map((t) => {
            const active = period === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.tab,
                  {
                    backgroundColor: active ? C.primary : C.surface,
                    borderColor: active ? C.primary : C.border,
                  },
                ]}
                onPress={() => setPeriod(t.key)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: active ? "#fff" : C.textSecondary },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Period summary tiles */}
        <View style={styles.summaryRow}>
          <SummaryTile label="Today" value={data?.today ?? 0} icon="sun" color="#F59E0B" C={C} loading={earningsQuery.isLoading} />
          <SummaryTile label="Yesterday" value={data?.yesterday ?? 0} icon="clock" color="#6366F1" C={C} loading={earningsQuery.isLoading} />
        </View>
        <View style={styles.summaryRow}>
          <SummaryTile label="This Week" value={data?.thisWeek ?? 0} icon="calendar" color="#10B981" C={C} loading={earningsQuery.isLoading} />
          <SummaryTile label="All Time" value={data?.allTime ?? 0} icon="trending-up" color="#EF4444" C={C} loading={earningsQuery.isLoading} />
        </View>

        {/* History */}
        <View style={styles.historySection}>
          <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>EARNINGS HISTORY</Text>

          {earningsQuery.isLoading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 30 }} />
          ) : grouped.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={[styles.emptyIconWrap, { backgroundColor: C.primaryLight }]}>
                <Feather name="inbox" size={28} color={C.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: C.text }]}>
                No earnings {period === "allTime" ? "yet" : `for ${PERIOD_TABS.find(p => p.key === period)?.label.toLowerCase()}`}
              </Text>
              <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>
                Complete service orders and they will show up here.
              </Text>
            </View>
          ) : (
            grouped.map((g) => (
              <View key={g.dateKey} style={styles.dayBlock}>
                <View style={styles.dayHeader}>
                  <Text style={[styles.dayHeading, { color: C.text }]}>
                    {formatDateHeading(g.date, todayRef, yesterdayRef)}
                  </Text>
                  <View style={[styles.dayTotalPill, { backgroundColor: "#10B98118" }]}>
                    <Feather name="arrow-down-left" size={11} color="#10B981" />
                    <Text style={styles.dayTotalText}>+₹{formatAmount(g.total)}</Text>
                  </View>
                </View>
                <View style={[styles.dayCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  {g.rows.map((t, idx) => {
                    const meta = ORDER_TYPE_META[t.orderType || ""] || {
                      label: "Service",
                      icon: "star",
                      color: C.primary,
                    };
                    const time = t.createdAt ? formatTime(new Date(t.createdAt)) : "";
                    return (
                      <View
                        key={t.id}
                        style={[
                          styles.txnRow,
                          idx < g.rows.length - 1 && {
                            borderBottomWidth: 0.5,
                            borderBottomColor: C.borderLight,
                          },
                        ]}
                      >
                        <View
                          style={[styles.txnIconWrap, { backgroundColor: meta.color + "18" }]}
                        >
                          <Feather name={meta.icon as any} size={16} color={meta.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.txnDesc, { color: C.text }]} numberOfLines={2}>
                            {t.description}
                          </Text>
                          <Text style={[styles.txnMeta, { color: C.textTertiary }]}>
                            {meta.label}
                            {time ? ` · ${time}` : ""}
                          </Text>
                        </View>
                        <Text style={styles.txnAmount}>+₹{formatAmount(t.amount)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function SummaryTile({
  label,
  value,
  icon,
  color,
  C,
  loading,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
  C: any;
  loading?: boolean;
}) {
  return (
    <View style={[styles.summaryTile, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={[styles.summaryIconWrap, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={14} color={color} />
      </View>
      <Text style={[styles.summaryLabel, { color: C.textSecondary }]}>{label}</Text>
      {loading ? (
        <ActivityIndicator color={color} style={{ marginTop: 4 }} />
      ) : (
        <Text style={[styles.summaryValue, { color: C.text }]}>₹{formatAmount(value)}</Text>
      )}
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
    borderBottomWidth: 0.5,
  },
  topBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },

  heroWrap: { paddingHorizontal: 16, paddingTop: 16 },
  heroCard: { borderRadius: 24, padding: 22, overflow: "hidden" },
  heroCircle: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  heroLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 6,
  },
  heroAmount: {
    color: "#fff",
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1.2,
    marginBottom: 18,
  },
  heroStatsRow: { flexDirection: "row", alignItems: "center" },
  heroStat: { flex: 1 },
  heroStatValue: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  heroStatLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginHorizontal: 14,
  },

  tabsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 18,
    flexWrap: "wrap",
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  summaryRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  summaryTile: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 0.5,
    padding: 14,
  },
  summaryIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  summaryLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  summaryValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
    letterSpacing: -0.3,
  },

  historySection: { paddingHorizontal: 16, marginTop: 24 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    marginBottom: 14,
  },

  emptyCard: {
    borderRadius: 18,
    borderWidth: 0.5,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },

  dayBlock: { marginBottom: 18 },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dayHeading: { fontSize: 14, fontFamily: "Inter_700Bold" },
  dayTotalPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dayTotalText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#10B981" },

  dayCard: { borderRadius: 16, borderWidth: 0.5, overflow: "hidden" },
  txnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  txnIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  txnDesc: { fontSize: 13, fontFamily: "Inter_500Medium" },
  txnMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  txnAmount: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#10B981" },
});
