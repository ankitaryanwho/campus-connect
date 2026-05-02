import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  useColorScheme, ActivityIndicator, Modal, Platform, TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

const isWeb = Platform.OS === "web";

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", icon: "smartphone", color: "#5B4FE8" },
  { id: "card", label: "Card", icon: "credit-card", color: "#F59E0B" },
  { id: "netbanking", label: "Net Banking", icon: "globe", color: "#10B981" },
];

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

const TXN_ICONS: Record<string, string> = {
  credit: "arrow-down-left",
  debit: "arrow-up-right",
  refund: "refresh-cw",
  earning: "trending-up",
  payment: "credit-card",
};

function formatAmount(amount: string | number): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(n)) return "0.00";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TransactionItem({ txn, C }: any) {
  const isCredit = txn.type === "credit" || txn.type === "refund" || txn.type === "earning";
  const iconName = TXN_ICONS[txn.type] || (isCredit ? "arrow-down-left" : "arrow-up-right");
  const iconColor = isCredit ? "#10B981" : "#EF4444";
  const iconBg = isCredit ? (C.successLight) : (C.errorLight);

  return (
    <View style={[styles.txnRow, { borderBottomColor: C.borderLight }]}>
      <View style={[styles.txnIconWrap, { backgroundColor: iconBg }]}>
        <Feather name={iconName as any} size={18} color={iconColor} />
      </View>
      <View style={styles.txnInfo}>
        <Text style={[styles.txnDesc, { color: C.text }]} numberOfLines={1}>{txn.description}</Text>
        <Text style={[styles.txnDate, { color: C.textTertiary }]}>
          {new Date(txn.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Text style={[styles.txnAmount, { color: isCredit ? "#10B981" : "#EF4444" }]}>
          {isCredit ? "+" : "-"}₹{formatAmount(txn.amount)}
        </Text>
        <View style={[styles.txnStatus, { backgroundColor: txn.status === "completed" ? C.successLight : C.warningLight }]}>
          <Text style={[styles.txnStatusText, { color: txn.status === "completed" ? "#10B981" : "#F59E0B" }]}>
            {txn.status}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { apiRequest } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("upi");
  const [hasLoaded, setHasLoaded] = useState(false);

  useFocusEffect(useCallback(() => { setHasLoaded(true); }, []));

  const walletQuery = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const res = await apiRequest("/wallet");
      return res.json();
    },
    enabled: hasLoaded,
  });

  const txnQuery = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const res = await apiRequest("/wallet/transactions");
      return res.json() as Promise<{ transactions: any[] }>;
    },
    enabled: hasLoaded,
  });

  const addMoneyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/wallet/add-money", {
        method: "POST",
        body: JSON.stringify({ amount: parseFloat(amount), method }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add money");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      showToast(`₹${amount} added to your wallet!`, "success");
      setShowAddMoney(false);
      setAmount("");
    },
    onError: (e: any) => showToast(e.message, "error"),
  });

  const balance = walletQuery.data?.balance || "0.00";
  const txns = txnQuery.data?.transactions || [];
  const totalCredits = txns.filter((t: any) => t.type === "credit" || t.type === "earning").reduce((s: number, t: any) => s + parseFloat(t.amount || "0"), 0);
  const totalDebits = txns.filter((t: any) => t.type !== "credit" && t.type !== "earning").reduce((s: number, t: any) => s + parseFloat(t.amount || "0"), 0);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 10, borderBottomColor: C.border, backgroundColor: C.background }]}>
        <View>
          <Text style={[styles.headerTitle, { color: C.text }]}>Wallet</Text>
          <Text style={[styles.headerSub, { color: C.textSecondary }]}>Manage your campus payments</Text>
        </View>
        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: C.backgroundSecondary }]}>
          <Feather name="clock" size={18} color={C.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: isWeb ? 120 : 110 }} showsVerticalScrollIndicator={false}>
        {/* Balance card */}
        <LinearGradient
          colors={["#5B4FE8", "#7B73F0", "#9F94F8"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          {/* Decorative circles */}
          <View style={[styles.cardCircle, { top: -30, right: -20, opacity: 0.15 }]} />
          <View style={[styles.cardCircle, { bottom: -40, left: 20, opacity: 0.1, width: 120, height: 120, borderRadius: 60 }]} />

          <View style={styles.cardHeader}>
            <View style={styles.cardChip}>
              <Feather name="shield" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.cardChipText}>Secured</Text>
            </View>
            <View style={[styles.cardWifi]}>
              <Feather name="wifi" size={16} color="rgba(255,255,255,0.6)" />
            </View>
          </View>

          <Text style={styles.balanceLabel}>Available Balance</Text>
          {walletQuery.isLoading ? (
            <ActivityIndicator color="#fff" size="large" style={{ marginVertical: 8 }} />
          ) : (
            <Text style={styles.balanceAmount}>₹{formatAmount(balance)}</Text>
          )}

          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.cardFooterLabel}>Total In</Text>
              <Text style={styles.cardFooterValue}>₹{formatAmount(totalCredits)}</Text>
            </View>
            <View style={styles.cardFooterDivider} />
            <View>
              <Text style={styles.cardFooterLabel}>Total Out</Text>
              <Text style={styles.cardFooterValue}>₹{formatAmount(totalDebits)}</Text>
            </View>
            <View style={[styles.cardFooterDivider]} />
            <View>
              <Text style={styles.cardFooterLabel}>Transactions</Text>
              <Text style={styles.cardFooterValue}>{txns.length}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          {[
            { icon: "plus-circle", label: "Add Money", color: "#5B4FE8", onPress: () => setShowAddMoney(true) },
            { icon: "send", label: "Send", color: "#10B981", onPress: () => {} },
            { icon: "download", label: "Request", color: "#F59E0B", onPress: () => {} },
            { icon: "bar-chart-2", label: "Analytics", color: "#EF4444", onPress: () => {} },
          ].map(({ icon, label, color, onPress }) => (
            <TouchableOpacity key={label} style={[styles.actionTile, { backgroundColor: C.surface, borderColor: C.border }]} onPress={onPress} activeOpacity={0.8}>
              <View style={[styles.actionTileIcon, { backgroundColor: color + "18" }]}>
                <Feather name={icon as any} size={20} color={color} />
              </View>
              <Text style={[styles.actionTileLabel, { color: C.text }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Transaction History</Text>
            {txns.length > 0 && (
              <View style={[styles.txnCount, { backgroundColor: C.primaryLight }]}>
                <Text style={[styles.txnCountText, { color: C.primary }]}>{txns.length}</Text>
              </View>
            )}
          </View>

          <View style={[styles.txnCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            {txnQuery.isLoading ? (
              <ActivityIndicator color={C.primary} style={{ paddingVertical: 30 }} />
            ) : txns.length === 0 ? (
              <View style={styles.emptyTxn}>
                <LinearGradient colors={[C.primaryLight, "transparent"]} style={styles.emptyTxnInner}>
                  <Feather name="credit-card" size={40} color={C.primary} style={{ opacity: 0.5 }} />
                  <Text style={[styles.emptyTxnText, { color: C.textSecondary }]}>No transactions yet</Text>
                  <Text style={[styles.emptyTxnSub, { color: C.textTertiary }]}>Add money to get started</Text>
                </LinearGradient>
              </View>
            ) : (
              txns.map((txn: any) => <TransactionItem key={txn.id} txn={txn} C={C} />)
            )}
          </View>
        </View>
      </ScrollView>

      {/* Add Money Modal */}
      <Modal visible={showAddMoney} animationType="slide" transparent onRequestClose={() => setShowAddMoney(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddMoney(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: C.surface }]} onPress={() => {}}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: C.text }]}>Add Money</Text>
              <TouchableOpacity onPress={() => setShowAddMoney(false)}>
                <Feather name="x" size={22} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Amount Input */}
            <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Amount (₹)</Text>
            <View style={[styles.amountInputWrap, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
              <Text style={[styles.rupeeSign, { color: C.primary }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: C.text }]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={C.textTertiary}
              />
            </View>

            {/* Quick amounts */}
            <View style={styles.quickAmounts}>
              {QUICK_AMOUNTS.map(a => (
                <TouchableOpacity
                  key={a}
                  style={[styles.quickChip, { borderColor: amount === String(a) ? C.primary : C.border, backgroundColor: amount === String(a) ? C.primaryLight : "transparent" }]}
                  onPress={() => setAmount(String(a))}
                >
                  <Text style={[styles.quickChipText, { color: amount === String(a) ? C.primary : C.textSecondary }]}>₹{a}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Payment methods */}
            <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Payment Method</Text>
            <View style={styles.methodsRow}>
              {PAYMENT_METHODS.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.methodCard, { borderColor: method === m.id ? m.color : C.border, backgroundColor: method === m.id ? m.color + "15" : C.backgroundSecondary }]}
                  onPress={() => setMethod(m.id)}
                >
                  <Feather name={m.icon as any} size={18} color={method === m.id ? m.color : C.textSecondary} />
                  <Text style={[styles.methodLabel, { color: method === m.id ? m.color : C.textSecondary }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.addBtn, { opacity: (!amount || parseFloat(amount) <= 0 || addMoneyMutation.isPending) ? 0.6 : 1 }]}
              onPress={() => addMoneyMutation.mutate()}
              disabled={!amount || parseFloat(amount) <= 0 || addMoneyMutation.isPending}
              activeOpacity={0.85}
            >
              <LinearGradient colors={["#5B4FE8", "#7B73F0"]} style={styles.addBtnGradient}>
                {addMoneyMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="plus" size={18} color="#fff" />
                    <Text style={styles.addBtnText}>Add ₹{amount || "0"}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 0.5, borderColor: "#E7E5E4" },
  balanceCard: { margin: 16, borderRadius: 24, padding: 24, overflow: "hidden", minHeight: 200 },
  cardCircle: { position: "absolute", width: 150, height: 150, borderRadius: 75, backgroundColor: "#fff" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  cardChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  cardChipText: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardWifi: {},
  balanceLabel: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 4 },
  balanceAmount: { color: "#fff", fontSize: 40, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  cardFooter: { flexDirection: "row", alignItems: "center", marginTop: 24, gap: 0 },
  cardFooterLabel: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 3 },
  cardFooterValue: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cardFooterDivider: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 20 },
  actionsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  actionTile: { flex: 1, borderRadius: 16, borderWidth: 0.5, padding: 14, alignItems: "center", gap: 8 },
  actionTileIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionTileLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  txnCount: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  txnCountText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  txnCard: { borderRadius: 20, borderWidth: 0.5, overflow: "hidden" },
  txnRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 0.5 },
  txnIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  txnInfo: { flex: 1 },
  txnDesc: { fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 3 },
  txnDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  txnAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  txnStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  txnStatusText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  emptyTxn: { overflow: "hidden", borderRadius: 20 },
  emptyTxnInner: { alignItems: "center", paddingVertical: 50, gap: 10 },
  emptyTxnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptyTxnSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 48 },
  modalHandle: { width: 40, height: 4, backgroundColor: "#ccc", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  amountInputWrap: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 14 },
  rupeeSign: { fontSize: 22, fontFamily: "Inter_700Bold" },
  amountInput: { flex: 1, fontSize: 24, fontFamily: "Inter_700Bold" },
  quickAmounts: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  quickChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  quickChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  methodsRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  methodCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center", gap: 6 },
  methodLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  addBtn: { borderRadius: 16, overflow: "hidden" },
  addBtnGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  addBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
