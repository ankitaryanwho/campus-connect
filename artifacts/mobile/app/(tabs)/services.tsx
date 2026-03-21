import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Modal,
  useColorScheme, FlatList, ActivityIndicator, Platform,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

const SERVICE_TABS = [
  { id: "assignments", label: "Assignments", icon: "file-text", color: "#5B4FE8" },
  { id: "coaching", label: "Coaching", icon: "user-check", color: "#10B981" },
  { id: "deliveries", label: "Delivery", icon: "package", color: "#F59E0B" },
  { id: "tasks", label: "Tasks", icon: "check-square", color: "#EF4444" },
];

const DELIVERY_MODES = ["pdf", "zip", "physical"];
const SESSION_TYPES = ["one_on_one", "group"];
const TASK_CATEGORIES = ["design", "development", "content", "video", "research", "other"];

function ServiceCard({ item, type, C, onAction, currentUserId, isPending }: any) {
  const isOwner = item.poster?.id === currentUserId || item.mentor?.id === currentUserId || item.requester?.id === currentUserId;

  const statusColor = (s: string) => {
    if (s === "open" || s === "available" || s === "pending") return C.success;
    if (s === "accepted" || s === "booked" || s === "in_progress") return C.warning;
    if (s === "completed" || s === "delivered") return C.primary;
    return C.textTertiary;
  };

  const actionLabel = () => {
    if (isOwner) return null;
    if (type === "assignments" && item.status === "open") return "Accept";
    if (type === "coaching" && item.status === "available") return "Book";
    if (type === "deliveries" && item.status === "pending") return "Accept";
    if (type === "tasks" && item.status === "open") return "Apply";
    return null;
  };

  const price = parseFloat(item.price || item.budget || item.fee || 0);
  const poster = item.poster || item.mentor || item.requester;
  const label = actionLabel();

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: C.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={2}>
            {item.title || item.item}
          </Text>
          {poster && (
            <Text style={[styles.cardAuthor, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>
              by {poster.name} · {poster.college || poster.program || ""}
            </Text>
          )}
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <Text style={[styles.cardPrice, { color: C.primary, fontFamily: "Inter_700Bold" }]}>₹{price.toFixed(0)}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor(item.status) + "20" }]}>
            <Text style={[styles.badgeText, { color: statusColor(item.status), fontFamily: "Inter_500Medium" }]}>{item.status}</Text>
          </View>
        </View>
      </View>

      {item.description && (
        <Text style={[styles.cardDesc, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={styles.tagsRow}>
        {item.subject && (
          <View style={[styles.tag, { backgroundColor: C.primaryLight }]}>
            <Text style={[styles.tagText, { color: C.primary }]}>{item.subject}</Text>
          </View>
        )}
        {item.category && (
          <View style={[styles.tag, { backgroundColor: C.backgroundSecondary }]}>
            <Feather name="tag" size={10} color={C.textTertiary} />
            <Text style={[styles.tagText, { color: C.textSecondary }]}>{item.category}</Text>
          </View>
        )}
        {item.deliveryMode && (
          <View style={[styles.tag, { backgroundColor: C.infoLight }]}>
            <Feather name="box" size={10} color={C.info} />
            <Text style={[styles.tagText, { color: C.info }]}>{item.deliveryMode}</Text>
          </View>
        )}
        {item.sessionType && (
          <View style={[styles.tag, { backgroundColor: C.successLight }]}>
            <Feather name="users" size={10} color={C.success} />
            <Text style={[styles.tagText, { color: C.success }]}>{item.sessionType === "one_on_one" ? "1-on-1" : "Group"}</Text>
          </View>
        )}
        {item.pickupLocation && (
          <View style={[styles.tag, { backgroundColor: C.warningLight }]}>
            <Feather name="map-pin" size={10} color={C.warning} />
            <Text style={[styles.tagText, { color: C.warning }]}>{item.pickupLocation}</Text>
          </View>
        )}
      </View>

      {label && (
        <Pressable
          style={[styles.actionBtn, { backgroundColor: C.primary }, isPending && { opacity: 0.6 }]}
          onPress={() => onAction(item.id)}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[styles.actionBtnText, { fontFamily: "Inter_600SemiBold" }]}>{label}</Text>
          )}
        </Pressable>
      )}

      {isOwner && (
        <View style={[styles.ownerBadge, { backgroundColor: C.primaryLight }]}>
          <Feather name="star" size={11} color={C.primary} />
          <Text style={[styles.ownerBadgeText, { color: C.primary, fontFamily: "Inter_500Medium" }]}>Your listing</Text>
        </View>
      )}
    </View>
  );
}

function PostServiceModal({ visible, onClose, activeTab, C, apiRequest, queryClient, showToast }: any) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [subject, setSubject] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("pdf");
  const [sessionType, setSessionType] = useState("one_on_one");
  const [category, setCategory] = useState("design");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropLocation, setDropLocation] = useState("");
  const [item, setItem] = useState("");

  const reset = () => {
    setTitle(""); setDescription(""); setPrice(""); setSubject("");
    setDeliveryMode("pdf"); setSessionType("one_on_one"); setCategory("design");
    setPickupLocation(""); setDropLocation(""); setItem("");
  };

  const endpointMap: Record<string, string> = {
    assignments: "/services/assignments",
    coaching: "/services/coaching",
    deliveries: "/services/deliveries",
    tasks: "/services/tasks",
  };

  const buildPayload = () => {
    switch (activeTab) {
      case "assignments": return { title, description, price: parseFloat(price), deliveryMode, subject };
      case "coaching": return { title, description, price: parseFloat(price), subject, sessionType, maxStudents: sessionType === "group" ? 20 : 1 };
      case "deliveries": return { pickupLocation, dropLocation, item, notes: description };
      case "tasks": return { title, description, budget: parseFloat(price), category };
      default: return {};
    }
  };

  const isValid = () => {
    if (activeTab === "deliveries") return pickupLocation.trim() && dropLocation.trim() && item.trim();
    return title.trim() && description.trim() && price.trim() && parseFloat(price) > 0;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(endpointMap[activeTab], {
        method: "POST",
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to post");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services", activeTab] });
      reset();
      onClose();
      showToast("Your listing is now live!", "success");
    },
    onError: (err: any) => showToast(err.message || "Failed to post listing", "error"),
  });

  const isWeb = Platform.OS === "web";

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: C.surface }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: C.text, fontFamily: "Inter_700Bold" }]}>
              Post {SERVICE_TABS.find(t => t.id === activeTab)?.label}
            </Text>
            <Pressable onPress={() => { reset(); onClose(); }}>
              <Feather name="x" size={22} color={C.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {activeTab === "deliveries" ? (
              <>
                <Field label="Pickup Location" value={pickupLocation} onChange={setPickupLocation} placeholder="e.g. Main Gate" C={C} icon="map-pin" />
                <Field label="Drop Location" value={dropLocation} onChange={setDropLocation} placeholder="e.g. Boys Hostel Block C" C={C} icon="map-pin" />
                <Field label="Item to Deliver" value={item} onChange={setItem} placeholder="e.g. Amazon package, books" C={C} icon="package" />
                <Field label="Notes (optional)" value={description} onChange={setDescription} placeholder="Any special instructions..." C={C} icon="file-text" multiline />
              </>
            ) : (
              <>
                <Field label="Title" value={title} onChange={setTitle} placeholder={activeTab === "tasks" ? "What do you need done?" : "Session/listing title"} C={C} icon="type" />
                <Field label="Description" value={description} onChange={setDescription} placeholder="Describe in detail..." C={C} icon="align-left" multiline />
                <Field label={activeTab === "tasks" ? "Budget (₹)" : "Price (₹)"} value={price} onChange={setPrice} placeholder="e.g. 299" C={C} icon="credit-card" keyboard="numeric" />

                {(activeTab === "assignments" || activeTab === "coaching") && (
                  <Field label="Subject" value={subject} onChange={setSubject} placeholder="e.g. DSA, DBMS, Marketing" C={C} icon="book" />
                )}

                {activeTab === "assignments" && (
                  <>
                    <Text style={[styles.sectionLabel, { color: C.textSecondary, fontFamily: "Inter_500Medium" }]}>Delivery Mode</Text>
                    <View style={styles.chipRow}>
                      {DELIVERY_MODES.map(m => (
                        <Pressable key={m} style={[styles.chip, { borderColor: C.border, backgroundColor: deliveryMode === m ? C.primary : C.backgroundSecondary }]} onPress={() => setDeliveryMode(m)}>
                          <Text style={[styles.chipText, { color: deliveryMode === m ? "#fff" : C.textSecondary, fontFamily: "Inter_500Medium" }]}>{m.toUpperCase()}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}

                {activeTab === "coaching" && (
                  <>
                    <Text style={[styles.sectionLabel, { color: C.textSecondary, fontFamily: "Inter_500Medium" }]}>Session Type</Text>
                    <View style={styles.chipRow}>
                      {SESSION_TYPES.map(t => (
                        <Pressable key={t} style={[styles.chip, { borderColor: C.border, backgroundColor: sessionType === t ? C.primary : C.backgroundSecondary }]} onPress={() => setSessionType(t)}>
                          <Text style={[styles.chipText, { color: sessionType === t ? "#fff" : C.textSecondary, fontFamily: "Inter_500Medium" }]}>{t === "one_on_one" ? "1-on-1" : "Group"}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}

                {activeTab === "tasks" && (
                  <>
                    <Text style={[styles.sectionLabel, { color: C.textSecondary, fontFamily: "Inter_500Medium" }]}>Category</Text>
                    <View style={styles.chipRow}>
                      {TASK_CATEGORIES.map(cat => (
                        <Pressable key={cat} style={[styles.chip, { borderColor: C.border, backgroundColor: category === cat ? C.primary : C.backgroundSecondary }]} onPress={() => setCategory(cat)}>
                          <Text style={[styles.chipText, { color: category === cat ? "#fff" : C.textSecondary, fontFamily: "Inter_500Medium" }]}>{cat}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}

            <Pressable
              style={[styles.submitBtn, { backgroundColor: C.primary }, (!isValid() || mutation.isPending) && { opacity: 0.5 }]}
              onPress={() => mutation.mutate()}
              disabled={!isValid() || mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.submitBtnText, { fontFamily: "Inter_600SemiBold" }]}>Post Listing</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, value, onChange, placeholder, C, icon, multiline, keyboard }: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[styles.fieldLabel, { color: C.textSecondary, fontFamily: "Inter_500Medium" }]}>{label}</Text>
      <View style={[styles.fieldInput, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
        <Feather name={icon} size={16} color={C.textTertiary} />
        <TextInput
          style={[styles.fieldText, { color: C.text, fontFamily: "Inter_400Regular" }, multiline && { minHeight: 70, textAlignVertical: "top" }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={C.textTertiary}
          multiline={multiline}
          keyboardType={keyboard || "default"}
        />
      </View>
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
  const [showPostModal, setShowPostModal] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { showToast } = useToast();
  const isWeb = Platform.OS === "web";

  const endpointMap: Record<string, string> = {
    assignments: "/services/assignments",
    coaching: "/services/coaching",
    deliveries: "/services/deliveries",
    tasks: "/services/tasks",
  };

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["services", activeTab],
    queryFn: async () => {
      const res = await apiRequest(endpointMap[activeTab]);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const actionMutation = useMutation({
    mutationFn: async (id: string) => {
      setPendingId(id);
      const actionMap: Record<string, string> = {
        assignments: "accept",
        coaching: "book",
        deliveries: "accept",
        tasks: "apply",
      };
      const res = await apiRequest(`${endpointMap[activeTab]}/${id}/${actionMap[activeTab]}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Action failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services", activeTab] });
      const msg = activeTab === "tasks" ? "Application submitted!" : activeTab === "coaching" ? "Session booked!" : "Accepted successfully!";
      showToast(msg, "success");
    },
    onError: (err: any) => showToast(err.message || "Action failed", "error"),
    onSettled: () => setPendingId(null),
  });

  const items = data?.assignments || data?.sessions || data?.deliveries || data?.tasks || [];
  const activeService = SERVICE_TABS.find(t => t.id === activeTab)!;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 8, backgroundColor: C.background, borderBottomColor: C.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: C.text, fontFamily: "Inter_700Bold" }]}>Services</Text>
          <Text style={[styles.headerSub, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {items.length} listing{items.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <Pressable
          style={[styles.addBtn, { backgroundColor: C.primary }]}
          onPress={() => setShowPostModal(true)}
        >
          <Feather name="plus" size={18} color="#fff" />
          <Text style={[styles.addBtnText, { fontFamily: "Inter_600SemiBold" }]}>Post</Text>
        </Pressable>
      </View>

      {/* Category Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
        {SERVICE_TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[styles.tab, active ? { backgroundColor: tab.color } : { backgroundColor: C.backgroundSecondary, borderColor: C.border, borderWidth: 1 }]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Feather name={tab.icon as any} size={15} color={active ? "#fff" : C.textSecondary} />
              <Text style={[styles.tabLabel, { color: active ? "#fff" : C.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={activeService.color} size="large" />
          <Text style={[styles.loadingText, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>Loading {activeService.label}...</Text>
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
              isPending={pendingId === item.id && actionMutation.isPending}
            />
          )}
          contentContainerStyle={{ padding: 12, paddingBottom: isWeb ? 34 + 84 : 100, gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: activeService.color + "15" }]}>
                <Feather name={activeService.icon as any} size={36} color={activeService.color} />
              </View>
              <Text style={[styles.emptyTitle, { color: C.text, fontFamily: "Inter_700Bold" }]}>No {activeService.label} yet</Text>
              <Text style={[styles.emptySubtitle, { color: C.textSecondary, fontFamily: "Inter_400Regular" }]}>
                Be the first to post a listing!
              </Text>
              <Pressable
                style={[styles.emptyBtn, { backgroundColor: activeService.color }]}
                onPress={() => setShowPostModal(true)}
              >
                <Feather name="plus" size={16} color="#fff" />
                <Text style={[styles.emptyBtnText, { fontFamily: "Inter_600SemiBold" }]}>Post {activeService.label}</Text>
              </Pressable>
            </View>
          }
        />
      )}

      <PostServiceModal
        visible={showPostModal}
        onClose={() => setShowPostModal(false)}
        activeTab={activeTab}
        C={C}
        apiRequest={apiRequest}
        queryClient={queryClient}
        showToast={showToast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 22 },
  headerSub: { fontSize: 12 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  addBtnText: { color: "#fff", fontSize: 14 },
  tabsRow: { paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  tabLabel: { fontSize: 13 },
  card: { borderRadius: 16, borderWidth: 0.5, padding: 14 },
  cardTop: { flexDirection: "row", gap: 12, marginBottom: 10 },
  cardTitle: { fontSize: 15, lineHeight: 20 },
  cardAuthor: { fontSize: 12, marginTop: 3 },
  cardPrice: { fontSize: 18 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11 },
  cardDesc: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  actionBtn: { paddingVertical: 11, borderRadius: 10, alignItems: "center", marginTop: 12 },
  actionBtnText: { color: "#fff", fontSize: 14 },
  ownerBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  ownerBadgeText: { fontSize: 11 },
  empty: { alignItems: "center", paddingTop: 50, gap: 12 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18 },
  emptySubtitle: { fontSize: 13 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, marginTop: 4 },
  emptyBtnText: { color: "#fff", fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: "85%" },
  modalHandle: { width: 40, height: 4, backgroundColor: "#ccc", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20 },
  sectionLabel: { fontSize: 13, marginBottom: 10, marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12 },
  fieldLabel: { fontSize: 13, marginBottom: 8 },
  fieldInput: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  fieldText: { flex: 1, fontSize: 15 },
  submitBtn: { paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 8, marginBottom: 20 },
  submitBtnText: { color: "#fff", fontSize: 16 },
});
