import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  useColorScheme, ActivityIndicator, Alert, Modal, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", icon: "smartphone" },
  { id: "card", label: "Card", icon: "credit-card" },
  { id: "netbanking", label: "Net Banking", icon: "globe" },
];

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

function TransactionItem({ txn, C }: any) {
  const isCredit = txn.type === "credit";
  return (
    <View style={[styles.txnItem, { borderBottomColor: C.borderLight }]}>
      <View style={[styles.txnIcon, { backgroundColor: isCredit ? C.successLight : C.errorLight }]}>
        <Feather name={isCredit ? "arrow-down-left" : "arrow-up-right"} size={18} color={isCredit ? C.success : C.error} />
      </View>
      <View style={styles.txnInfo}>
        <Text style={[styles.txnDesc, { color: C.text, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
          {txn.description}
        </Text>
        <Text style={[styles.txnDate, { color: C.textTertiary, fontFamily: "Inter_400Regular" }]}>
          {new Date(txn.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </Text>
      </View>
      <View style={styles.txnAmount}>
        <Text style={[styles.txnAmountText, { color: isCredit ? C.success : C.error, fontFamily: "Inter_700Bold" }]}>
          {isCredit ? "+" : "-"}₹{parseFloat(txn.amount).toFixed(2)}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: txn.status === "completed" ? C.successLight : C.warningLight }]}>
          <Text style={[styles.statusPillText, { color: txn.status === "completed" ? C.success : C.warning, fontFamily: "Inter_500Medium" }]}>
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
  const isWeb = Platform.OS === "web";
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("upi");

  const walletQuery = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const res = await apiRequest("/wallet");
      return res.json();
    },
  });

  const txnQuery = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const res = await apiRequest("/wallet/transactions");
      return res.json() as Promise<{ transactions: any[] }>;
    },
  });

  const addMoneyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/wallet/add-money", {
        method: "POST",
        body: JSON.stringify({ amount: parseFloat(amount), method }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setShowAddMoney(false);
      setAmount("");
      Alert.alert("Success", `₹${amount} added to your wallet!`);
    },
    onError: (err: any) => Alert.alert("Failed", err.message),
  });

  const wallet = walletQuery.data;
  const transactions = txnQuery.data?.transactions || [];

  if (walletQuery.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 8, backgroundColor: C.background, borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: C.text, fontFamily: "Inter_700Bold" }]}>Wallet</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: isWeb ? 34 + 84 : 100 }} showsVerticalScrollIndicator={false}>
        {/* Balance Card */}
        <View style={[styles.balanceCard, { backgroundColor: C.primary }]}>
          <View style={styles.balanceTop}>
            <Text style={[styles.balanceLabel, { fontFamily: "Inter_400Regular" }]}>Total Balance</Text>
            <View style={styles.walletBadge}>
              <Feather name="credit-card" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={[styles.walletBadgeText, { fontFamily: "Inter_500Medium" }]}>INR</Text>
            </View>
          </View>
          <Text style={[styles.balance, { fontFamily: "Inter_700Bold" }]}>
            ₹{parseFloat(wallet?.balance || "0").toFixed(2)}
          </Text>
          <Text style={[styles.lastUpdated, { fontFamily: "Inter_400Regular" }]}>
            Last updated {wallet ? new Date(wallet.updatedAt).toLocaleDateString("en-IN") : "—"}
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Pressable
            style={[styles.quickAction, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => setShowAddMoney(true)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: C.successLight }]}>
              <Feather name="plus-circle" size={22} color={C.success} />
            </View>
            <Text style={[styles.quickActionText, { color: C.text, fontFamily: "Inter_500Medium" }]}>Add Money</Text>
          </Pressable>
          <Pressable style={[styles.quickAction, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[styles.quickActionIcon, { backgroundColor: C.primaryLight }]}>
              <Feather name="send" size={22} color={C.primary} />
            </View>
            <Text style={[styles.quickActionText, { color: C.text, fontFamily: "Inter_500Medium" }]}>Transfer</Text>
          </Pressable>
          <Pressable style={[styles.quickAction, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[styles.quickActionIcon, { backgroundColor: C.warningLight }]}>
              <Feather name="download" size={22} color={C.warning} />
            </View>
            <Text style={[styles.quickActionText, { color: C.text, fontFamily: "Inter_500Medium" }]}>Withdraw</Text>
          </Pressable>
          <Pressable style={[styles.quickAction, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[styles.quickActionIcon, { backgroundColor: C.infoLight }]}>
              <Feather name="bar-chart-2" size={22} color={C.info} />
            </View>
            <Text style={[styles.quickActionText, { color: C.text, fontFamily: "Inter_500Medium" }]}>History</Text>
          </Pressable>
        </View>

        {/* Transactions */}
        <View style={styles.txnSection}>
          <Text style={[styles.sectionTitle, { color: C.text, fontFamily: "Inter_700Bold" }]}>Recent Transactions</Text>
          <View style={[styles.txnList, { backgroundColor: C.surface, borderColor: C.border }]}>
            {txnQuery.isLoading ? (
              <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <ActivityIndicator color={C.primary} />
              </View>
            ) : transactions.length === 0 ? (
              <View style={styles.emptyTxn}>
                <Feather name="inbox" size={36} color={C.textTertiary} />
                <Text style={[styles.emptyTxnText, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  No transactions yet
                </Text>
              </View>
            ) : (
              transactions.map(txn => <TransactionItem key={txn.id} txn={txn} C={C} />)
            )}
          </View>
        </View>
      </ScrollView>

      {/* Add Money Modal */}
      <Modal visible={showAddMoney} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: C.surface }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text, fontFamily: "Inter_700Bold" }]}>Add Money</Text>
              <Pressable onPress={() => setShowAddMoney(false)}>
                <Feather name="x" size={22} color={C.text} />
              </Pressable>
            </View>

            <Text style={[styles.modalLabel, { color: C.textSecondary, fontFamily: "Inter_500Medium" }]}>Amount</Text>
            <View style={[styles.amountInput, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
              <Text style={[styles.rupeeSymbol, { color: C.text, fontFamily: "Inter_700Bold" }]}>₹</Text>
              <TextInput
                style={[styles.amountInputText, { color: C.text, fontFamily: "Inter_700Bold" }]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={C.textTertiary}
              />
            </View>

            <View style={styles.quickAmounts}>
              {QUICK_AMOUNTS.map(qa => (
                <Pressable
                  key={qa}
                  style={[styles.quickAmountBtn, { borderColor: C.border, backgroundColor: amount === qa.toString() ? C.primaryLight : C.backgroundSecondary }]}
                  onPress={() => setAmount(qa.toString())}
                >
                  <Text style={[styles.quickAmountText, { color: amount === qa.toString() ? C.primary : C.text, fontFamily: "Inter_500Medium" }]}>
                    ₹{qa}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: C.textSecondary, fontFamily: "Inter_500Medium" }]}>Payment Method</Text>
            <View style={styles.methodsRow}>
              {PAYMENT_METHODS.map(m => (
                <Pressable
                  key={m.id}
                  style={[styles.methodBtn, { borderColor: method === m.id ? C.primary : C.border, backgroundColor: method === m.id ? C.primaryLight : C.backgroundSecondary }]}
                  onPress={() => setMethod(m.id)}
                >
                  <Feather name={m.icon as any} size={16} color={method === m.id ? C.primary : C.textSecondary} />
                  <Text style={[styles.methodLabel, { color: method === m.id ? C.primary : C.textSecondary, fontFamily: "Inter_500Medium" }]}>
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[styles.addBtn, { backgroundColor: C.primary }, addMoneyMutation.isPending && { opacity: 0.7 }]}
              onPress={() => addMoneyMutation.mutate()}
              disabled={addMoneyMutation.isPending || !amount}
            >
              {addMoneyMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.addBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                  Add ₹{amount || "0"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
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
  balanceCard: { margin: 16, borderRadius: 24, padding: 24 },
  balanceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  balanceLabel: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
  walletBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  walletBadgeText: { color: "rgba(255,255,255,0.9)", fontSize: 12 },
  balance: { color: "#fff", fontSize: 40, marginBottom: 8 },
  lastUpdated: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  quickActions: { flexDirection: "row", paddingHorizontal: 12, gap: 10, marginBottom: 24 },
  quickAction: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 16, borderWidth: 0.5, gap: 8 },
  quickActionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  quickActionText: { fontSize: 11 },
  txnSection: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, marginBottom: 14 },
  txnList: { borderRadius: 16, borderWidth: 0.5, overflow: "hidden" },
  txnItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 0.5 },
  txnIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  txnInfo: { flex: 1 },
  txnDesc: { fontSize: 14, marginBottom: 3 },
  txnDate: { fontSize: 11 },
  txnAmount: { alignItems: "flex-end", gap: 4 },
  txnAmountText: { fontSize: 16 },
  statusPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusPillText: { fontSize: 10 },
  emptyTxn: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyTxnText: { fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: "#ccc", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20 },
  modalLabel: { fontSize: 13, marginBottom: 8, letterSpacing: 0.3 },
  amountInput: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  rupeeSymbol: { fontSize: 28 },
  amountInputText: { flex: 1, fontSize: 28 },
  quickAmounts: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  quickAmountBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  quickAmountText: { fontSize: 13 },
  methodsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  methodBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  methodLabel: { fontSize: 12 },
  addBtn: { paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  addBtnText: { color: "#fff", fontSize: 16 },
});
