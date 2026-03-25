import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Modal,
  useColorScheme, FlatList, ActivityIndicator, Platform,
  TextInput, Linking, Animated, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_TABS = [
  { id: "deliveries", label: "Delivery", icon: "package", color: "#F59E0B" },
  { id: "assignments", label: "Assignments", icon: "file-text", color: "#5B4FE8" },
  { id: "certifications", label: "Certifications", icon: "award", color: "#10B981" },
  { id: "projects", label: "Projects", icon: "briefcase", color: "#6366F1" },
  { id: "tasks", label: "Tasks", icon: "check-square", color: "#EF4444" },
];

// ─── Status Tracking Steps ──────────────────────────────────────────────────

const ACADEMIC_STEPS = [
  { id: "booked", label: "Booking Confirmed", icon: "bookmark" },
  { id: "accepted", label: "Work Accepted by Provider", icon: "thumbs-up" },
  { id: "in_progress", label: "Work In Progress", icon: "edit-2" },
  { id: "completed", label: "Work Completed", icon: "check-circle" },
  { id: "delivered", label: "Delivered to Student", icon: "package" },
];

const DELIVERY_OUTLET_STEPS = [
  { id: "accepted", label: "Request Accepted", icon: "user-check" },
  { id: "reaching_pickup", label: "Heading to Outlet", icon: "navigation" },
  { id: "placed_order", label: "Order Placed at Outlet", icon: "shopping-bag" },
  { id: "collecting_order", label: "Collecting Order", icon: "clock" },
  { id: "reaching_drop", label: "On the Way to You", icon: "truck" },
  { id: "completed", label: "Arrived — Waiting to Hand Over", icon: "map-pin" },
  { id: "delivered", label: "Delivered!", icon: "gift" },
];

const DELIVERY_GATE_STEPS = [
  { id: "accepted", label: "Request Accepted", icon: "user-check" },
  { id: "reaching_pickup", label: "Heading to Gate", icon: "navigation" },
  { id: "reaching_drop", label: "On the Way to You", icon: "truck" },
  { id: "completed", label: "Arrived — Waiting to Hand Over", icon: "map-pin" },
  { id: "delivered", label: "Delivered!", icon: "gift" },
];

const PROGRAMS = ["BCA", "BTech", "MBA", "MTech", "BSc", "BCom", "BA", "Other"];
const TASK_CATEGORIES = ["design", "development", "content", "video", "research", "other"];

const CAT_META: Record<string, { label: string; emoji: string; accent: string; bg: string }> = {
  assignments:    { label: "Assignments",    emoji: "📝", accent: "#5B4FE8", bg: "#EDE9FE" },
  certifications: { label: "Certifications", emoji: "🏆", accent: "#10B981", bg: "#D1FAE5" },
  deliveries:     { label: "Delivery",       emoji: "🚀", accent: "#F59E0B", bg: "#FEF3C7" },
  tasks:          { label: "Tasks",          emoji: "⚡", accent: "#EF4444", bg: "#FEE2E2" },
  projects:       { label: "Projects",       emoji: "💼", accent: "#6366F1", bg: "#EEF2FF" },
};


const GATE_LOCATIONS = ["Gate No 3 (prepaid only)", "Gate No 1 (prepaid only)"];
const OUTLET_LOCATIONS = ["Southern Stories", "Hotspot", "Snapeats", "Kathi Junction", "Dominos", "Subway"];
const ALL_PICKUP_LOCATIONS = [...GATE_LOCATIONS, ...OUTLET_LOCATIONS];
const COURIER_COMPANIES = ["EKart Logistics", "BlueDart", "Amazon Shipping", "ShadowFax", "Express News", "SafeXpress"];

const isGate = (loc: string) => loc.startsWith("Gate No");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(s: string, C: any) {
  if (s === "open" || s === "pending") return C.success;
  if (s === "booked") return C.warning;
  if (s === "accepted" || s === "reaching_pickup" || s === "placed_order" || s === "collecting_order") return "#F59E0B";
  if (s === "in_progress" || s === "reaching_drop") return "#8B5CF6";
  if (s === "completed") return C.primary;
  if (s === "delivered") return "#10B981";
  if (s === "cancelled") return C.error;
  return C.textTertiary;
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    open: "Open", pending: "Pending", booked: "Booked",
    accepted: "Accepted", payment_marked: "Payment Sent",
    payment_confirmed: "Confirmed", in_progress: "In Progress",
    reaching_pickup: "Heading to Pickup", placed_order: "Order Placed",
    collecting_order: "Collecting", reaching_drop: "On the Way",
    completed: "Arrived", delivered: "Delivered", cancelled: "Cancelled",
  };
  return map[s] || s;
}

function Field({ label, value, onChange, placeholder, C, icon, multiline, keyboard }: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[FS.fieldLabel, { color: C.textSecondary }]}>{label}</Text>
      <View style={[FS.fieldInput, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
        <Feather name={icon} size={16} color={C.textTertiary} />
        <TextInput
          style={[FS.fieldText, { color: C.text }, multiline && { minHeight: 70, textAlignVertical: "top" }]}
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

function Picker({ label, options, value, onChange, C }: any) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[FS.fieldLabel, { color: C.textSecondary }]}>{label}</Text>
      <Pressable
        style={[FS.fieldInput, { backgroundColor: C.backgroundSecondary, borderColor: C.border, justifyContent: "space-between" }]}
        onPress={() => setOpen(true)}
      >
        <Text style={{ color: value ? C.text : C.textTertiary, flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" }}>
          {value || `Select ${label}`}
        </Text>
        <Feather name="chevron-down" size={16} color={C.textTertiary} />
      </Pressable>
      <Modal visible={open} transparent animationType="slide">
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} onPress={() => setOpen(false)}>
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 40 }}>
            <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 12 }}>{label}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {options.map((opt: string) => (
                <Pressable key={opt} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                  onPress={() => { onChange(opt); setOpen(false); }}>
                  <Text style={{ color: opt === value ? C.primary : C.text, fontFamily: opt === value ? "Inter_600SemiBold" : "Inter_400Regular", fontSize: 15 }}>{opt}</Text>
                  {opt === value && <Feather name="check" size={16} color={C.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Status Tracker (Zomato/Swiggy style) ────────────────────────────────────

function StatusTracker({ steps, currentStatus, history, accentColor = "#5B4FE8", C }: {
  steps: Array<{ id: string; label: string; icon: string }>;
  currentStatus: string;
  history?: string | null;
  accentColor?: string;
  C: any;
}) {
  const currentIdx = Math.max(0, steps.findIndex(s => s.id === currentStatus));
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.3, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const timeMap: Record<string, string> = {};
  if (history) {
    try {
      const arr = JSON.parse(history);
      arr.forEach((e: any) => {
        timeMap[e.status] = new Date(e.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      });
    } catch {}
  }

  return (
    <View style={{ paddingTop: 4, paddingBottom: 8 }}>
      {steps.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isPending = idx > currentIdx;
        const isLast = idx === steps.length - 1;
        const stepTime = timeMap[step.id];

        return (
          <View key={step.id} style={{ flexDirection: "row" }}>
            {/* Left column: dot + connector line */}
            <View style={{ width: 34, alignItems: "center" }}>
              {isDone && (
                <View style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: "#10B981",
                  justifyContent: "center", alignItems: "center",
                  shadowColor: "#10B981", shadowOpacity: 0.3, shadowRadius: 4, elevation: 2,
                }}>
                  <Feather name="check" size={14} color="#fff" />
                </View>
              )}
              {isCurrent && (
                <Animated.View style={{ transform: [{ scale: pulse }] }}>
                  <View style={{
                    width: 28, height: 28, borderRadius: 14,
                    backgroundColor: accentColor,
                    justifyContent: "center", alignItems: "center",
                    shadowColor: accentColor, shadowOpacity: 0.5, shadowRadius: 8, elevation: 5,
                  }}>
                    <Feather name={step.icon as any} size={13} color="#fff" />
                  </View>
                </Animated.View>
              )}
              {isPending && (
                <View style={{
                  width: 28, height: 28, borderRadius: 14,
                  borderWidth: 2, borderColor: C.border,
                  backgroundColor: C.backgroundSecondary,
                  justifyContent: "center", alignItems: "center",
                }}>
                  <Feather name={step.icon as any} size={12} color={C.textTertiary} />
                </View>
              )}
              {!isLast && (
                <View style={{
                  width: 2, flex: 1, minHeight: 28,
                  backgroundColor: isDone ? "#10B981" : C.border,
                  marginVertical: 2, borderRadius: 1,
                }} />
              )}
            </View>

            {/* Right column: label + time */}
            <View style={{ flex: 1, paddingLeft: 10, paddingBottom: isLast ? 4 : 28, paddingTop: 4 }}>
              <Text style={{
                fontSize: 13,
                fontFamily: isCurrent ? "Inter_700Bold" : isDone ? "Inter_500Medium" : "Inter_400Regular",
                color: isDone ? "#10B981" : isCurrent ? accentColor : C.textTertiary,
                lineHeight: 18,
              }}>
                {step.label}
              </Text>
              {stepTime && (
                <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 1, fontFamily: "Inter_400Regular" }}>
                  {stepTime}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Payment Timer ─────────────────────────────────────────────────────────────

function PaymentTimer({ startedAt, C }: { startedAt: string; C: any }) {
  const [remaining, setRemaining] = useState(180);
  useEffect(() => {
    const started = new Date(startedAt).getTime();
    const end = started + 3 * 60 * 1000;
    const tick = () => {
      const left = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setRemaining(left);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isUrgent = remaining < 60;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: isUrgent ? "#FEF2F2" : "#FFF7ED", borderRadius: 8, padding: 8, marginTop: 8 }}>
      <Feather name="clock" size={14} color={isUrgent ? "#EF4444" : "#F59E0B"} />
      <Text style={{ color: isUrgent ? "#EF4444" : "#F59E0B", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
        {remaining === 0 ? "Timer expired — please settle payment" : `Pay within ${mins}:${secs.toString().padStart(2, "0")}`}
      </Text>
    </View>
  );
}

// ─── Rating Modal ─────────────────────────────────────────────────────────────

function RatingModal({ visible, onClose, onSubmit, C }: any) {
  const [happiness, setHappiness] = useState(0);
  const [handling, setHandling] = useState(0);
  const [onTime, setOnTime] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const StarRow = ({ label, value, onChange }: any) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: C.textSecondary, fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 8 }}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <Pressable key={n} onPress={() => onChange(n)}>
            <Feather name="star" size={28} color={n <= value ? "#F59E0B" : C.border} />
          </Pressable>
        ))}
      </View>
    </View>
  );

  const canSubmit = happiness > 0 && handling > 0 && onTime > 0;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" }}>
        <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
          <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 4 }}>Rate your experience</Text>
          <Text style={{ color: C.textSecondary, fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 24 }}>Help improve the community by rating this delivery</Text>
          <StarRow label="How happy were you with the service provider?" value={happiness} onChange={setHappiness} />
          <StarRow label="How was the handling of your item?" value={handling} onChange={setHandling} />
          <StarRow label="How was the on-time delivery?" value={onTime} onChange={setOnTime} />
          <Text style={{ color: C.textSecondary, fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 8 }}>Comments (optional)</Text>
          <View style={[FS.fieldInput, { backgroundColor: C.backgroundSecondary, borderColor: C.border, marginBottom: 20 }]}>
            <TextInput
              style={{ flex: 1, color: C.text, fontFamily: "Inter_400Regular", fontSize: 15, minHeight: 60, textAlignVertical: "top" }}
              value={comment} onChangeText={setComment} multiline placeholder="Share your experience..." placeholderTextColor={C.textTertiary}
            />
          </View>
          <Pressable
            style={{ backgroundColor: canSubmit ? C.primary : C.border, paddingVertical: 16, borderRadius: 14, alignItems: "center", marginBottom: 12 }}
            disabled={!canSubmit || loading}
            onPress={async () => { setLoading(true); await onSubmit({ ratingHappiness: happiness, ratingHandling: handling, ratingOnTime: onTime, ratingComment: comment }); setLoading(false); }}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 }}>Submit Rating</Text>}
          </Pressable>
          <Pressable onPress={onClose} style={{ alignItems: "center", paddingVertical: 12 }}>
            <Text style={{ color: C.textSecondary, fontFamily: "Inter_500Medium" }}>Skip</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Food Menu Picker ─────────────────────────────────────────────────────────

function FoodMenuPicker({ outletName, allItems, cart, onCartChange, C }: any) {
  const outletItems = allItems.filter((i: any) => i.outletName === outletName && i.available);

  if (!outletName || outletItems.length === 0) {
    return <Text style={{ color: C.textTertiary, fontSize: 13, textAlign: "center", padding: 12 }}>No items found for this outlet.</Text>;
  }

  const getQty = (id: string) => cart[id]?.qty || 0;
  const updateCart = (item: any, delta: number) => {
    const qty = Math.max(0, getQty(item.id) + delta);
    const next = { ...cart };
    if (qty === 0) {
      delete next[item.id];
    } else {
      next[item.id] = { ...item, qty };
    }
    onCartChange(next);
  };

  return (
    <View>
      <Text style={{ color: C.text, fontFamily: "Inter_700Bold", fontSize: 15, marginBottom: 12 }}>{outletName} Menu</Text>
      {outletItems.map((item: any) => {
        const qty = getQty(item.id);
        return (
          <View key={item.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontFamily: "Inter_500Medium", fontSize: 14 }}>{item.name}</Text>
              <Text style={{ color: C.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>₹{parseFloat(item.price).toFixed(0)}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {qty > 0 ? (
                <>
                  <Pressable
                    style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.error + "20", alignItems: "center", justifyContent: "center" }}
                    onPress={() => updateCart(item, -1)}>
                    <Feather name="minus" size={14} color={C.error} />
                  </Pressable>
                  <Text style={{ color: C.text, fontFamily: "Inter_700Bold", fontSize: 15, minWidth: 20, textAlign: "center" }}>{qty}</Text>
                </>
              ) : null}
              <Pressable
                style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.primary + "20", alignItems: "center", justifyContent: "center" }}
                onPress={() => updateCart(item, 1)}>
                <Feather name="plus" size={14} color={C.primary} />
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Post Modals ──────────────────────────────────────────────────────────────

function PostAssignmentModal({ visible, onClose, C, apiRequest, queryClient, showToast, user, serviceType }: any) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [subject, setSubject] = useState("");
  const [targetYear, setTargetYear] = useState(user?.year || 1);
  const [program, setProgram] = useState(user?.program || "BCA");

  const userYear = user?.year || 4;
  const userProgram = user?.program || "BCA";
  const endpoint = serviceType === "certifications"
    ? "/services/certifications"
    : serviceType === "projects"
      ? "/services/projects"
      : "/services/assignments";

  const reset = () => { setTitle(""); setDescription(""); setPrice(""); setSubject(""); setTargetYear(user?.year || 1); };

  // Providers can only post for their own program and for years ≤ their year
  // (same rule applies to assignments, certifications, and projects)
  const yearOptions = Array.from({ length: userYear }, (_, i) => i + 1);
  const programOptions = [userProgram];

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify({ title, description, price: parseFloat(price), subject, targetYear, program }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to post");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services", serviceType] });
      reset(); onClose();
      showToast("Listing posted!", "success");
    },
    onError: (err: any) => showToast(err.message || "Failed to post", "error"),
  });

  const isValid = title.trim() && description.trim() && price.trim() && parseFloat(price) > 0 && subject.trim();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={FS.modalOverlay}>
        <View style={[FS.modalSheet, { backgroundColor: C.surface }]}>
          <View style={FS.modalHandle} />
          <View style={FS.modalHeader}>
            <Text style={[FS.modalTitle, { color: C.text }]}>
              {serviceType === "certifications" ? "Post Certification" : serviceType === "projects" ? "Post Project" : "Post Assignment"}
            </Text>
            <Pressable onPress={() => { reset(); onClose(); }}><Feather name="x" size={22} color={C.text} /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Field
              label="Title" value={title} onChange={setTitle}
              placeholder={serviceType === "projects" ? "e.g. E-commerce Website for NGO" : serviceType === "certifications" ? "e.g. AWS Cloud Practitioner Prep" : "e.g. BCA Sem 3 DBMS Assignment"}
              C={C} icon="type"
            />
            <Field label="Description" value={description} onChange={setDescription} placeholder="What's included, timeline, format..." C={C} icon="align-left" multiline />
            <Field label="Price (₹)" value={price} onChange={setPrice} placeholder="e.g. 299" C={C} icon="credit-card" keyboard="numeric" />
            <Field label="Subject Name" value={subject} onChange={setSubject} placeholder="e.g. DBMS, Data Structures" C={C} icon="book" />

            <Text style={[FS.sectionLabel, { color: C.textSecondary }]}>
              For Year (up to Year {userYear} — your year)
            </Text>
            <View style={FS.chipRow}>
              {yearOptions.map(y => (
                <Pressable key={y} style={[FS.chip, { borderColor: C.border, backgroundColor: targetYear === y ? C.primary : C.backgroundSecondary }]} onPress={() => setTargetYear(y)}>
                  <Text style={[FS.chipText, { color: targetYear === y ? "#fff" : C.textSecondary }]}>Year {y}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[FS.sectionLabel, { color: C.textSecondary }]}>
              Program (your program only)
            </Text>
            <View style={FS.chipRow}>
              {programOptions.map(p => (
                <Pressable key={p} style={[FS.chip, { borderColor: C.border, backgroundColor: program === p ? C.primary : C.backgroundSecondary }]} onPress={() => setProgram(p)}>
                  <Text style={[FS.chipText, { color: program === p ? "#fff" : C.textSecondary }]}>{p}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[FS.submitBtn, { backgroundColor: C.primary }, (!isValid || mutation.isPending) && { opacity: 0.5 }]}
              onPress={() => mutation.mutate()} disabled={!isValid || mutation.isPending}>
              {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={[FS.submitBtnText]}>Post Listing</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function PostDeliveryModal({ visible, onClose, C, apiRequest, queryClient, showToast, outletItems }: any) {
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropLocation, setDropLocation] = useState("");
  const [websiteName, setWebsiteName] = useState("");
  const [courierCompany, setCourierCompany] = useState("");
  const [orderCustomerName, setOrderCustomerName] = useState("");
  const [orderId, setOrderId] = useState("");
  const [orderMobile, setOrderMobile] = useState("");
  const [cart, setCart] = useState<Record<string, any>>({});

  const reset = () => {
    setPickupLocation(""); setDropLocation(""); setWebsiteName(""); setCourierCompany("");
    setOrderCustomerName(""); setOrderId(""); setOrderMobile(""); setCart({});
  };

  const selectedOutlet = pickupLocation && !isGate(pickupLocation) ? pickupLocation : null;
  const cartItems = Object.values(cart);
  const subtotal = cartItems.reduce((sum: number, i: any) => sum + parseFloat(i.price) * i.qty, 0);
  const totalAmount = subtotal + 30;

  const isGatePickup = pickupLocation ? isGate(pickupLocation) : false;
  const isOutletPickup = pickupLocation ? !isGate(pickupLocation) : false;

  const isValid = () => {
    if (!pickupLocation || !dropLocation.trim()) return false;
    if (isGatePickup) return websiteName.trim() && courierCompany && orderCustomerName.trim() && orderId.trim() && orderMobile.trim();
    if (isOutletPickup) return cartItems.length > 0;
    return false;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        pickupType: isGatePickup ? "gate" : "outlet",
        pickupLocation,
        dropLocation: dropLocation.trim(),
      };
      if (isGatePickup) {
        payload.websiteName = websiteName.trim();
        payload.courierCompany = courierCompany;
        payload.orderCustomerName = orderCustomerName.trim();
        payload.orderId = orderId.trim();
        payload.orderMobile = orderMobile.trim();
      } else {
        payload.foodItems = cartItems.map(i => ({ id: i.id, name: i.name, price: parseFloat(i.price), qty: i.qty }));
        payload.subtotal = subtotal;
      }
      const res = await apiRequest("/services/deliveries", { method: "POST", body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to post");
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["services", "deliveries"] }); reset(); onClose(); showToast("Delivery request posted!", "success"); },
    onError: (err: any) => showToast(err.message || "Failed to post delivery", "error"),
  });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={FS.modalOverlay}>
        <View style={[FS.modalSheet, { backgroundColor: C.surface }]}>
          <View style={FS.modalHandle} />
          <View style={FS.modalHeader}>
            <Text style={[FS.modalTitle, { color: C.text }]}>Request Delivery</Text>
            <Pressable onPress={() => { reset(); onClose(); }}><Feather name="x" size={22} color={C.text} /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Picker label="Pickup From" options={ALL_PICKUP_LOCATIONS} value={pickupLocation}
              onChange={(v: string) => { setPickupLocation(v); setCart({}); setWebsiteName(""); setCourierCompany(""); setOrderCustomerName(""); setOrderId(""); setOrderMobile(""); }} C={C} />

            {isGatePickup && (
              <>
                <View style={{ backgroundColor: C.infoLight || "#EFF6FF", borderRadius: 10, padding: 12, marginBottom: 12 }}>
                  <Text style={{ color: C.info || "#3B82F6", fontFamily: "Inter_500Medium", fontSize: 12 }}>
                    Gate pickups are for Amazon, Flipkart & other parcel deliveries. Please fill in your order details.
                  </Text>
                </View>
                <Field label="Website Name" value={websiteName} onChange={setWebsiteName} placeholder="e.g. Amazon, Flipkart, Meesho" C={C} icon="globe" />
                <Picker label="Courier Company" options={COURIER_COMPANIES} value={courierCompany} onChange={setCourierCompany} C={C} />
                <Field label="Order Customer Name" value={orderCustomerName} onChange={setOrderCustomerName} placeholder="Name on order" C={C} icon="user" />
                <Field label="Order ID" value={orderId} onChange={setOrderId} placeholder="e.g. 408-XXXXXX" C={C} icon="hash" />
                <Field label="Order Linked Mobile" value={orderMobile} onChange={setOrderMobile} placeholder="+91 XXXXX XXXXX" C={C} icon="phone" keyboard="phone-pad" />
              </>
            )}

            {isOutletPickup && (
              <>
                <FoodMenuPicker outletName={selectedOutlet} allItems={outletItems} cart={cart} onCartChange={setCart} C={C} />
                {cartItems.length > 0 && (
                  <View style={{ backgroundColor: C.backgroundSecondary, borderRadius: 12, padding: 12, marginTop: 12 }}>
                    <Text style={{ color: C.textSecondary, fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 6 }}>Order Summary</Text>
                    {cartItems.map((i: any) => (
                      <View key={i.id} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                        <Text style={{ color: C.text, fontFamily: "Inter_400Regular", fontSize: 13 }}>{i.name} ×{i.qty}</Text>
                        <Text style={{ color: C.text, fontFamily: "Inter_500Medium", fontSize: 13 }}>₹{(parseFloat(i.price) * i.qty).toFixed(0)}</Text>
                      </View>
                    ))}
                    <View style={{ borderTopWidth: 1, borderTopColor: C.border, marginTop: 8, paddingTop: 8 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ color: C.textSecondary, fontSize: 13 }}>Items subtotal</Text>
                        <Text style={{ color: C.text, fontFamily: "Inter_500Medium", fontSize: 13 }}>₹{subtotal.toFixed(0)}</Text>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                        <Text style={{ color: C.textSecondary, fontSize: 13 }}>Delivery charge</Text>
                        <Text style={{ color: C.text, fontFamily: "Inter_500Medium", fontSize: 13 }}>₹30</Text>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border }}>
                        <Text style={{ color: C.text, fontFamily: "Inter_700Bold", fontSize: 15 }}>Total</Text>
                        <Text style={{ color: C.primary, fontFamily: "Inter_700Bold", fontSize: 15 }}>₹{totalAmount.toFixed(0)}</Text>
                      </View>
                    </View>
                  </View>
                )}
              </>
            )}

            <Field label="Drop Location" value={dropLocation} onChange={setDropLocation} placeholder="e.g. Block A Room 204" C={C} icon="map-pin" />

            <Pressable
              style={[FS.submitBtn, { backgroundColor: C.primary }, (!isValid() || mutation.isPending) && { opacity: 0.5 }]}
              onPress={() => mutation.mutate()} disabled={!isValid() || mutation.isPending}>
              {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={FS.submitBtnText}>Request Pickup</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function PostTaskModal({ visible, onClose, C, apiRequest, queryClient, showToast }: any) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [category, setCategory] = useState("design");

  const reset = () => { setTitle(""); setDescription(""); setBudget(""); setCategory("design"); };

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/services/tasks", { method: "POST", body: JSON.stringify({ title, description, budget: parseFloat(budget), category }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to post");
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["services", "tasks"] }); reset(); onClose(); showToast("Task posted!", "success"); },
    onError: (err: any) => showToast(err.message || "Failed to post task", "error"),
  });

  const isValid = title.trim() && description.trim() && budget.trim() && parseFloat(budget) > 0;
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={FS.modalOverlay}>
        <View style={[FS.modalSheet, { backgroundColor: C.surface }]}>
          <View style={FS.modalHandle} />
          <View style={FS.modalHeader}>
            <Text style={[FS.modalTitle, { color: C.text }]}>Post a Task</Text>
            <Pressable onPress={() => { reset(); onClose(); }}><Feather name="x" size={22} color={C.text} /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Field label="What do you need done?" value={title} onChange={setTitle} placeholder="e.g. Design my project poster" C={C} icon="type" />
            <Field label="Description" value={description} onChange={setDescription} placeholder="Describe the task in detail..." C={C} icon="align-left" multiline />
            <Field label="Budget (₹)" value={budget} onChange={setBudget} placeholder="e.g. 500" C={C} icon="credit-card" keyboard="numeric" />
            <Text style={[FS.sectionLabel, { color: C.textSecondary }]}>Category</Text>
            <View style={FS.chipRow}>
              {TASK_CATEGORIES.map(cat => (
                <Pressable key={cat} style={[FS.chip, { borderColor: C.border, backgroundColor: category === cat ? C.primary : C.backgroundSecondary }]} onPress={() => setCategory(cat)}>
                  <Text style={[FS.chipText, { color: category === cat ? "#fff" : C.textSecondary }]}>{cat}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[FS.submitBtn, { backgroundColor: C.primary }, (!isValid || mutation.isPending) && { opacity: 0.5 }]}
              onPress={() => mutation.mutate()} disabled={!isValid || mutation.isPending}>
              {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={FS.submitBtnText}>Post Task</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Service Cards ─────────────────────────────────────────────────────────────

function AcademicCard({ item, C, onAction, currentUserId, isPending, serviceType, myBooking, bookingCount }: any) {
  const isOwner = item.poster?.id === currentUserId;
  const accentColor = serviceType === "certifications" ? "#10B981" : serviceType === "projects" ? "#6366F1" : "#5B4FE8";
  // Multi-booking model: booking state comes from myBooking (service_bookings table)
  const hasActiveBooking = !!myBooking && !["delivered", "dismissed"].includes(myBooking.status);
  // Legacy fallback: old single-booking model stored bookedById directly on the listing
  const isBookedByMeLegacy = !hasActiveBooking && (
    item.bookedBy?.id === currentUserId || item.bookedById === currentUserId
  );
  const canBook = !isOwner && !hasActiveBooking && !isBookedByMeLegacy;

  return (
    <View style={[CS.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={CS.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={[CS.cardTitle, { color: C.text }]} numberOfLines={2}>{item.title}</Text>
          {item.poster && (
            <Text style={[CS.cardAuthor, { color: C.textSecondary }]}>by {item.poster.name} · {item.poster.college || ""}</Text>
          )}
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <Text style={[CS.cardPrice, { color: C.primary }]}>₹{parseFloat(item.price).toFixed(0)}</Text>
          {/* Listings are always open — show booking count for providers */}
          {isOwner && bookingCount != null ? (
            <View style={[CS.badge, { backgroundColor: accentColor + "22" }]}>
              <Text style={[CS.badgeText, { color: accentColor }]}>{bookingCount} booking{bookingCount !== 1 ? "s" : ""}</Text>
            </View>
          ) : (
            <View style={[CS.badge, { backgroundColor: "#10B98122" }]}>
              <Text style={[CS.badgeText, { color: "#10B981" }]}>Open</Text>
            </View>
          )}
        </View>
      </View>
      {item.description && <Text style={[CS.cardDesc, { color: C.textSecondary }]} numberOfLines={2}>{item.description}</Text>}
      <View style={CS.tagsRow}>
        {item.subject && (
          <View style={[CS.tag, { backgroundColor: C.primaryLight }]}>
            <Feather name="book" size={10} color={C.primary} />
            <Text style={[CS.tagText, { color: C.primary }]}>{item.subject}</Text>
          </View>
        )}
        {item.program && (
          <View style={[CS.tag, { backgroundColor: C.backgroundSecondary }]}>
            <Feather name="layers" size={10} color={C.textTertiary} />
            <Text style={[CS.tagText, { color: C.textSecondary }]}>{item.program}</Text>
          </View>
        )}
        {item.targetYear && (
          <View style={[CS.tag, { backgroundColor: C.backgroundSecondary }]}>
            <Text style={[CS.tagText, { color: C.textSecondary }]}>Year {item.targetYear}</Text>
          </View>
        )}
      </View>

      {/* Already booked badge for this student (new multi-booking model) */}
      {hasActiveBooking && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: accentColor + "15", borderRadius: 8, padding: 8, marginTop: 6 }}>
          <Feather name="check-circle" size={13} color={accentColor} />
          <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: accentColor }}>
            You booked this · {statusLabel(myBooking.status)}
          </Text>
        </View>
      )}
      {/* Legacy booking badge (old single-booking model fallback) */}
      {isBookedByMeLegacy && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: accentColor + "15", borderRadius: 8, padding: 8, marginTop: 6 }}>
          <Feather name="check-circle" size={13} color={accentColor} />
          <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: accentColor }}>
            You booked this · {statusLabel(item.status)}
          </Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={{ gap: 8, marginTop: 8 }}>
        {canBook && !isOwner && (
          <Pressable
            style={[CS.actionBtn, { backgroundColor: accentColor }, isPending && { opacity: 0.6 }]}
            onPress={() => onAction(item.id, "book")} disabled={isPending}>
            {isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={CS.actionBtnText}>Book Now</Text>}
          </Pressable>
        )}
        {isOwner && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.backgroundSecondary, borderRadius: 8, padding: 8 }}>
            <Feather name="users" size={13} color={C.textSecondary} />
            <Text style={{ fontSize: 11, color: C.textSecondary, fontFamily: "Inter_500Medium" }}>
              {bookingCount ?? 0} student{(bookingCount ?? 0) !== 1 ? "s" : ""} booked · check Active Now
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function DeliveryCard({ item, C, currentUser, onAction, onRate, isPending }: any) {
  const isRequester = item.requester?.id === currentUser?.id || item.requesterId === currentUser?.id;
  const isAgent = item.deliveryAgent?.id === currentUser?.id || item.deliveryAgentId === currentUser?.id;
  const [showRating, setShowRating] = useState(false);
  const isOutlet = item.pickupType === "outlet";

  const foodItems = item.foodItems ? JSON.parse(item.foodItems) : null;
  const subtotal = item.subtotal ? parseFloat(item.subtotal) : 0;
  const deliveryFee = item.deliveryFee ? parseFloat(item.deliveryFee) : 30;
  const total = subtotal + deliveryFee;

  const canCall = (isRequester || isAgent) && item.deliveryAgent?.phone && item.status !== "pending";
  const showTracker = item.status !== "pending";

  const steps = isOutlet ? DELIVERY_OUTLET_STEPS : DELIVERY_GATE_STEPS;

  // Provider's next step button label
  const agentNextAction = (() => {
    if (!isAgent) return null;
    const map: Record<string, { label: string; color: string }> = {
      accepted: { label: "Head to Pickup", color: "#F59E0B" },
      reaching_pickup: isOutlet
        ? { label: "Placed Order at Outlet", color: "#8B5CF6" }
        : { label: "On My Way to Drop", color: "#8B5CF6" },
      placed_order: { label: "Collecting Order", color: "#8B5CF6" },
      collecting_order: { label: "On My Way to Drop", color: "#5B4FE8" },
      reaching_drop: { label: "Arrived at Drop Point", color: "#5B4FE8" },
    };
    return map[item.status] || null;
  })();

  const studentCanConfirm = isRequester && item.status === "completed";

  return (
    <View style={[CS.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={CS.cardTop}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <View style={[CS.badge, { backgroundColor: isOutlet ? "#FEF3C7" : "#EDE9FE" }]}>
              <Text style={[CS.badgeText, { color: isOutlet ? "#D97706" : "#5B4FE8" }]}>
                {isOutlet ? "Food Order" : "Parcel"}
              </Text>
            </View>
          </View>
          <Text style={[CS.cardTitle, { color: C.text }]} numberOfLines={1}>{item.pickupLocation}</Text>
          <Text style={[CS.cardAuthor, { color: C.textSecondary }]}>→ {item.dropLocation}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          {isOutlet && subtotal > 0 && (
            <Text style={[CS.cardPrice, { color: C.primary }]}>₹{total.toFixed(0)}</Text>
          )}
          <View style={[CS.badge, { backgroundColor: statusColor(item.status, C) + "22" }]}>
            <Text style={[CS.badgeText, { color: statusColor(item.status, C) }]}>{statusLabel(item.status)}</Text>
          </View>
        </View>
      </View>

      {/* Gate-specific info */}
      {!isOutlet && (
        <View style={{ backgroundColor: C.backgroundSecondary, borderRadius: 10, padding: 10, marginBottom: 8 }}>
          <Text style={{ color: C.text, fontFamily: "Inter_500Medium", fontSize: 13 }}>{item.websiteName} · {item.courierCompany}</Text>
          <Text style={{ color: C.textSecondary, fontFamily: "Inter_400Regular", fontSize: 12 }}>Order: {item.orderId} | {item.orderCustomerName}</Text>
          <Text style={{ color: C.textSecondary, fontFamily: "Inter_400Regular", fontSize: 12 }}>📱 {item.orderMobile}</Text>
        </View>
      )}

      {/* Food order items */}
      {foodItems && foodItems.length > 0 && (
        <View style={{ backgroundColor: C.backgroundSecondary, borderRadius: 10, padding: 10, marginBottom: 8 }}>
          {foodItems.map((fi: any, idx: number) => (
            <Text key={idx} style={{ color: C.text, fontFamily: "Inter_400Regular", fontSize: 12 }}>{fi.name} ×{fi.qty} — ₹{(fi.price * fi.qty).toFixed(0)}</Text>
          ))}
          <View style={{ borderTopWidth: 1, borderTopColor: C.border, marginTop: 6, paddingTop: 6, flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: C.textSecondary, fontSize: 12 }}>Food ₹{subtotal.toFixed(0)} + Delivery ₹{deliveryFee.toFixed(0)}</Text>
            <Text style={{ color: C.primary, fontFamily: "Inter_700Bold", fontSize: 12 }}>Total ₹{total.toFixed(0)}</Text>
          </View>
        </View>
      )}

      {/* Requester / agent info */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        {item.requester && <Text style={{ color: C.textTertiary, fontSize: 11 }}>by {item.requester.name}</Text>}
        {item.deliveryAgent && <Text style={{ color: C.textTertiary, fontSize: 11 }}>Agent: {item.deliveryAgent.name}</Text>}
      </View>

      {/* Zomato-style Status Tracker */}
      {showTracker && (
        <View style={{ borderTopWidth: 1, borderTopColor: C.border, marginTop: 4, paddingTop: 12, marginBottom: 4 }}>
          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: C.textSecondary, marginBottom: 8, letterSpacing: 0.4, textTransform: "uppercase" }}>
            Live Tracking
          </Text>
          <StatusTracker
            steps={steps}
            currentStatus={item.status}
            history={item.statusHistory}
            accentColor="#F59E0B"
            C={C}
          />
        </View>
      )}

      {/* Call button */}
      {canCall && item.deliveryAgent?.phone && (
        <Pressable
          style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#D1FAE5", borderRadius: 10, padding: 12, marginTop: 4 }}
          onPress={() => Linking.openURL(`tel:${item.deliveryAgent.phone}`)}>
          <Feather name="phone" size={16} color="#059669" />
          <Text style={{ color: "#059669", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
            Call {isRequester ? "Delivery Agent" : "Requester"}
          </Text>
        </Pressable>
      )}

      {/* Action buttons */}
      <View style={{ gap: 8, marginTop: 8 }}>
        {/* Provider: accept pending request */}
        {!isAgent && currentUser?.role === "provider" && item.status === "pending" && (
          <Pressable style={[CS.actionBtn, { backgroundColor: "#10B981" }, isPending && { opacity: 0.6 }]}
            onPress={() => onAction(item.id, "accept")} disabled={isPending}>
            {isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={CS.actionBtnText}>Accept Request</Text>}
          </Pressable>
        )}

        {/* Agent: progress through steps */}
        {agentNextAction && (
          <Pressable style={[CS.actionBtn, { backgroundColor: agentNextAction.color }, isPending && { opacity: 0.6 }]}
            onPress={() => onAction(item.id, "progress")} disabled={isPending}>
            {isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={CS.actionBtnText}>{agentNextAction.label}</Text>}
          </Pressable>
        )}

        {/* Student: confirm received (when agent has arrived) */}
        {studentCanConfirm && (
          <>
            <Pressable style={[CS.actionBtn, { backgroundColor: "#10B981" }, isPending && { opacity: 0.6 }]}
              onPress={() => onAction(item.id, "confirm")} disabled={isPending}>
              {isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={CS.actionBtnText}>Confirm Received</Text>}
            </Pressable>
          </>
        )}

        {/* Student: rate after delivered */}
        {isRequester && ["completed", "delivered"].includes(item.status) && !item.ratingHappiness && (
          <>
            <Pressable style={[CS.actionBtn, { backgroundColor: "#F59E0B" }]} onPress={() => setShowRating(true)}>
              <Text style={CS.actionBtnText}>⭐ Rate Experience</Text>
            </Pressable>
            <RatingModal visible={showRating} onClose={() => setShowRating(false)}
              onSubmit={async (data: any) => { await onRate(item.id, data); setShowRating(false); }} C={C} />
          </>
        )}

        {/* Rated */}
        {isRequester && ["completed", "delivered"].includes(item.status) && item.ratingHappiness && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FEF3C7", borderRadius: 10, padding: 10 }}>
            <Feather name="star" size={14} color="#F59E0B" />
            <Text style={{ color: "#92400E", fontFamily: "Inter_500Medium", fontSize: 13 }}>
              Rated: {item.ratingHappiness}★ · {item.ratingHandling}★ · {item.ratingOnTime}★
            </Text>
          </View>
        )}

        {/* Delivered confirmation */}
        {item.status === "delivered" && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#D1FAE5", borderRadius: 10, padding: 10 }}>
            <Feather name="check-circle" size={16} color="#059669" />
            <Text style={{ color: "#059669", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Delivered successfully!</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function TaskCard({ item, C, onAction, currentUserId, isPending, hasApplied }: any) {
  const isOwner = item.poster?.id === currentUserId;
  const canApply = !isOwner && item.status === "open" && !hasApplied;

  return (
    <View style={[CS.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={CS.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={[CS.cardTitle, { color: C.text }]} numberOfLines={2}>{item.title}</Text>
          {item.poster && <Text style={[CS.cardAuthor, { color: C.textSecondary }]}>by {item.poster.name}</Text>}
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <Text style={[CS.cardPrice, { color: C.primary }]}>₹{parseFloat(item.budget).toFixed(0)}</Text>
          <View style={[CS.badge, { backgroundColor: statusColor(item.status, C) + "20" }]}>
            <Text style={[CS.badgeText, { color: statusColor(item.status, C) }]}>{item.status}</Text>
          </View>
        </View>
      </View>
      {item.description && <Text style={[CS.cardDesc, { color: C.textSecondary }]} numberOfLines={2}>{item.description}</Text>}
      <View style={CS.tagsRow}>
        {item.category && (
          <View style={[CS.tag, { backgroundColor: C.backgroundSecondary }]}>
            <Feather name="tag" size={10} color={C.textTertiary} />
            <Text style={[CS.tagText, { color: C.textSecondary }]}>{item.category}</Text>
          </View>
        )}
        <View style={[CS.tag, { backgroundColor: C.backgroundSecondary }]}>
          <Feather name="users" size={10} color={C.textTertiary} />
          <Text style={[CS.tagText, { color: C.textSecondary }]}>{item.applicantsCount} applied</Text>
        </View>
      </View>
      {isOwner && (
        <View style={[CS.ownerBadge, { backgroundColor: C.primaryLight }]}>
          <Feather name="star" size={11} color={C.primary} />
          <Text style={[CS.ownerBadgeText, { color: C.primary }]}>Your listing</Text>
        </View>
      )}
      {hasApplied && !isOwner && (
        <View style={[CS.ownerBadge, { backgroundColor: C.successLight || "#D1FAE5" }]}>
          <Feather name="check" size={11} color={C.success} />
          <Text style={[CS.ownerBadgeText, { color: C.success }]}>Applied</Text>
        </View>
      )}
      {canApply && (
        <Pressable style={[CS.actionBtn, { backgroundColor: C.primary }, isPending && { opacity: 0.6 }]}
          onPress={() => onAction(item.id)} disabled={isPending}>
          {isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={CS.actionBtnText}>Apply</Text>}
        </Pressable>
      )}
    </View>
  );
}

// ─── Step helpers ─────────────────────────────────────────────────────────────

function getStepsForItem(item: any): { labels: string[]; index: number } {
  const s = item.status;
  if (item._type === "assignments" || item._type === "certifications" || item._type === "projects") {
    if (s === "rejected") return { labels: ["Booking Rejected by Provider"], index: 0 };
    const labels = ["Booked", "Accepted", "In Progress", "Completed", "Delivered"];
    const map: Record<string, number> = { booked: 0, accepted: 1, in_progress: 2, completed: 3, delivered: 4 };
    return { labels, index: map[s] ?? 0 };
  }
  if (item._type === "deliveries") {
    if (item.pickupType === "outlet") {
      const labels = ["Accepted", "Heading Out", "Order Placed", "Collecting", "On the Way", "Arrived", "Delivered"];
      const map: Record<string, number> = { accepted: 0, reaching_pickup: 1, placed_order: 2, collecting_order: 3, reaching_drop: 4, completed: 5, delivered: 6 };
      return { labels, index: map[s] ?? 0 };
    }
    const labels = ["Accepted", "Heading Out", "On the Way", "Arrived", "Delivered"];
    const map: Record<string, number> = { accepted: 0, reaching_pickup: 1, reaching_drop: 2, completed: 3, delivered: 4 };
    return { labels, index: map[s] ?? 0 };
  }
  const labels = ["Booked", "Accepted", "In Progress", "Completed", "Done"];
  const map: Record<string, number> = { booked: 0, accepted: 1, in_progress: 2, completed: 3, delivered: 4 };
  return { labels, index: map[s] ?? 0 };
}

// ─── Compact Active Job Card (matches Priority Lane mockup exactly) ────────────

function CompactActiveCard({ item, C, user, onTrackPress, onAccept, onReject, onDismissRejection, isPending }: any) {
  const meta = CAT_META[item._type] || CAT_META.tasks;
  const { labels, index } = getStepsForItem(item);
  const progress = labels.length > 1 ? index / (labels.length - 1) : 1;

  const uid = user?.id;
  const isProvider = item.poster?.id === uid || item.deliveryAgent?.id === uid || item.assignedTo?.id === uid || item.deliveryAgentId === uid;
  // Provider has not yet accepted — needs to review the booking
  const awaitingAcceptance = isProvider && ["booked", "pending"].includes(item.status);

  const title = item.title || item.pickupLocation || "Delivery Request";
  // Who placed/requested the order (student side)
  const studentName = item.bookedBy?.name || item.requester?.name || null;
  // Who is handling the order (provider/agent side)
  const agentName = item.poster?.name || item.deliveryAgent?.name || item.assignedTo?.name || null;
  // Short order ID
  const orderId = `#${item.id.substring(0, 8).toUpperCase()}`;
  const rawPrice = item._type === "deliveries"
    ? (item.subtotal ? parseFloat(item.subtotal) + 30 : parseFloat(item.deliveryFee || "20"))
    : parseFloat(item.price || "0");
  const price = rawPrice > 0 ? `₹${rawPrice.toFixed(0)}` : "";

  return (
    <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1.5, borderColor: meta.accent + "33" }}>
      {/* ── Coloured header strip ── */}
      <View style={{ backgroundColor: meta.bg, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ fontSize: 18 }}>{meta.emoji}</Text>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: "#1C1917", flex: 1 }} numberOfLines={1}>{title}</Text>
            <Text style={{ fontSize: 9, fontFamily: "Inter_500Medium", color: "#A8A29E" }}>{orderId}</Text>
          </View>
          <Text style={{ fontSize: 10, color: "#78716C", marginTop: 1 }}>
            {studentName ? `Order by ${studentName}` : ""}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          {price ? <Text style={{ fontSize: 15, fontFamily: "Inter_800ExtraBold", color: meta.accent }}>{price}</Text> : null}
          {agentName ? <Text style={{ fontSize: 9, color: "#78716C" }}>Agent {agentName}</Text> : null}
        </View>
      </View>

      {/* ── Progress / Rejection area ── */}
      <View style={{ backgroundColor: C.surface, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12 }}>

        {item.status === "rejected" ? (
          /* ── Rejection notice ── */
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEF2F2", borderRadius: 10, padding: 10, marginBottom: 12 }}>
              <Feather name="x-circle" size={20} color="#EF4444" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: "#EF4444" }}>Booking Rejected</Text>
                <Text style={{ fontSize: 10, color: "#78716C", marginTop: 2 }}>The provider declined your booking request.</Text>
              </View>
            </View>
            <Pressable
              style={{ paddingVertical: 9, borderRadius: 12, backgroundColor: "#6B7280", alignItems: "center" }}
              onPress={() => onDismissRejection(
                item._isSynthetic ? item.listingId : item.id,
                item._isSynthetic ? item._type : "bookings"
              )}
              disabled={isPending}
            >
              {isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 }}>Dismiss</Text>}
            </Pressable>
          </>
        ) : (
          <>
            {/* Horizontal bar */}
            <View style={{ height: 6, borderRadius: 3, backgroundColor: meta.bg, marginBottom: 12 }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: meta.accent, width: `${progress * 100}%` as any }} />
            </View>

            {/* Step dots */}
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {labels.map((label, i) => {
                const done = i < index;
                const active = i === index;
                return (
                  <View key={i} style={{ alignItems: "center", flex: 1 }}>
                    {done ? (
                      <Feather name="check-circle" size={15} color={meta.accent} />
                    ) : active ? (
                      <View style={{ width: 15, height: 15, borderRadius: 8, borderWidth: 2, borderColor: meta.accent, alignItems: "center", justifyContent: "center" }}>
                        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: meta.accent }} />
                      </View>
                    ) : (
                      <Feather name="circle" size={15} color="#D6D3D1" />
                    )}
                    <Text
                      numberOfLines={2}
                      style={{ fontSize: 8, textAlign: "center", marginTop: 3, lineHeight: 10,
                        color: active ? meta.accent : done ? "#78716C" : "#D6D3D1",
                        fontFamily: active ? "Inter_700Bold" : "Inter_400Regular" }}
                    >{label}</Text>
                  </View>
                );
              })}
            </View>

            {/* CTA — Accept/Reject for provider awaiting acceptance; status button otherwise */}
            {awaitingAcceptance ? (
              <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
                <Pressable
                  style={{ flex: 1, paddingVertical: 9, borderRadius: 12, backgroundColor: "#10B981", alignItems: "center" }}
                  onPress={() => onAccept(item.id, item._type)}
                  disabled={isPending}
                >
                  {isPending
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 }}>✓ Accept</Text>}
                </Pressable>
                <Pressable
                  style={{ flex: 1, paddingVertical: 9, borderRadius: 12, backgroundColor: "#FEE2E2", alignItems: "center" }}
                  onPress={() => onReject(item.id, item._type)}
                  disabled={isPending}
                >
                  <Text style={{ color: "#EF4444", fontFamily: "Inter_700Bold", fontSize: 12 }}>✕ Reject</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={{ marginTop: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: meta.accent, alignItems: "center" }}
                onPress={() => onTrackPress(item)}
              >
                <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 }}>
                  {isProvider ? "Update Order Status" : "Track Order →"}
                </Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// ─── Compact Open Listing Row (matches Priority Lane mockup exactly) ───────────

function CompactListingRow({ item, C, user, onBook, onAccept, onReject, onApply, isPending, isLast, hasActiveBooking }: any) {
  const meta = CAT_META[item._type] || CAT_META.tasks;
  const uid = user?.id;
  const isProviderRole = user?.role === "provider";
  const isOwnListing = item.poster?.id === uid || item.requester?.id === uid || item.requesterId === uid;

  const title = item.title || item.pickupLocation || "Delivery Request";
  // Deliveries are posted by students — show requester name. All others posted by providers — show poster name.
  const author = item._type === "deliveries"
    ? (item.requester?.name || "—")
    : (item.poster?.name || "—");
  const subject = item.subject || item.category || (item._type === "deliveries" ? item.pickupLocation : null);
  const rawPrice = parseFloat(item.price || item.deliveryFee || "20");
  const price = `₹${rawPrice.toFixed(0)}`;
  const urgent = item._type === "deliveries" && item.status === "pending";
  const orderId = `#${item.id.substring(0, 8).toUpperCase()}`;

  // ── Determine which action(s) to show ──
  // Deliveries: anyone (not requester) can Accept + Reject a pending pickup
  const canAcceptReject = !isOwnListing && item._type === "deliveries" && item.status === "pending";
  // Tasks: anyone (not poster) can Apply
  const canApply = !isOwnListing && item._type === "tasks" && item.status === "open";
  // Assignments/Certifications/Projects: multi-booking model — listings are always bookable
  // hasActiveBooking comes from service_bookings table (new model)
  // isBookedByMeLegacy is a fallback for old single-booking model rows (bookedById on listing)
  const isBookedByMeLegacy = item.bookedBy?.id === uid || item.bookedById === uid;
  const canBook = !isOwnListing && !hasActiveBooking && !isBookedByMeLegacy
    && (item._type === "assignments" || item._type === "certifications" || item._type === "projects");

  const timeLabel = (() => {
    if (!item.createdAt) return null;
    const mins = Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  })();

  return (
    <View style={{
      flexDirection: "row", alignItems: "center", gap: 12,
      paddingHorizontal: 14, paddingVertical: 12,
      borderBottomWidth: isLast ? 0 : 0.5, borderBottomColor: "#F0EDEA",
    }}>
      {/* Category emoji icon */}
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: meta.bg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 20 }}>{meta.emoji}</Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2, flexWrap: "nowrap" }}>
          {urgent && (
            <View style={{ backgroundColor: "#EF4444", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 20 }}>
              <Text style={{ color: "#fff", fontSize: 8, fontFamily: "Inter_700Bold" }}>URGENT</Text>
            </View>
          )}
          <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: C.text, flex: 1 }} numberOfLines={1}>{title}</Text>
          <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: C.textTertiary }}>{orderId}</Text>
        </View>
        <Text style={{ fontSize: 10, color: C.textSecondary }} numberOfLines={1}>
          {item._type === "deliveries" ? "By " : "Provider: "}{author}{subject ? "  ·  " : ""}
          {subject ? <Text style={{ color: meta.accent, fontFamily: "Inter_500Medium" }}>{subject}</Text> : null}
        </Text>
        {timeLabel ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 }}>
            <Feather name="clock" size={9} color={C.textTertiary} />
            <Text style={{ fontSize: 9, color: C.textTertiary }}>{timeLabel}</Text>
          </View>
        ) : null}
      </View>

      {/* Price + action buttons */}
      <View style={{ alignItems: "flex-end", gap: 5 }}>
        <Text style={{ fontSize: 15, fontFamily: "Inter_800ExtraBold", color: meta.accent }}>{price}</Text>

        {/* Provider: Accept + Reject for deliveries */}
        {canAcceptReject && (
          <View style={{ flexDirection: "row", gap: 5 }}>
            <Pressable
              style={{ backgroundColor: "#D1FAE5", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 }}
              onPress={() => onAccept(item.id, item._type)}
              disabled={isPending}
            >
              {isPending
                ? <ActivityIndicator size="small" color="#10B981" />
                : <Text style={{ color: "#10B981", fontSize: 10, fontFamily: "Inter_700Bold" }}>Accept</Text>}
            </Pressable>
            <Pressable
              style={{ backgroundColor: "#FEE2E2", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 }}
              onPress={() => onReject(item.id, item._type)}
              disabled={isPending}
            >
              <Text style={{ color: "#EF4444", fontSize: 10, fontFamily: "Inter_700Bold" }}>Reject</Text>
            </Pressable>
          </View>
        )}

        {/* Provider: Apply for tasks */}
        {canApply && (
          <Pressable
            style={{ backgroundColor: meta.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
            onPress={() => onApply(item.id, item._type)}
            disabled={isPending}
          >
            {isPending
              ? <ActivityIndicator size="small" color={meta.accent} />
              : <Text style={{ color: meta.accent, fontSize: 10, fontFamily: "Inter_700Bold" }}>Apply</Text>}
          </Pressable>
        )}

        {/* Student: Book assignments/certifications */}
        {canBook && (
          <Pressable
            style={{ backgroundColor: meta.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
            onPress={() => onBook(item.id, item._type)}
            disabled={isPending}
          >
            {isPending
              ? <ActivityIndicator size="small" color={meta.accent} />
              : <Text style={{ color: meta.accent, fontSize: 10, fontFamily: "Inter_700Bold" }}>Book</Text>}
          </Pressable>
        )}

        {/* Already booked badge */}
        {(hasActiveBooking || isBookedByMeLegacy) && !isOwnListing && (
          <View style={{ backgroundColor: meta.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Feather name="check" size={10} color={meta.accent} />
            <Text style={{ color: meta.accent, fontSize: 9, fontFamily: "Inter_700Bold" }}>Booked</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Booking Detail Card (shown in modal when user taps Track Order / Update Status) ─

function BookingDetailCard({ item, C, user, onAction, isPending }: any) {
  const type = item._type;
  const accentColor = type === "certifications" ? "#10B981" : type === "projects" ? "#6366F1" : "#5B4FE8";
  const uid = user?.id;
  const isProvider = item.poster?.id === uid;
  // For synthetic bookings, student may only have id (not full object) — check both
  const isStudent  = item.bookedBy?.id === uid || item.bookedById === uid;
  // For synthetic (old-model) bookings, actions must use the listing ID, not the fake display ID
  const actionId = item._isSynthetic ? item.listingId : item.id;
  const { labels, index } = getStepsForItem(item);
  const progress = labels.length > 1 ? index / (labels.length - 1) : 1;

  const providerNextAction = (() => {
    if (!isProvider) return null;
    if (item.status === "accepted")   return { label: "Mark as Started",   action: "progress" };
    if (item.status === "in_progress") return { label: "Mark as Completed", action: "progress" };
    return null;
  })();
  const studentCanConfirm = isStudent && item.status === "completed";

  const statusMessage: Record<string, string> = {
    booked:      "Waiting for the provider to accept your booking…",
    accepted:    "Provider has accepted — work starting soon.",
    in_progress: "Work is in progress.",
    completed:   "Provider marked as done — please confirm below.",
  };

  return (
    <View style={{ gap: 14 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: C.text }}>{item.title}</Text>
          {item.poster?.name  && <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>by {item.poster.name}</Text>}
          {item.bookedBy?.name && <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 1 }}>Student: {item.bookedBy.name}</Text>}
        </View>
        <Text style={{ fontSize: 20, fontFamily: "Inter_800ExtraBold", color: accentColor }}>₹{parseFloat(item.price || "0").toFixed(0)}</Text>
      </View>

      {/* Tags */}
      {(item.subject || item.program) && (
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
          {item.subject && (
            <View style={{ backgroundColor: accentColor + "20", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
              <Text style={{ fontSize: 11, color: accentColor, fontFamily: "Inter_600SemiBold" }}>{item.subject}</Text>
            </View>
          )}
          {item.program && (
            <View style={{ backgroundColor: C.backgroundSecondary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
              <Text style={{ fontSize: 11, color: C.textSecondary }}>{item.program}</Text>
            </View>
          )}
        </View>
      )}

      {/* Status tracker */}
      {item.status !== "rejected" && (
        <View style={{ backgroundColor: C.backgroundSecondary, borderRadius: 12, padding: 14, gap: 10 }}>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: accentColor + "33" }}>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: accentColor, width: `${Math.round(progress * 100)}%` as any }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {labels.map((label, i) => {
              const done = i < index;
              const active = i === index;
              return (
                <View key={i} style={{ alignItems: "center", flex: 1 }}>
                  {done ? (
                    <Feather name="check-circle" size={16} color={accentColor} />
                  ) : active ? (
                    <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: accentColor, alignItems: "center", justifyContent: "center" }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: accentColor }} />
                    </View>
                  ) : (
                    <Feather name="circle" size={16} color="#D6D3D1" />
                  )}
                  <Text numberOfLines={2} style={{ fontSize: 9, textAlign: "center", marginTop: 3, lineHeight: 11,
                    color: active ? accentColor : done ? "#78716C" : "#D6D3D1",
                    fontFamily: active ? "Inter_700Bold" : "Inter_400Regular" }}>{label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Rejected */}
      {item.status === "rejected" && (
        <View style={{ backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12 }}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#EF4444" }}>Booking Rejected</Text>
          <Text style={{ fontSize: 11, color: "#78716C", marginTop: 4 }}>The provider declined this booking.</Text>
        </View>
      )}

      {/* Delivered */}
      {item.status === "delivered" && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#D1FAE5", borderRadius: 10, padding: 12 }}>
          <Feather name="check-circle" size={16} color="#059669" />
          <Text style={{ color: "#059669", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Work delivered successfully!</Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={{ gap: 8 }}>
        {providerNextAction && (
          <Pressable style={{ paddingVertical: 14, borderRadius: 12, backgroundColor: accentColor, alignItems: "center", opacity: isPending ? 0.6 : 1 }}
            onPress={() => onAction(actionId, providerNextAction.action)} disabled={isPending}>
            {isPending ? <ActivityIndicator color="#fff" size="small" /> :
              <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 }}>{providerNextAction.label}</Text>}
          </Pressable>
        )}
        {studentCanConfirm && (
          <Pressable style={{ paddingVertical: 14, borderRadius: 12, backgroundColor: accentColor, alignItems: "center", opacity: isPending ? 0.6 : 1 }}
            onPress={() => onAction(actionId, "confirm")} disabled={isPending}>
            {isPending ? <ActivityIndicator color="#fff" size="small" /> :
              <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 }}>Confirm Received ✓</Text>}
          </Pressable>
        )}
        {!providerNextAction && !studentCanConfirm && statusMessage[item.status] && (
          <View style={{ backgroundColor: C.backgroundSecondary, borderRadius: 10, padding: 12, alignItems: "center" }}>
            <Text style={{ fontSize: 12, color: C.textSecondary, fontFamily: "Inter_500Medium", textAlign: "center" }}>{statusMessage[item.status]}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Detail Modal (full card shown on "Track Order" tap) ──────────────────────

function DetailModal({ item, C, user, onClose, onAction, onRate, isPending, myBooking }: any) {
  if (!item) return null;
  const type = item._type;
  const isAcademic = type === "assignments" || type === "certifications" || type === "projects";
  return (
    <Modal visible animationType="slide" transparent>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" }}>
        <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: "85%" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: C.text }}>Order Details</Text>
            <Pressable onPress={onClose}><Feather name="x" size={22} color={C.text} /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Booking items (from service_bookings table): show booking tracking/actions */}
            {item._isBooking && isAcademic && (
              <BookingDetailCard item={item} C={C} user={user} onAction={onAction} isPending={isPending} />
            )}
            {/* Listing items: show listing card with myBooking to suppress "Book Now" if already booked */}
            {!item._isBooking && isAcademic && (
              <AcademicCard item={item} C={C} serviceType={type} currentUserId={user?.id} onAction={onAction} isPending={isPending} myBooking={myBooking} />
            )}
            {type === "deliveries" && (
              <DeliveryCard item={item} C={C} currentUser={user} onAction={onAction} onRate={onRate} isPending={isPending} />
            )}
            {type === "tasks" && (
              <TaskCard item={item} C={C} currentUserId={user?.id} onAction={onAction} isPending={isPending} hasApplied={false} />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Category chip definitions ────────────────────────────────────────────────

const CHIPS = [
  { id: "all",            label: "All",            emoji: "✦", accent: "#1C1917", bg: "#F0EDEA" },
  { id: "deliveries",     label: "Delivery",       emoji: "🚀", accent: "#F59E0B", bg: "#FEF3C7" },
  { id: "assignments",    label: "Assignments",    emoji: "📝", accent: "#5B4FE8", bg: "#EDE9FE" },
  { id: "certifications", label: "Certifications", emoji: "🏆", accent: "#10B981", bg: "#D1FAE5" },
  { id: "projects",       label: "Projects",       emoji: "💼", accent: "#6366F1", bg: "#EEF2FF" },
  { id: "tasks",          label: "Tasks",          emoji: "⚡", accent: "#EF4444", bg: "#FEE2E2" },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { apiRequest, user } = useAuth();
  const queryClient = useQueryClient();
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string; itemId?: string }>();
  const [activeCat, setActiveCat] = useState("all");

  // Deep-link from notification: auto-switch to the relevant tab
  useEffect(() => {
    if (tabParam && SERVICE_TABS.some(t => t.id === tabParam)) {
      setActiveCat(tabParam);
    }
  }, [tabParam]);

  const [showPostModal, setShowPostModal] = useState(false);
  const [postType, setPostType] = useState("tasks");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();
  const isWeb = Platform.OS === "web";

  const isProvider = user?.role === "provider";
  const userServices: string[] = user?.services ? JSON.parse(user.services) : [];
  const canPost = (cat: string) => {
    // Delivery and tasks: anyone can post
    if (cat === "deliveries" || cat === "tasks") return true;
    // Assignments, certifications, projects: providers only
    return isProvider;
  };

  // ── Parallel queries for all 4 categories ─────────────────────────────────
  const mkQuery = (key: string, path: string) => ({
    queryKey: ["services", key],
    queryFn: async () => {
      const res = await apiRequest(path);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const { data: assignData, isLoading: aLoading, refetch: rA } = useQuery(mkQuery("assignments", "/services/assignments"));
  const { data: certData,   isLoading: cLoading, refetch: rC } = useQuery(mkQuery("certifications", "/services/certifications"));
  const { data: delivData,  isLoading: dLoading, refetch: rD } = useQuery({
    ...mkQuery("deliveries", "/services/deliveries"),
    refetchInterval: 30_000, // auto-refresh every 30s so both requester and provider see status changes
  });
  const { data: taskData,   isLoading: tLoading, refetch: rT } = useQuery(mkQuery("tasks", "/services/tasks"));
  const { data: projData,   isLoading: pLoading, refetch: rP } = useQuery(mkQuery("projects", "/services/projects"));

  const { data: bookingsData, refetch: rBookings } = useQuery({
    queryKey: ["services", "bookings"],
    queryFn: async () => {
      const res = await apiRequest("/services/bookings");
      if (!res.ok) throw new Error("Failed to load bookings");
      return res.json();
    },
  });

  const { data: outletData } = useQuery({
    queryKey: ["outlet-items"],
    queryFn: async () => {
      const res = await apiRequest("/services/outlet-items");
      if (!res.ok) throw new Error("Failed to load outlet items");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  const outletItems = outletData?.items || [];

  const isLoading = aLoading || cLoading || dLoading || tLoading || pLoading;

  // Tag each item with its _type so renderCard can dispatch correctly
  const rawAssignments    = (assignData?.assignments    || []).map((i: any) => ({ ...i, _type: "assignments" }));
  const rawCertifications = (certData?.certifications   || []).map((i: any) => ({ ...i, _type: "certifications" }));
  const rawProjects       = (projData?.projects         || []).map((i: any) => ({ ...i, _type: "projects" }));
  const deliveries        = (delivData?.deliveries       || []).map((i: any) => ({ ...i, _type: "deliveries" }));
  const tasks             = (taskData?.tasks             || []).map((i: any) => ({ ...i, _type: "tasks" }));

  // ── Academic visibility filter ──────────────────────────────────────────────
  // Students: only see listings for their exact program AND year.
  // Providers: see all listings in their program with year ≤ their year (they can book those).
  const filterAcademic = (items: any[]) => {
    const uid = user?.id;
    if (!uid) return items;
    if (isProvider) {
      return items.filter(i =>
        (i.program === user?.program && (i.targetYear ?? i.target_year ?? 0) <= (user?.year ?? 4))
        || i.poster?.id === uid
        || i.bookedById === uid  // Always include listings this user booked (legacy model)
      );
    }
    return items.filter(i =>
      (i.program === user?.program && (i.targetYear ?? i.target_year ?? 0) === user?.year)
      || i.bookedById === uid  // Always include listings this user booked (legacy model)
    );
  };

  const assignments    = filterAcademic(rawAssignments);
  const certifications = filterAcademic(rawCertifications);
  const projects       = filterAcademic(rawProjects);
  const allItems       = [...assignments, ...certifications, ...deliveries, ...tasks, ...projects];

  // ── Booking records (multi-booking for academic types) ─────────────────────
  // Transform each booking into the same item shape CompactActiveCard expects
  const ACADEMIC_CATS = ["assignments", "certifications", "projects"];
  const myBookings: any[] = (bookingsData?.bookings || []).map((b: any) => ({
    id: b.id,
    _type: b.serviceType,
    _isBooking: true,
    _myPerspective: b._myPerspective, // "lister" (provider) or "booker" (student)
    status: b.status,
    statusHistory: b.statusHistory,
    createdAt: b.createdAt,
    title: b.listing?.title,
    price: b.listing?.price,
    subject: b.listing?.subject,
    program: b.listing?.program,
    deadline: b.listing?.deadline,
    poster: b.listing?.poster,   // provider who posted the listing
    bookedBy: b.student,         // student who made this booking
    listingId: b.listingId,
  }));

  // Map listingId → booking for quick lookup (to show "Already Booked" on cards)
  const myActiveBookingByListing = new Map<string, any>(
    myBookings
      .filter(b => !["delivered", "dismissed"].includes(b.status))
      .map(b => [b.listingId, b])
  );

  const getItemsForCat = (cat: string) => {
    if (cat === "assignments")    return assignments;
    if (cat === "certifications") return certifications;
    if (cat === "deliveries")     return deliveries;
    if (cat === "tasks")          return tasks;
    if (cat === "projects")       return projects;
    return allItems;
  };

  // Active jobs:
  //  - Academic tabs → use booking records (myBookings) — one card per booking
  //  - Delivery / task tabs → use listing-level status (original logic)
  const isActiveJobLegacy = (item: any) => {
    // Academic types are handled via booking records (myBookings) or syntheticBookings below
    if (ACADEMIC_CATS.includes(item._type)) return false;
    const idle = ["open", "pending", "delivered", "cancelled"];
    if (idle.includes(item.status)) return false;
    const uid = user?.id;
    const isStudent  = item.bookedBy?.id === uid || item.requester?.id === uid || item.requesterId === uid;
    const isProvider = item.poster?.id === uid || item.deliveryAgent?.id === uid || item.assignedTo?.id === uid || item.deliveryAgentId === uid;
    return isStudent || isProvider;
  };

  // Synthesize booking-display objects from OLD-MODEL academic listing rows.
  // These are listings that have non-"open" status + bookedById set but no corresponding
  // service_bookings record. We wrap them so BookingDetailCard renders instead of AcademicCard.
  const syntheticBookings: any[] = allItems.filter(i => {
    if (!ACADEMIC_CATS.includes(i._type)) return false;
    if (i.status === "open") return false; // Normal open listing — not a synthetic booking
    if (myActiveBookingByListing.has(i.id)) return false; // Real booking exists, no need to synthesize
    const uid = user?.id;
    const isLister = i.poster?.id === uid;
    const isBooker = i.bookedBy?.id === uid || i.bookedById === uid;
    if (!isLister && !isBooker) return false;
    // Provider already rejected → vanish from their dashboard entirely
    if (isLister && i.status === "rejected") return false;
    return true;
  }).map(i => ({
    id: `synthetic_${i.id}`,   // Fake display ID — actions must use listingId
    _type: i._type,
    _isBooking: true,
    _isSynthetic: true,         // Flag: use listing-level endpoints, not /bookings/:id/...
    listingId: i.id,            // Real listing UUID — used for API calls
    status: i.status,
    statusHistory: i.statusHistory,
    createdAt: i.createdAt,
    title: i.title,
    price: i.price,
    subject: i.subject,
    program: i.program,
    deadline: i.deadline,
    poster: i.poster,
    bookedBy: i.bookedBy || (i.bookedById ? { id: i.bookedById } : null),
    bookedById: i.bookedById,
  }));

  const isOpenListing = (item: any) => {
    // Academic listings always stay "open" (multi-booking model)
    if (ACADEMIC_CATS.includes(item._type)) {
      // Hide the poster's own listing from open listings (they can't book their own)
      return item.poster?.id !== user?.id;
    }
    if (!["open", "pending"].includes(item.status)) return false;
    // Delivery: students only see their own request (use raw ID as fallback if populated object is null)
    if (item._type === "deliveries" && !isProvider) {
      return item.requester?.id === user?.id || item.requesterId === user?.id;
    }
    return true;
  };

  const filteredItems   = getItemsForCat(activeCat);
  const allDeliveriesAndTasks = [...deliveries, ...tasks];

  // For academic tabs, active jobs = real booking records + synthetic (old-model) bookings
  // For delivery/task tabs, active jobs = listing items with non-idle status
  // For "all" tab, merge: non-academic active listings + all real bookings + all synthetic bookings
  // Rejected bookings: only show to the BOOKER (student), not the LISTER (provider)
  const isVisibleBooking = (b: any) => {
    if (["delivered", "dismissed"].includes(b.status)) return false;
    if (b.status === "rejected" && b._myPerspective === "lister") return false;
    return true;
  };

  const catBookings = ACADEMIC_CATS.includes(activeCat)
    ? myBookings.filter(b => b._type === activeCat && isVisibleBooking(b))
    : [];
  const activeJobs: any[] = ACADEMIC_CATS.includes(activeCat)
    ? [...catBookings, ...syntheticBookings.filter(b => b._type === activeCat)]
    : activeCat === "all"
      ? [
          ...allDeliveriesAndTasks.filter(isActiveJobLegacy),
          ...myBookings.filter(isVisibleBooking),
          ...syntheticBookings,
        ]
      : filteredItems.filter(isActiveJobLegacy);
  const openListings    = filteredItems.filter(isOpenListing);

  const totalActive     = allDeliveriesAndTasks.filter(isActiveJobLegacy).length
    + myBookings.filter(isVisibleBooking).length
    + syntheticBookings.length;
  const totalCompleted  = allDeliveriesAndTasks.filter((i: any) => i.status === "delivered").length + myBookings.filter(b => b.status === "delivered").length;
  const totalOpen       = allItems.filter(isOpenListing).length;

  // ── Pull-to-refresh ───────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([rA(), rC(), rD(), rT(), rP(), rBookings()]);
    } finally {
      setRefreshing(false);
    }
  }, [rA, rC, rD, rT, rP, rBookings]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const endpointMap: Record<string, string> = {
    assignments:    "/services/assignments",
    certifications: "/services/certifications",
    deliveries:     "/services/deliveries",
    tasks:          "/services/tasks",
    projects:       "/services/projects",
    bookings:       "/services/bookings",
  };

  // Dismiss rejection always operates on the booking record
  // For real service_bookings records: tab="bookings", action="dismiss-rejection"
  // For synthetic (old-model) listing bookings: tab=_type (assignments/etc), action="dismiss"
  const onDismissRejection = (id: string, tab: string) =>
    actionMutation.mutate({ id, action: tab === "bookings" ? "dismiss-rejection" : "dismiss", tab });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action, tab }: { id: string; action: string; tab: string }) => {
      setPendingId(id);
      const res = await apiRequest(`${endpointMap[tab]}/${id}/${action}`, { method: "POST" });
      const text = await res.text();
      let json: any = {};
      try { json = JSON.parse(text); } catch {
        throw new Error(res.ok ? "Unexpected server response" : `Server error (${res.status})`);
      }
      if (!res.ok) throw new Error(json.message || json.error || "Action failed");
      return json;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["services", vars.tab] });
      queryClient.invalidateQueries({ queryKey: ["services", "bookings"] });
      const msgs: Record<string, string> = {
        book: "Booked successfully!", apply: "Application sent!",
        accept: "Accepted!", reject: "Request declined", progress: "Status updated!", confirm: "Confirmed received!",
        "mark-paid": "Marked as paid!", "confirm-payment": "Payment confirmed!", complete: "Marked as arrived!",
        "dismiss-rejection": "Booking dismissed.", "dismiss": "Booking dismissed.",
      };
      showToast(msgs[vars.action] || "Done!", "success");
    },
    onError: (err: any) => showToast(err.message || "Action failed", "error"),
    onSettled: () => setPendingId(null),
  });

  const rateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest(`/services/deliveries/${id}/rate`, { method: "POST", body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to submit rating");
      return json;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["services", "deliveries"] }); showToast("Thanks for your rating!", "success"); },
    onError: (err: any) => showToast(err.message || "Failed to submit rating", "error"),
  });

  // ── Render a single item card ──────────────────────────────────────────────
  const renderCard = useCallback((item: any) => {
    const type = item._type;
    if (type === "assignments" || type === "certifications" || type === "projects") {
      // For each listing: find the current user's active booking + count of all active bookings
      const myBooking = myActiveBookingByListing.get(item.id);
      const bookingCount = myBookings.filter(b => b.listingId === item.id && !["delivered", "dismissed"].includes(b.status)).length;
      return (
        <AcademicCard
          key={item.id} item={item} C={C} serviceType={type} currentUserId={user?.id}
          onAction={(id: string, action: string) => actionMutation.mutate({ id, action, tab: type })}
          isPending={pendingId === item.id && actionMutation.isPending}
          myBooking={myBooking}
          bookingCount={bookingCount}
        />
      );
    }
    if (type === "deliveries") {
      return (
        <DeliveryCard
          key={item.id} item={item} C={C} currentUser={user}
          onAction={(id: string, action: string) => actionMutation.mutate({ id, action, tab: "deliveries" })}
          onRate={(id: string, data: any) => rateMutation.mutate({ id, data })}
          isPending={pendingId === item.id && (actionMutation.isPending || rateMutation.isPending)}
        />
      );
    }
    if (type === "tasks") {
      return (
        <TaskCard
          key={item.id} item={item} C={C} currentUserId={user?.id}
          onAction={(id: string) => actionMutation.mutate({ id, action: "apply", tab: "tasks" })}
          isPending={pendingId === item.id && actionMutation.isPending}
          hasApplied={false}
        />
      );
    }
    return null;
  }, [C, user, pendingId, actionMutation.isPending, rateMutation.isPending, myActiveBookingByListing, myBookings]);

  // ── Post helpers ───────────────────────────────────────────────────────────
  const postableCats = ["deliveries", "assignments", "certifications", "tasks", "projects"].filter(canPost);
  const openPostFor = (type: string) => { setPostType(type); setShowPostModal(true); };
  const handleFAB = () => {
    // If current tab is postable, post there; otherwise redirect to first postable cat
    const target = (activeCat !== "all" && canPost(activeCat))
      ? activeCat
      : (postableCats[0] || "deliveries");
    openPostFor(target);
  };

  return (
    <View style={[CS.container, { backgroundColor: C.background }]}>

      {/* ── Header ── */}
      <View style={[CS.header, { paddingTop: isWeb ? 67 : insets.top + 8, backgroundColor: C.background, borderBottomColor: C.border }]}>
        <View>
          <Text style={[CS.headerTitle, { color: C.text }]}>Services</Text>
          <Text style={[CS.headerSub, { color: C.textTertiary }]}>
            {totalActive > 0 ? `${totalActive} active · ` : ""}{totalOpen} open listing{totalOpen !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable style={[CS.headerIconBtn, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
            <Feather name="search" size={17} color={C.textSecondary} />
          </Pressable>
          <View>
            <Pressable style={[CS.headerIconBtn, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
              <Feather name="bell" size={17} color={C.textSecondary} />
            </Pressable>
            {totalActive > 0 && <View style={CS.notifDot} />}
          </View>
        </View>
      </View>

      {/* ── Category chips ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={CS.chipsRow}>
        {CHIPS.map(chip => {
          const active = activeCat === chip.id;
          return (
            <Pressable
              key={chip.id}
              onPress={() => setActiveCat(chip.id)}
              style={[CS.chip, {
                backgroundColor: active ? chip.bg : C.surface,
                borderColor: active ? chip.accent + "55" : C.border,
              }]}
            >
              <Text style={CS.chipEmoji}>{chip.emoji}</Text>
              <Text style={[CS.chipLabel, { color: active ? chip.accent : C.textTertiary }]}>{chip.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Content ── */}
      {isLoading ? (
        <View style={CS.center}>
          <ActivityIndicator color="#5B4FE8" size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: isWeb ? 120 : 110, paddingTop: 4 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#5B4FE8"
              colors={["#5B4FE8"]}
            />
          }
        >
          {/* Activity banner */}
          <View style={[CS.activityBanner, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[CS.activityIcon, { backgroundColor: "#EDE9FE" }]}>
              <Feather name="activity" size={16} color="#5B4FE8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[CS.activityTitle, { color: C.text }]}>Your activity</Text>
              <View style={{ flexDirection: "row", gap: 14, marginTop: 2 }}>
                <Text style={[CS.activityStat, { color: C.textSecondary }]}>
                  <Text style={{ color: "#5B4FE8", fontFamily: "Inter_700Bold" }}>{totalActive}</Text> active job{totalActive !== 1 ? "s" : ""}
                </Text>
                <Text style={[CS.activityStat, { color: C.textSecondary }]}>
                  <Text style={{ color: "#10B981", fontFamily: "Inter_700Bold" }}>{totalCompleted}</Text> completed
                </Text>
              </View>
            </View>
          </View>

          {/* Active Now */}
          {activeJobs.length > 0 && (
            <View style={CS.section}>
              <View style={CS.sectionHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={CS.pulseDot} />
                  <Text style={[CS.sectionTitle, { color: C.text }]}>Active Now</Text>
                </View>
                <Text style={[CS.sectionCount, { color: C.textTertiary }]}>{activeJobs.length} in progress</Text>
              </View>
              <View style={{ gap: 12 }}>
                {activeJobs.map(item => (
                  <CompactActiveCard
                    key={item.id}
                    item={item}
                    C={C}
                    user={user}
                    isPending={pendingId === item.id && actionMutation.isPending}
                    onTrackPress={(i: any) => setSelectedItem(i)}
                    onAccept={(id: string) => actionMutation.mutate({ id: item._isSynthetic ? item.listingId : id, action: "accept", tab: item._isSynthetic ? item._type : item._isBooking ? "bookings" : item._type })}
                    onReject={(id: string) => actionMutation.mutate({ id: item._isSynthetic ? item.listingId : id, action: "reject", tab: item._isSynthetic ? item._type : item._isBooking ? "bookings" : item._type })}
                    onDismissRejection={onDismissRejection}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Open Listings */}
          <View style={CS.section}>
            <View style={CS.sectionHeader}>
              <Text style={[CS.sectionTitle, { color: C.text }]}>Open Listings</Text>
              <Text style={[CS.sectionCount, { color: C.textTertiary }]}>{openListings.length} available</Text>
            </View>
            {openListings.length === 0 ? (
              <View style={[CS.emptyBlock, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Feather name="inbox" size={28} color={C.textTertiary} />
                <Text style={{ color: C.textTertiary, fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 10, textAlign: "center" }}>
                  {activeCat !== "all"
                    ? `No open ${CAT_META[activeCat]?.label || activeCat} listings right now`
                    : "No open listings right now"}
                </Text>
              </View>
            ) : (
              <View style={{ backgroundColor: C.surface, borderRadius: 16, borderWidth: 0.5, borderColor: C.border, overflow: "hidden" }}>
                {openListings.map((item: any, i: number) => (
                  <CompactListingRow
                    key={item.id}
                    item={item}
                    C={C}
                    user={user}
                    isLast={i === openListings.length - 1}
                    isPending={pendingId === item.id && actionMutation.isPending}
                    hasActiveBooking={!!myActiveBookingByListing.get(item.id)}
                    onBook={(id: string, type: string) => actionMutation.mutate({ id, action: "book", tab: type })}
                    onAccept={(id: string, type: string) => actionMutation.mutate({ id, action: "accept", tab: type })}
                    onReject={(id: string, type: string) => actionMutation.mutate({ id, action: "reject", tab: type })}
                    onApply={(id: string, type: string) => actionMutation.mutate({ id, action: "apply", tab: type })}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Post CTA */}
          {postableCats.length > 0 && (
            <View style={[CS.postCTA, { backgroundColor: "#EDE9FE", borderColor: "#C4B5FD" }]}>
              <Feather name="zap" size={18} color="#5B4FE8" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#1C1917" }}>Offer a service or need help?</Text>
                <Text style={{ fontSize: 11, color: "#78716C", marginTop: 1 }}>Post in under 60 seconds</Text>
              </View>
              <Pressable
                style={{ backgroundColor: "#5B4FE8", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 5 }}
                onPress={handleFAB}
              >
                <Feather name="plus" size={14} color="#fff" />
                <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 }}>Post</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}

      {/* FAB */}
      {postableCats.length > 0 && (
        <Pressable style={[CS.fab, { backgroundColor: "#5B4FE8" }]} onPress={handleFAB}>
          <Feather name="plus" size={22} color="#fff" />
        </Pressable>
      )}

      {/* ── Detail Modal (Track Order tap) ── */}
      {selectedItem && (
        <DetailModal
          item={selectedItem}
          C={C}
          user={user}
          onClose={() => setSelectedItem(null)}
          isPending={actionMutation.isPending && (pendingId === selectedItem?.id || pendingId === selectedItem?.listingId)}
          myBooking={selectedItem._isBooking ? undefined : myActiveBookingByListing.get(selectedItem.id)}
          onAction={(id: string, action: string) => actionMutation.mutate({ id, action, tab: selectedItem._isSynthetic ? selectedItem._type : selectedItem._isBooking ? "bookings" : selectedItem._type })}
          onRate={(id: string, data: any) => rateMutation.mutate({ id, data })}
        />
      )}

      {/* ── Post Modals ── */}
      {(postType === "assignments" || postType === "certifications" || postType === "projects") && (
        <PostAssignmentModal
          visible={showPostModal} onClose={() => setShowPostModal(false)}
          C={C} apiRequest={apiRequest} queryClient={queryClient} showToast={showToast}
          user={user} serviceType={postType}
        />
      )}
      {postType === "deliveries" && (
        <PostDeliveryModal
          visible={showPostModal} onClose={() => setShowPostModal(false)}
          C={C} apiRequest={apiRequest} queryClient={queryClient} showToast={showToast}
          outletItems={outletItems}
        />
      )}
      {postType === "tasks" && (
        <PostTaskModal
          visible={showPostModal} onClose={() => setShowPostModal(false)}
          C={C} apiRequest={apiRequest} queryClient={queryClient} showToast={showToast}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CS = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },

  // ── Header ────────────────────────────────────────────────────────────────
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  headerIconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 0.5 },
  notifDot: { position: "absolute", top: 0, right: 0, width: 9, height: 9, borderRadius: 5, backgroundColor: "#EF4444", borderWidth: 1.5, borderColor: "#FAF8F4" },

  // ── Category chips ────────────────────────────────────────────────────────
  chipsRow: { paddingHorizontal: 14, paddingVertical: 11, gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  chipEmoji: { fontSize: 12 },
  chipLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // ── Sections ──────────────────────────────────────────────────────────────
  activityBanner: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 14, marginTop: 12, padding: 12, borderRadius: 14, borderWidth: 0.5 },
  activityIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  activityTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  activityStat: { fontSize: 11, fontFamily: "Inter_400Regular" },
  section: { paddingHorizontal: 14, marginTop: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  sectionCount: { fontSize: 11, fontFamily: "Inter_400Regular" },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" },
  emptyBlock: { alignItems: "center", justifyContent: "center", padding: 32, borderRadius: 16, borderWidth: 0.5 },
  postCTA: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 14, marginTop: 16, padding: 14, borderRadius: 14, borderWidth: 0.5 },
  fab: { position: "absolute", bottom: 90, right: 16, width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", shadowColor: "#5B4FE8", shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8 },

  // ── Card sub-components (kept for AcademicCard / DeliveryCard / TaskCard) ─
  card: { borderRadius: 16, borderWidth: 0.5, padding: 14 },
  cardTop: { flexDirection: "row", gap: 12, marginBottom: 10 },
  cardTitle: { fontSize: 15, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  cardAuthor: { fontSize: 12, marginTop: 3, fontFamily: "Inter_400Regular" },
  cardPrice: { fontSize: 18, fontFamily: "Inter_700Bold" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  cardDesc: { fontSize: 13, lineHeight: 18, marginBottom: 8, fontFamily: "Inter_400Regular" },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  actionBtn: { paddingVertical: 11, borderRadius: 10, alignItems: "center", marginTop: 4 },
  actionBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  ownerBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  ownerBadgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  empty: { alignItems: "center", paddingTop: 50, gap: 12 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, marginTop: 4 },
  emptyBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});

const FS = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: "90%" },
  modalHandle: { width: 40, height: 4, backgroundColor: "#ccc", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sectionLabel: { fontSize: 13, marginBottom: 10, marginTop: 4, fontFamily: "Inter_500Medium" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  fieldLabel: { fontSize: 13, marginBottom: 8, fontFamily: "Inter_500Medium" },
  fieldInput: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  fieldText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  submitBtn: { paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 8, marginBottom: 20 },
  submitBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
