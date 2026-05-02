import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Modal,
  useColorScheme, FlatList, ActivityIndicator, Platform,
  TextInput, Linking, Animated, RefreshControl, Share,
} from "react-native";
import { Image } from "expo-image";
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
      queryClient.invalidateQueries({ queryKey: ["services", "all"] });
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["services", "all"] }); reset(); onClose(); showToast("Delivery request posted!", "success"); },
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["services", "all"] }); reset(); onClose(); showToast("Task posted!", "success"); },
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

  // Provider's next step button label (shown inside the detail modal only)
  const agentNextAction = (() => {
    if (!isAgent) return null;
    // Must take selfie first before heading to pickup (selfie is done via Active Now card)
    if (item.status === "accepted") {
      if (!item.selfieTimestamp) return null; // selfie not yet taken
      return { label: "Head to Pickup", color: "#F59E0B" };
    }
    // For outlet at reaching_pickup: block progress until student has paid
    if (item.status === "reaching_pickup" && isOutlet && item.chargeStatus !== "paid") {
      return null; // Payment not yet confirmed
    }
    const map: Record<string, { label: string; color: string }> = {
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

      {/* Agent verification photos — agent sees text confirmation */}
      {isAgent && item.selfieTimestamp && (
        <View style={{ backgroundColor: "#F0FDF4", borderRadius: 10, padding: 10, marginTop: 4, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Feather name="camera" size={14} color="#059669" />
          <Text style={{ color: "#059669", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>Live selfie uploaded ✓</Text>
        </View>
      )}
      {isAgent && item.locationPhotoTimestamp && (
        <View style={{ backgroundColor: "#F0FDF4", borderRadius: 10, padding: 10, marginTop: 4, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Feather name="map-pin" size={14} color="#059669" />
          <Text style={{ color: "#059669", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>Location photo uploaded ✓</Text>
        </View>
      )}

      {/* Requester: see agent's live selfie */}
      {isRequester && item.selfieUrl && (
        <View style={{ backgroundColor: "#F0FDF4", borderRadius: 12, padding: 12, marginTop: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Feather name="camera" size={14} color="#059669" />
            <Text style={{ color: "#059669", fontFamily: "Inter_700Bold", fontSize: 13 }}>Agent Verification Selfie</Text>
          </View>
          <Text style={{ color: "#6B7280", fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 10 }}>
            Your delivery agent took this live selfie to verify their identity before picking up your order.
          </Text>
          <View style={{ borderRadius: 10, overflow: "hidden", backgroundColor: "#fff" }}>
            <Image
              source={{ uri: item.selfieUrl }}
              style={{ width: "100%", height: 220, borderRadius: 10 }}
              contentFit="cover"
              cachePolicy="disk"
            />
          </View>
          {item.selfieTimestamp && (
            <Text style={{ color: "#9CA3AF", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 6, textAlign: "right" }}>
              Taken at {new Date(item.selfieTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          )}
        </View>
      )}

      {/* Requester: see agent's location photo at drop point */}
      {isRequester && item.locationPhotoUrl && (
        <View style={{ backgroundColor: "#EDE9FE", borderRadius: 12, padding: 12, marginTop: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Feather name="map-pin" size={14} color="#5B4FE8" />
            <Text style={{ color: "#5B4FE8", fontFamily: "Inter_700Bold", fontSize: 13 }}>Agent at Your Location</Text>
          </View>
          <Text style={{ color: "#6B7280", fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 10 }}>
            Your agent is at your drop location and took this photo as proof of arrival.
          </Text>
          <View style={{ borderRadius: 10, overflow: "hidden", backgroundColor: "#fff" }}>
            <Image
              source={{ uri: item.locationPhotoUrl }}
              style={{ width: "100%", height: 220, borderRadius: 10 }}
              contentFit="cover"
              cachePolicy="disk"
            />
          </View>
          {item.locationPhotoTimestamp && (
            <Text style={{ color: "#9CA3AF", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 6, textAlign: "right" }}>
              Taken at {new Date(item.locationPhotoTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          )}
        </View>
      )}

      {/* Student: QR image from agent (outlet food payment — only during reaching_pickup phase) */}
      {isRequester && item.status === "reaching_pickup" && item.qrImageUrl && item.chargeStatus !== "paid" && (
        <View style={{ backgroundColor: "#FEF3C7", borderRadius: 12, padding: 12, marginTop: 8 }}>
          <Text style={{ color: "#92400E", fontFamily: "Inter_700Bold", fontSize: 13, marginBottom: 4 }}>💳 {isOutlet ? "Outlet Payment Required" : "Delivery Charge"}</Text>
          <Text style={{ color: "#78716C", fontSize: 11, marginBottom: 10 }}>
            {isOutlet
              ? `Scan the QR below to pay ₹${subtotal.toFixed(0)} at the outlet. Then upload your payment screenshot from the order card.`
              : "Agent has shared their UPI QR. Pay from the order card."}
          </Text>
          <View style={{ backgroundColor: "#fff", borderRadius: 10, overflow: "hidden", alignItems: "center", padding: 8 }}>
            <Image source={{ uri: item.qrImageUrl }} style={{ width: 180, height: 180, borderRadius: 8 }} contentFit="contain" cachePolicy="disk" />
            <Text style={{ fontSize: 11, color: "#78716C", paddingBottom: 8, paddingTop: 4 }}>Scan to pay</Text>
          </View>
          {item.chargeStatus === "screenshot_uploaded" && (
            <View style={{ marginTop: 8, backgroundColor: "#D1FAE5", borderRadius: 8, padding: 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Feather name="clock" size={12} color="#059669" />
              <Text style={{ color: "#059669", fontSize: 11, fontFamily: "Inter_500Medium" }}>Screenshot submitted — waiting for agent confirmation</Text>
            </View>
          )}
          {item.chargeStatus === "payment_rejected" && (
            <View style={{ marginTop: 8, backgroundColor: "#FEE2E2", borderRadius: 8, padding: 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Feather name="x-circle" size={12} color="#EF4444" />
              <Text style={{ color: "#EF4444", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>Payment rejected — please re-upload your screenshot below</Text>
            </View>
          )}
        </View>
      )}
      {isRequester && item.chargeStatus === "paid" && (
        <View style={{ backgroundColor: "#D1FAE5", borderRadius: 10, padding: 10, marginTop: 6, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Feather name="check-circle" size={14} color="#059669" />
          <Text style={{ color: "#059669", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
            {isOutlet && item.status !== "completed" ? "Food payment confirmed ✓" : "Delivery charge paid ✓"}
          </Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={{ gap: 8, marginTop: 8 }}>
        {/* Requester: cancel pending delivery */}
        {isRequester && item.status === "pending" && (
          <Pressable style={[CS.actionBtn, { backgroundColor: "#EF4444" }, isPending && { opacity: 0.6 }]}
            onPress={() => onAction(item.id, "cancel")} disabled={isPending}>
            {isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={CS.actionBtnText}>Cancel Delivery</Text>}
          </Pressable>
        )}

        {/* Agent: info when selfie is needed */}
        {isAgent && item.status === "accepted" && !item.selfieTimestamp && (
          <View style={{ backgroundColor: "#EDE9FE", borderRadius: 10, padding: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Feather name="camera" size={14} color="#5B4FE8" />
            <Text style={{ color: "#5B4FE8", fontFamily: "Inter_500Medium", fontSize: 12, flex: 1 }}>Take Live Selfie from the order card to continue</Text>
          </View>
        )}

        {/* Agent: payment gating info for outlet */}
        {isAgent && item.status === "reaching_pickup" && isOutlet && item.chargeStatus !== "paid" && (
          <View style={{ backgroundColor: "#FEF3C7", borderRadius: 10, padding: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Feather name="clock" size={14} color="#D97706" />
            <Text style={{ color: "#92400E", fontFamily: "Inter_500Medium", fontSize: 12, flex: 1 }}>
              {item.chargeStatus === "pending" ? "Upload Payment QR from the order card first" :
               item.chargeStatus === "screenshot_uploaded" ? "Confirm payment received from the order card" :
               "Waiting for student to pay…"}
            </Text>
          </View>
        )}

        {/* Agent: progress through steps */}
        {agentNextAction && (
          <Pressable style={[CS.actionBtn, { backgroundColor: agentNextAction.color }, isPending && { opacity: 0.6 }]}
            onPress={() => onAction(item.id, "progress")} disabled={isPending}>
            {isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={CS.actionBtnText}>{agentNextAction.label}</Text>}
          </Pressable>
        )}

        {/* Agent: location photo / delivery charge prompt at completed */}
        {isAgent && item.status === "completed" && !item.locationPhotoTimestamp && (
          <View style={{ backgroundColor: "#EDE9FE", borderRadius: 10, padding: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Feather name="camera" size={14} color="#5B4FE8" />
            <Text style={{ color: "#5B4FE8", fontFamily: "Inter_500Medium", fontSize: 12, flex: 1 }}>Take Live Selfie from the order card to proceed</Text>
          </View>
        )}
        {isAgent && item.status === "completed" && item.locationPhotoTimestamp && item.chargeStatus !== "paid" && (() => {
          const agentFee = parseFloat(item.deliveryFee || "30");
          const agentGst = parseFloat((agentFee * 0.18).toFixed(2));
          const agentTotal = agentFee + agentGst;
          return (
            <View style={{ backgroundColor: "#ECFDF5", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#10B981", gap: 2 }}>
              <Text style={{ color: "#065F46", fontFamily: "Inter_700Bold", fontSize: 13 }}>💰 Collect Delivery Charge from Student</Text>
              <Text style={{ color: "#059669", fontFamily: "Inter_400Regular", fontSize: 12 }}>Waiting for student to pay ₹{agentTotal.toFixed(0)} via wallet…</Text>
            </View>
          );
        })()}

        {/* Student: confirm received (location photo + charge must be paid first) */}
        {studentCanConfirm && item.chargeStatus === "paid" && item.locationPhotoTimestamp && (
          <Pressable style={[CS.actionBtn, { backgroundColor: "#10B981" }, isPending && { opacity: 0.6 }]}
            onPress={() => onAction(item.id, "confirm")} disabled={isPending}>
            {isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={CS.actionBtnText}>✓ Mark Order Received</Text>}
          </Pressable>
        )}
        {studentCanConfirm && !(item.chargeStatus === "paid" && item.locationPhotoTimestamp) && (
          <View style={{ backgroundColor: "#FEF3C7", borderRadius: 10, padding: 10 }}>
            <Text style={{ color: "#92400E", fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" }}>
              {!item.locationPhotoTimestamp ? "Waiting for agent to arrive and verify location…" : "Pay the delivery charge from the order card first"}
            </Text>
          </View>
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

        {/* Cancelled */}
        {item.status === "cancelled" && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEF2F2", borderRadius: 10, padding: 10 }}>
            <Feather name="x-circle" size={16} color="#EF4444" />
            <Text style={{ color: "#EF4444", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Delivery cancelled</Text>
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
      const labels = ["Awaiting Agent", "Accepted", "Heading Out", "Order Placed", "Collecting", "On the Way", "Arrived", "Delivered"];
      const map: Record<string, number> = { pending: 0, accepted: 1, reaching_pickup: 2, placed_order: 3, collecting_order: 4, reaching_drop: 5, completed: 6, delivered: 7 };
      return { labels, index: map[s] ?? 0 };
    }
    const labels = ["Awaiting Agent", "Accepted", "Heading Out", "On the Way", "Arrived", "Delivered"];
    const map: Record<string, number> = { pending: 0, accepted: 1, reaching_pickup: 2, reaching_drop: 3, completed: 4, delivered: 5 };
    return { labels, index: map[s] ?? 0 };
  }
  const labels = ["Booked", "Accepted", "In Progress", "Completed", "Done"];
  const map: Record<string, number> = { booked: 0, accepted: 1, in_progress: 2, completed: 3, delivered: 4 };
  return { labels, index: map[s] ?? 0 };
}

// ─── Delivery Active CTA — contextual buttons for delivery Active Now cards ───

function DeliveryActiveCTA({ item, isAgent, isRequester, isPending, cameraActionId, onCameraAction, onOpenQRUpload, onOpenPaymentModal, onPayDeliveryCharge, onReviewPayment, onMarkReceived, onTrackPress, onCancelDelivery, meta }: any) {
  const isOutlet = item.pickupType === "outlet";
  const deliveryFee = parseFloat(item.deliveryFee || "30");
  const gst = parseFloat((deliveryFee * 0.18).toFixed(2));
  const subtotal = item.subtotal ? parseFloat(item.subtotal) : 0;

  // Requester's own pending delivery — no agent has accepted yet
  if (isRequester && item.status === "pending") {
    return (
      <Pressable
        style={{ marginTop: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: "#EF4444", alignItems: "center" }}
        onPress={() => onCancelDelivery?.(item.id)}
        disabled={isPending}
      >
        {isPending
          ? <ActivityIndicator size="small" color="#fff" />
          : <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 }}>Cancel Order</Text>}
      </Pressable>
    );
  }

  if (isAgent) {
    // 1. Accepted + no selfie → show "Take Live Selfie" on card
    if (item.status === "accepted" && !item.selfieTimestamp) {
      const loading = cameraActionId === `${item.id}-selfie`;
      return (
        <Pressable
          style={{ marginTop: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: "#5B4FE8", alignItems: "center" }}
          onPress={() => onCameraAction(item.id, "selfie")} disabled={!!cameraActionId || isPending}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> :
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 }}>📸 Take Live Selfie</Text>}
        </Pressable>
      );
    }
    // 2. Accepted + selfie done → Update Order Status (opens modal for "Head to Pickup")
    if (item.status === "accepted" && item.selfieTimestamp) {
      return (
        <Pressable style={{ marginTop: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: meta.accent, alignItems: "center" }}
          onPress={() => onTrackPress(item)}>
          <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 }}>Update Order Status</Text>
        </Pressable>
      );
    }
    // 3. reaching_pickup + outlet → upload QR or await payment
    if (item.status === "reaching_pickup" && isOutlet) {
      if (item.chargeStatus === "pending") {
        return (
          <Pressable style={{ marginTop: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: "#F59E0B", alignItems: "center" }}
            onPress={() => onOpenQRUpload(item)} disabled={isPending}>
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 }}>📤 Upload Payment QR</Text>
          </Pressable>
        );
      }
      if (item.chargeStatus === "screenshot_uploaded") {
        return (
          <Pressable style={{ marginTop: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: "#10B981", alignItems: "center" }}
            onPress={() => onReviewPayment(item)} disabled={isPending}>
            {isPending ? <ActivityIndicator size="small" color="#fff" /> :
              <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 }}>🔍 Review Payment Screenshot</Text>}
          </Pressable>
        );
      }
      if (item.chargeStatus === "paid") {
        return (
          <Pressable style={{ marginTop: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: meta.accent, alignItems: "center" }}
            onPress={() => onTrackPress(item)}>
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 }}>Update Order Status</Text>
          </Pressable>
        );
      }
      return (
        <View style={{ marginTop: 12, flexDirection: "row", gap: 8, alignItems: "center" }}>
          <View style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: "#FEF3C7", alignItems: "center" }}>
            <Text style={{ color: "#92400E", fontFamily: "Inter_500Medium", fontSize: 11 }}>⌛ Waiting for student payment...</Text>
          </View>
          <Pressable
            style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#F59E0B", alignItems: "center" }}
            onPress={() => onOpenQRUpload(item)} disabled={isPending}>
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 11 }}>🔄 Re-upload QR</Text>
          </Pressable>
        </View>
      );
    }
    // 4. Arrived at drop (completed) + no location photo → take selfie (location verification)
    if (item.status === "completed" && !item.locationPhotoTimestamp) {
      const loading = cameraActionId === `${item.id}-location-photo`;
      return (
        <Pressable
          style={{ marginTop: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: "#5B4FE8", alignItems: "center" }}
          onPress={() => onCameraAction(item.id, "location-photo")} disabled={!!cameraActionId || isPending}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> :
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 }}>📸 Take Live Selfie</Text>}
        </Pressable>
      );
    }
    // 5. completed + location photo taken + awaiting charge payment from student
    if (item.status === "completed" && item.locationPhotoTimestamp && item.chargeStatus !== "paid") {
      const total = deliveryFee + gst;
      return (
        <View style={{ marginTop: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#10B981", alignItems: "center", gap: 4 }}>
          <Text style={{ color: "#065F46", fontFamily: "Inter_700Bold", fontSize: 13 }}>💰 Collect Delivery Charge from Student</Text>
          <Text style={{ color: "#059669", fontFamily: "Inter_400Regular", fontSize: 11 }}>Waiting for student to pay ₹{total.toFixed(0)} via wallet…</Text>
        </View>
      );
    }
    // 6. Completed + location photo taken + charge already paid → awaiting student confirmation
    if (item.status === "completed" && item.locationPhotoTimestamp && item.chargeStatus === "paid") {
      return (
        <View style={{ marginTop: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: "#D1FAE5", borderWidth: 1, borderColor: "#10B981", alignItems: "center", gap: 4 }}>
          <Text style={{ color: "#065F46", fontFamily: "Inter_700Bold", fontSize: 13 }}>✅ Payment Received!</Text>
          <Text style={{ color: "#059669", fontFamily: "Inter_400Regular", fontSize: 11 }}>Waiting for student to confirm receipt…</Text>
        </View>
      );
    }
    // 7. Default — Update Order Status
    return (
      <Pressable style={{ marginTop: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: meta.accent, alignItems: "center" }}
        onPress={() => onTrackPress(item)} disabled={isPending}>
        {isPending ? <ActivityIndicator size="small" color="#fff" /> :
          <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 }}>Update Order Status</Text>}
      </Pressable>
    );
  }

  if (isRequester) {
    // Outlet food payment: QR shared during reaching_pickup phase only
    if (isOutlet && item.status === "reaching_pickup" && (item.chargeStatus === "qr_shared" || item.chargeStatus === "payment_rejected") && !["paid", "screenshot_uploaded"].includes(item.chargeStatus || "")) {
      const isRejected = item.chargeStatus === "payment_rejected";
      return (
        <Pressable style={{ marginTop: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: isRejected ? "#EF4444" : "#F59E0B", alignItems: "center" }}
          onPress={() => onOpenPaymentModal(item)}>
          <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 }}>
            {isRejected ? "🔄 Re-upload Payment Screenshot" : `💳 Complete Payment ₹${subtotal.toFixed(0)}`}
          </Text>
        </Pressable>
      );
    }
    // Outlet food payment: screenshot uploaded, waiting for agent confirmation
    if (isOutlet && item.status === "reaching_pickup" && item.chargeStatus === "screenshot_uploaded") {
      return (
        <View style={{ marginTop: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: "#D1FAE5", alignItems: "center" }}>
          <Text style={{ color: "#059669", fontFamily: "Inter_500Medium", fontSize: 12 }}>⌛ Waiting for agent to confirm payment...</Text>
        </View>
      );
    }
    // Arrived at drop + location photo taken + delivery charge not yet paid (gate AND outlet)
    if (item.status === "completed" && item.locationPhotoTimestamp && item.chargeStatus !== "paid") {
      const total = deliveryFee + gst;
      return (
        <Pressable style={{ marginTop: 12, paddingVertical: 13, borderRadius: 12, backgroundColor: "#10B981", alignItems: "center" }}
          onPress={() => onPayDeliveryCharge(item)} disabled={isPending}>
          {isPending ? <ActivityIndicator size="small" color="#fff" /> :
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 }}>💳 Pay Delivery Charge ₹{total.toFixed(0)} (incl. GST)</Text>}
        </Pressable>
      );
    }
    // Completed + location photo taken + charge paid → Mark Order Received
    if (item.status === "completed" && item.locationPhotoTimestamp && item.chargeStatus === "paid") {
      return (
        <Pressable style={{ marginTop: 12, paddingVertical: 13, borderRadius: 12, backgroundColor: "#10B981", alignItems: "center" }}
          onPress={() => onMarkReceived(item.id)} disabled={isPending}>
          {isPending ? <ActivityIndicator size="small" color="#fff" /> :
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 }}>✓ Mark Order Received</Text>}
        </Pressable>
      );
    }
    // Default: Track Order
    return (
      <Pressable style={{ marginTop: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: meta.accent, alignItems: "center" }}
        onPress={() => onTrackPress(item)}>
        <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 }}>Track Order →</Text>
      </Pressable>
    );
  }

  return null;
}

// ─── Compact Active Job Card (matches Priority Lane mockup exactly) ────────────

function CompactActiveCard({ item, C, user, onTrackPress, onAccept, onReject, onDismissRejection, isPending, onCameraAction, onOpenQRUpload, onOpenPaymentModal, onPayDeliveryCharge, onReviewPayment, onMarkReceived, onCancelDelivery, isOrderChatOpen, onToggleOrderChat, cameraActionId }: any) {
  const meta = CAT_META[item._type] || CAT_META.tasks;
  const { labels, index } = getStepsForItem(item);
  const progress = labels.length > 1 ? index / (labels.length - 1) : 1;
  const router = useRouter();

  const uid = user?.id;
  const isProvider = item.poster?.id === uid || item.deliveryAgent?.id === uid || item.assignedTo?.id === uid || item.deliveryAgentId === uid;
  // For delivery cards, distinguish agent vs requester role
  const isDelivery = item._type === "deliveries";
  const isAgent = isDelivery && (item.deliveryAgent?.id === uid || item.deliveryAgentId === uid);
  const isRequester = isDelivery && (item.requester?.id === uid || item.requesterId === uid);
  // Provider has not yet accepted — needs to review the booking
  const awaitingAcceptance = isProvider && ["booked", "pending"].includes(item.status);
  // Agent (provider role) viewing a pending delivery they can accept (not yet assigned to anyone)
  const canAcceptPendingDelivery = isDelivery && item.status === "pending" && !isRequester && user?.role === "provider";

  const title = item.title || item.pickupLocation || "Delivery Request";
  // Who placed/requested the order (student side)
  const studentName = item.bookedBy?.name || item.requester?.name || null;
  // Who is handling the order (provider/agent side)
  const agentName = item.poster?.name || item.deliveryAgent?.name || item.assignedTo?.name || null;
  const agentId   = item.poster?.id   || item.deliveryAgent?.id   || item.assignedTo?.id   || null;
  const agentPhone = item.poster?.phone || item.deliveryAgent?.phone || item.assignedTo?.phone || null;
  // Who is on the student/requester side of this order
  const studentId    = item.student?.id    || item.bookedBy?.id    || item.requester?.id    || null;
  const studentName2 = item.student?.name  || item.bookedBy?.name  || item.requester?.name  || null;
  const studentPhone = item.student?.phone || item.bookedBy?.phone || item.requester?.phone || null;
  // Which phone number to dial and whose name to show depends on which side we're on
  const callPhone = isProvider ? studentPhone : agentPhone;
  const callLabel = isProvider ? (studentName2 || "Student") : (agentName || "Agent");
  const isAcceptedOrBeyond = !["open", "pending", "booked", "rejected", "cancelled", "delivered", "dismissed"].includes(item.status);
  // Show Call button for BOTH sides when there's a number to call
  const showContactButtons = isAcceptedOrBeyond && !!callPhone;
  // Show Text (chat) button for BOTH sides — student contacts agent, agent contacts student
  const showChatButton = isAcceptedOrBeyond && ((!isProvider && !!agentId) || (isProvider && !!studentId));
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
          {agentName && agentId ? (
            <Pressable onPress={() => router.push(`/profile/${agentId}` as any)} hitSlop={8}>
              <Text style={{ fontSize: 9, color: meta.accent, fontFamily: "Inter_600SemiBold", textDecorationLine: "underline" }}>Agent {agentName}</Text>
            </Pressable>
          ) : agentName ? (
            <Text style={{ fontSize: 9, color: "#78716C" }}>Agent {agentName}</Text>
          ) : null}
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

            {/* ── Contact buttons: Call (student only) + Text/Chat (both sides) ── */}
            {(showContactButtons || showChatButton) && (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                {/* Call — both sides, dials the counterparty's number */}
                {showContactButtons ? (
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${callPhone}`)}
                    style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#D1FAE5", paddingVertical: 8, borderRadius: 10 }}
                  >
                    <Feather name="phone" size={13} color="#059669" />
                    <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: "#059669" }}>Call {callLabel}</Text>
                  </Pressable>
                ) : null}
                {/* Text/Chat — shown to both requester and agent sides */}
                {showChatButton && (
                  <Pressable
                    onPress={() => onToggleOrderChat?.(item)}
                    style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: isOrderChatOpen ? "#5B4FE8" : "#EDE9FE", paddingVertical: 8, borderRadius: 10 }}
                  >
                    <Feather name="message-circle" size={13} color={isOrderChatOpen ? "#fff" : "#5B4FE8"} />
                    <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: isOrderChatOpen ? "#fff" : "#5B4FE8" }}>{isOrderChatOpen ? "Close Chat" : "Text"}</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* CTA — Accept/Reject for provider awaiting acceptance or unaccepted delivery; delivery-aware CTA; status button otherwise */}
            {awaitingAcceptance || canAcceptPendingDelivery ? (
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
            ) : isDelivery ? (
              <DeliveryActiveCTA
                item={item} isAgent={isAgent} isRequester={isRequester}
                isPending={isPending} cameraActionId={cameraActionId}
                onCameraAction={onCameraAction} onOpenQRUpload={onOpenQRUpload}
                onOpenPaymentModal={onOpenPaymentModal} onPayDeliveryCharge={onPayDeliveryCharge}
                onReviewPayment={onReviewPayment} onMarkReceived={onMarkReceived}
                onTrackPress={onTrackPress} onCancelDelivery={onCancelDelivery} meta={meta}
              />
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

        {/* ── Inline order chat panel — shown when Text button is active ── */}
        {isOrderChatOpen && (
          <OrderMiniChat
            item={item}
            C={C}
            onClose={() => onToggleOrderChat?.(null)}
          />
        )}
      </View>
    </View>
  );
}

// ─── Order Mini Chat — inline, order-scoped chat panel ───────────────────────

function OrderMiniChat({ item, C, onClose }: any) {
  const { apiRequest } = useAuth();
  const { showToast } = useToast();
  const scrollRef = useRef<any>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  // Local optimistic messages added immediately on send
  const [optimistic, setOptimistic] = useState<any[]>([]);
  const orderId = item.id;
  const orderType = item._type;
  const orderTitle = item.title || item.pickupLocation || "Order";

  const { data, refetch } = useQuery({
    queryKey: ["order-chat", orderId],
    queryFn: async () => {
      const res = await apiRequest(`/services/order-chat/${orderId}?orderType=${orderType}`);
      if (!res.ok) return { messages: [] };
      return res.json();
    },
    refetchInterval: 6000,
  });

  // Merge server messages + optimistic ones, deduplicating by content+timestamp proximity
  const serverMessages: any[] = data?.messages ?? [];
  const allMessages = [...serverMessages, ...optimistic.filter(o =>
    !serverMessages.some(s => s.content === o.content && Math.abs(new Date(s.createdAt).getTime() - o.createdAt) < 10000)
  )].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (allMessages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [allMessages.length]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    // Optimistic: add immediately to local state
    const tempMsg = { id: `temp-${Date.now()}`, content, isSelf: true, senderName: "You", createdAt: Date.now() };
    setOptimistic(prev => [...prev, tempMsg]);
    setText("");
    try {
      const res = await apiRequest(`/services/order-chat/${orderId}`, {
        method: "POST",
        body: JSON.stringify({ content, orderType, orderTitle }),
      });
      if (!res.ok) throw new Error("send failed");
      // Refresh from server to get real message ID
      await refetch();
      // Remove the optimistic placeholder now server has the real one
      setOptimistic(prev => prev.filter(m => m.id !== tempMsg.id));
    } catch {
      // Roll back optimistic message and show error
      setOptimistic(prev => prev.filter(m => m.id !== tempMsg.id));
      setText(content);
      showToast("Failed to send message", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ marginTop: 12, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "#E0D9FF" }}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#EDE9FE" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Feather name="message-circle" size={13} color="#5B4FE8" />
          <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: "#5B4FE8" }}>Order Chat</Text>
        </View>
        <Pressable onPress={onClose} style={{ padding: 4 }}>
          <Feather name="x" size={14} color="#5B4FE8" />
        </Pressable>
      </View>

      {/* Messages list */}
      <View style={{ backgroundColor: "#F9F8FF", minHeight: 80, maxHeight: 210 }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 10, paddingBottom: 6 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          scrollEventThrottle={16}
        >
          {allMessages.length === 0 ? (
            <Text style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", paddingVertical: 18, fontFamily: "Inter_400Regular" }}>
              No messages yet — say hello!
            </Text>
          ) : (
            allMessages.map((msg: any) => (
              <View key={msg.id} style={{ alignSelf: msg.isSelf ? "flex-end" : "flex-start", maxWidth: "80%", marginBottom: 6 }}>
                <View style={{
                  backgroundColor: msg.isSelf ? "#5B4FE8" : "#FFFFFF",
                  paddingHorizontal: 11,
                  paddingVertical: 7,
                  borderRadius: 16,
                  borderBottomRightRadius: msg.isSelf ? 3 : 16,
                  borderBottomLeftRadius: msg.isSelf ? 16 : 3,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06,
                  shadowRadius: 2,
                  elevation: 1,
                  ...(!msg.isSelf ? { borderWidth: 0.5, borderColor: "#E5E7EB" } : {}),
                }}>
                  <Text style={{ fontSize: 13, color: msg.isSelf ? "#FFFFFF" : "#111827", fontFamily: "Inter_400Regular", lineHeight: 18 }}>
                    {msg.content}
                  </Text>
                </View>
                <Text style={{ fontSize: 9, color: "#9CA3AF", fontFamily: "Inter_400Regular", marginTop: 2, textAlign: msg.isSelf ? "right" : "left" }}>
                  {msg.isSelf ? "You" : msg.senderName} · {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Input row */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 8, backgroundColor: "#fff", borderTopWidth: 0.5, borderColor: "#E0D9FF" }}>
        <TextInput
          style={{ flex: 1, fontSize: 13, color: "#111827", fontFamily: "Inter_400Regular", backgroundColor: "#F3F4F6", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }}
          placeholder="Type a message…"
          placeholderTextColor="#9CA3AF"
          value={text}
          onChangeText={setText}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <Pressable
          onPress={handleSend}
          disabled={!text.trim() || sending}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: text.trim() ? "#5B4FE8" : "#E5E7EB", alignItems: "center", justifyContent: "center" }}
        >
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Feather name="send" size={14} color={text.trim() ? "#fff" : "#9CA3AF"} />}
        </Pressable>
      </View>
    </View>
  );
}

// ─── Open Listing Card (styled like CompactActiveCard — full card with header strip) ──

function CompactListingRow({ item, C, user, onBook, onAccept, onReject, onApply, onCancel, isPending, hasActiveBooking }: any) {
  const meta = CAT_META[item._type] || CAT_META.tasks;
  const uid = user?.id;
  const router = useRouter();
  const isOwnListing = item.poster?.id === uid || item.requester?.id === uid || item.requesterId === uid;

  const title = item.title || item.pickupLocation || "Delivery Request";
  const author   = item._type === "deliveries"
    ? (item.requester?.name || "—")
    : (item.poster?.name || "—");
  const authorId = item._type === "deliveries"
    ? (item.requester?.id || item.requesterId || null)
    : (item.poster?.id || null);
  const subject = item.subject || item.category || (item._type === "deliveries" ? item.pickupLocation : null);
  const rawPrice = parseFloat(item.price || item.deliveryFee || "20");
  const price = `₹${rawPrice.toFixed(0)}`;
  const urgent = item._type === "deliveries" && item.status === "pending";
  const orderId = `#${item.id.substring(0, 8).toUpperCase()}`;

  const canAcceptReject = !isOwnListing && item._type === "deliveries" && item.status === "pending";
  const canCancel = isOwnListing && item._type === "deliveries" && item.status === "pending";
  const canApply = !isOwnListing && item._type === "tasks" && item.status === "open";
  const isBookedByMeLegacy = item.bookedBy?.id === uid || item.bookedById === uid;
  const canBook = !isOwnListing && !hasActiveBooking && !isBookedByMeLegacy
    && (item._type === "assignments" || item._type === "certifications" || item._type === "projects");
  const alreadyBooked = (hasActiveBooking || isBookedByMeLegacy) && !isOwnListing;

  const timeLabel = (() => {
    if (!item.createdAt) return null;
    const mins = Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  })();

  const deadlineLabel = item.deadline
    ? new Date(item.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : null;

  return (
    <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1.5, borderColor: meta.accent + "33" }}>
      {/* ── Coloured header strip (mirrors CompactActiveCard) ── */}
      <View style={{ backgroundColor: meta.bg, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.7)", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 22 }}>{meta.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            {urgent && (
              <View style={{ backgroundColor: "#EF4444", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 20 }}>
                <Text style={{ color: "#fff", fontSize: 8, fontFamily: "Inter_700Bold" }}>URGENT</Text>
              </View>
            )}
            <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#1C1917", flex: 1 }} numberOfLines={1}>{title}</Text>
            <Text style={{ fontSize: 9, fontFamily: "Inter_500Medium", color: "#A8A29E" }}>{orderId}</Text>
          </View>
          {authorId && authorId !== uid ? (
            <Pressable onPress={() => router.push(`/profile/${authorId}` as any)} hitSlop={8}>
              <Text style={{ fontSize: 10, color: meta.accent, fontFamily: "Inter_600SemiBold", marginTop: 2, textDecorationLine: "underline" }}>
                {item._type === "deliveries" ? `By ${author}` : `Agent: ${author}`}
              </Text>
            </Pressable>
          ) : (
            <Text style={{ fontSize: 10, color: "#78716C", marginTop: 2 }}>
              {item._type === "deliveries" ? `By ${author}` : `Agent: ${author}`}
            </Text>
          )}
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          <Text style={{ fontSize: 17, fontFamily: "Inter_800ExtraBold", color: meta.accent }}>{price}</Text>
          {timeLabel ? <Text style={{ fontSize: 9, color: "#78716C" }}>{timeLabel}</Text> : null}
        </View>
      </View>

      {/* ── Card body ── */}
      <View style={{ backgroundColor: C.surface, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, gap: 10 }}>
        {/* Chips row — subject / deadline */}
        {(subject || deadlineLabel) && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {subject ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: meta.bg, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 }}>
                <Text style={{ fontSize: 11, color: meta.accent, fontFamily: "Inter_600SemiBold" }}>{subject}</Text>
              </View>
            ) : null}
            {deadlineLabel ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FEF3C7", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 }}>
                <Feather name="clock" size={10} color="#D97706" />
                <Text style={{ fontSize: 11, color: "#D97706", fontFamily: "Inter_600SemiBold" }}>Due {deadlineLabel}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Own listing notice */}
        {isOwnListing && !canCancel && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: meta.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
            <Feather name="tag" size={13} color={meta.accent} />
            <Text style={{ fontSize: 11, color: meta.accent, fontFamily: "Inter_600SemiBold" }}>Your listing — open for bookings</Text>
          </View>
        )}

        {/* Already-booked notice */}
        {alreadyBooked && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: meta.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
            <Feather name="check-circle" size={13} color={meta.accent} />
            <Text style={{ fontSize: 11, color: meta.accent, fontFamily: "Inter_600SemiBold" }}>Already booked by you</Text>
          </View>
        )}

        {/* ── Action buttons (full-width) ── */}
        {canAcceptReject && (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              style={{ flex: 1, backgroundColor: "#D1FAE5", paddingVertical: 11, borderRadius: 12, alignItems: "center" }}
              onPress={() => onAccept(item.id, item._type)}
              disabled={isPending}
            >
              {isPending
                ? <ActivityIndicator size="small" color="#10B981" />
                : <Text style={{ color: "#10B981", fontSize: 13, fontFamily: "Inter_700Bold" }}>Accept</Text>}
            </Pressable>
            <Pressable
              style={{ flex: 1, backgroundColor: "#FEE2E2", paddingVertical: 11, borderRadius: 12, alignItems: "center" }}
              onPress={() => onReject(item.id, item._type)}
              disabled={isPending}
            >
              <Text style={{ color: "#EF4444", fontSize: 13, fontFamily: "Inter_700Bold" }}>Reject</Text>
            </Pressable>
          </View>
        )}
        {canApply && (
          <Pressable
            style={{ backgroundColor: meta.accent, paddingVertical: 11, borderRadius: 12, alignItems: "center" }}
            onPress={() => onApply(item.id, item._type)}
            disabled={isPending}
          >
            {isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={{ color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" }}>Apply Now</Text>}
          </Pressable>
        )}
        {canBook && (
          <Pressable
            style={{ backgroundColor: meta.accent, paddingVertical: 11, borderRadius: 12, alignItems: "center" }}
            onPress={() => onBook(item.id, item._type)}
            disabled={isPending}
          >
            {isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={{ color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" }}>Book Now</Text>}
          </Pressable>
        )}
        {canCancel && (
          <Pressable
            style={{ backgroundColor: "#FEE2E2", paddingVertical: 11, borderRadius: 12, alignItems: "center" }}
            onPress={() => onCancel?.(item.id)}
            disabled={isPending}
          >
            {isPending
              ? <ActivityIndicator size="small" color="#EF4444" />
              : <Text style={{ color: "#EF4444", fontSize: 13, fontFamily: "Inter_700Bold" }}>Cancel Order</Text>}
          </Pressable>
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

      {/* Escrow info for booked bookings */}
      {item.totalPaid && parseFloat(item.totalPaid) > 0 && !["rejected", "dismissed"].includes(item.status) && (
        <View style={{ backgroundColor: "#EDE9FE", borderRadius: 10, padding: 12, flexDirection: "row", gap: 8 }}>
          <Feather name="lock" size={14} color="#5B4FE8" style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#4C1D95", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>₹{parseFloat(item.totalPaid).toFixed(2)} in escrow</Text>
            {item.status === "delivered"
              ? <Text style={{ color: "#5B4FE8", fontSize: 11, marginTop: 2 }}>Released to provider ✓</Text>
              : item.status === "rejected"
              ? <Text style={{ color: "#5B4FE8", fontSize: 11, marginTop: 2 }}>Refunded to your wallet ✓</Text>
              : <Text style={{ color: "#5B4FE8", fontSize: 11, marginTop: 2 }}>Held securely — released when you confirm</Text>}
          </View>
        </View>
      )}

      {/* Rejected */}
      {item.status === "rejected" && (
        <View style={{ backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12 }}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#EF4444" }}>Booking Rejected</Text>
          <Text style={{ fontSize: 11, color: "#78716C", marginTop: 4 }}>
            The provider declined this booking.{item.totalPaid && parseFloat(item.totalPaid) > 0 ? ` ₹${parseFloat(item.totalPaid).toFixed(2)} has been refunded to your wallet.` : ""}
          </Text>
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
          <>
            {item.totalPaid && parseFloat(item.totalPaid) > 0 && (
              <View style={{ backgroundColor: "#F5F3FF", borderRadius: 10, padding: 10 }}>
                <Text style={{ fontSize: 11, color: "#5B4FE8", textAlign: "center" }}>
                  Confirming will release ₹{(parseFloat(item.price || "0") * 0.8).toFixed(2)} to the provider
                </Text>
              </View>
            )}
            <Pressable style={{ paddingVertical: 14, borderRadius: 12, backgroundColor: accentColor, alignItems: "center", opacity: isPending ? 0.6 : 1 }}
              onPress={() => onAction(actionId, "confirm")} disabled={isPending}>
              {isPending ? <ActivityIndicator color="#fff" size="small" /> :
                <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 }}>Confirm Received ✓</Text>}
            </Pressable>
          </>
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
  const router = useRouter();
  const { tab: tabParam, openBookingId, openOrderChat: openOrderChatParam, orderType: orderTypeParam } = useLocalSearchParams<{ tab?: string; itemId?: string; openBookingId?: string; openOrderChat?: string; orderType?: string }>();
  const [activeCat, setActiveCat] = useState("all");

  // Deep-link from notification: auto-switch to the relevant tab
  useEffect(() => {
    if (tabParam && SERVICE_TABS.some(t => t.id === tabParam)) {
      setActiveCat(tabParam);
    }
  }, [tabParam]);

  // Deep-link from order_chat notification — open that order's inline chat
  useEffect(() => {
    if (openOrderChatParam) {
      setOpenOrderChatId(openOrderChatParam);
      setActiveCat("active");
    }
  }, [openOrderChatParam]);

  const [showPostModal, setShowPostModal] = useState(false);
  const [postType, setPostType] = useState("tasks");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rejectedDeliveryIds, setRejectedDeliveryIds] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Delivery compact-card camera state
  const [cameraActionId, setCameraActionId] = useState<string | null>(null);
  // QR upload modal (agent uploads payment QR for outlet delivery)
  const [qrUploadItem, setQrUploadItem] = useState<any>(null);
  const [qrPreviewUri, setQrPreviewUri] = useState<string | null>(null);
  // Payment modal (student sees QR and uploads payment screenshot)
  const [paymentItem, setPaymentItem] = useState<any>(null);
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  // Wallet charge confirmation modal (gate delivery charge payment)
  const [walletConfirmItem, setWalletConfirmItem] = useState<any>(null);
  const [paymentReviewItem, setPaymentReviewItem] = useState<any>(null);
  const [reviewImageFullscreen, setReviewImageFullscreen] = useState(false);
  // Order mini-chat — which active order has its chat panel open (by order ID)
  const [openOrderChatId, setOpenOrderChatId] = useState<string | null>(null);
  const { showToast } = useToast();
  const isWeb = Platform.OS === "web";

  // Auto-fetch full delivery detail (with images) when a delivery modal opens
  useEffect(() => {
    if (!selectedItem?.id || selectedItem._type !== "deliveries" || selectedItem._hasDetail) return;
    apiRequest(`/services/deliveries/${selectedItem.id}`)
      .then((r: any) => r.ok ? r.json() : null)
      .then((d: any) => { if (d) setSelectedItem((prev: any) => prev?.id === d.id ? { ...d, _type: "deliveries", _hasDetail: true } : prev); })
      .catch(() => {});
  }, [selectedItem?.id]);

  useEffect(() => {
    if (!paymentItem?.id || paymentItem._hasDetail) return;
    apiRequest(`/services/deliveries/${paymentItem.id}`)
      .then((r: any) => r.ok ? r.json() : null)
      .then((d: any) => { if (d) setPaymentItem((prev: any) => prev?.id === d.id ? { ...d, _type: "deliveries", _hasDetail: true } : prev); })
      .catch(() => {});
  }, [paymentItem?.id]);

  useEffect(() => {
    if (!paymentReviewItem?.id || paymentReviewItem._hasDetail) return;
    apiRequest(`/services/deliveries/${paymentReviewItem.id}`)
      .then((r: any) => r.ok ? r.json() : null)
      .then((d: any) => { if (d) setPaymentReviewItem((prev: any) => prev?.id === d.id ? { ...d, _type: "deliveries", _hasDetail: true } : prev); })
      .catch(() => {});
  }, [paymentReviewItem?.id]);

  const isProvider = user?.role === "provider";
  const userServices: string[] = user?.services ? JSON.parse(user.services) : [];

  // Keep the open Order Details modal in sync with the latest cache. Without
  // this, `selectedItem` is a snapshot taken at the moment the modal opened —
  // so after a status update, the modal still shows the OLD status & button
  // until the user closes and reopens it.
  //
  // Two-layer defense:
  //  1. `liveSelectedItem` (useMemo): re-derives every render from the live
  //     query cache so the modal always renders fresh data even if state is stale.
  //  2. `useEffect` below: actively pushes status/charge changes back into
  //     `selectedItem` state, so any other code reading `selectedItem` directly
  //     (or React Native batching skipping the memo recompute) still gets fresh data.
  const canPost = (cat: string) => {
    // Delivery and tasks: anyone can post
    if (cat === "deliveries" || cat === "tasks") return true;
    // Assignments, certifications, projects: providers only
    return isProvider;
  };

  // ── Single combined query for all service categories ──────────────────────
  const { data: allData, isLoading, refetch: refetchAll } = useQuery({
    queryKey: ["services", "all"],
    queryFn: async () => {
      const allRes = await apiRequest("/services/all").catch(() => null);
      if (allRes?.ok) return allRes.json();
      const [a, c, d, t, p, b] = await Promise.all([
        apiRequest("/services/assignments").then(r => r.json()).catch(() => ({ assignments: [] })),
        apiRequest("/services/certifications").then(r => r.json()).catch(() => ({ certifications: [] })),
        apiRequest("/services/deliveries").then(r => r.json()).catch(() => ({ deliveries: [] })),
        apiRequest("/services/tasks").then(r => r.json()).catch(() => ({ tasks: [] })),
        apiRequest("/services/projects").then(r => r.json()).catch(() => ({ projects: [] })),
        apiRequest("/services/bookings").then(r => r.json()).catch(() => ({ bookings: [] })),
      ]);
      return {
        assignments: a.assignments || [],
        certifications: c.certifications || [],
        deliveries: d.deliveries || [],
        tasks: t.tasks || [],
        projects: p.projects || [],
        bookings: b.bookings || [],
      };
    },
    // Background polling every 30 s is enough for passive freshness — fast
    // updates after the user OR another party makes a change come from:
    //   • optimistic cache updates inside actionMutation (instant)
    //   • mutation onSuccess invalidate (instant for the actor)
    //   • push-notification-driven invalidate in NotificationContext (instant for the recipient)
    //   • screen-focus refetch below (instant when user reopens the tab)
    // Polling every 5 s caused the server to spend most of its time serving
    // these heavy mega-fetches, which slowed status-update responses to ~6-8 s.
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 1,
  });

  // Refetch immediately when the user navigates to / refocuses this tab so we
  // don't have to wait for the next poll interval to see fresh data.
  useFocusEffect(
    useCallback(() => {
      refetchAll();
    }, [refetchAll])
  );

  // ── Live-sync the open modal's `selectedItem` with the latest cache ──────
  // Two layers (belt-and-braces — neither alone caught every case in testing):
  //  1. `liveSelectedItem` (useMemo): re-derives every render from the live
  //     query cache so the modal always renders fresh data.
  //  2. `useEffect` below: actively pushes status/charge changes back into
  //     `selectedItem` state for any code reading it directly.
  const liveSelectedItem = useMemo(() => {
    if (!selectedItem || !allData) return selectedItem;
    const t = selectedItem._type as string | undefined;
    if (!t) return selectedItem;
    const collectionKey = selectedItem._isBooking ? "bookings" : t;
    const collection: any[] = (allData as any)[collectionKey] ?? [];
    const fresh = collection.find((x: any) => x.id === selectedItem.id);
    if (!fresh) return selectedItem;
    return { ...selectedItem, ...fresh, _type: t, _isBooking: selectedItem._isBooking, _isSynthetic: selectedItem._isSynthetic, _hasDetail: selectedItem._hasDetail };
  }, [selectedItem, allData]);

  useEffect(() => {
    if (!selectedItem || !allData) return;
    const t = selectedItem._type as string | undefined;
    if (!t) return;
    const collectionKey = selectedItem._isBooking ? "bookings" : t;
    const collection: any[] = (allData as any)[collectionKey] ?? [];
    const fresh = collection.find((x: any) => x.id === selectedItem.id);
    if (!fresh) return;
    // Only push an update if a meaningful field actually changed — otherwise
    // we'd loop forever (setSelectedItem -> re-run effect -> setSelectedItem ...).
    const changed =
      fresh.status !== selectedItem.status ||
      fresh.statusHistory !== selectedItem.statusHistory ||
      fresh.chargeStatus !== selectedItem.chargeStatus ||
      fresh.selfieTimestamp !== selectedItem.selfieTimestamp ||
      fresh.locationPhotoTimestamp !== selectedItem.locationPhotoTimestamp ||
      fresh.paymentScreenshotUrl !== selectedItem.paymentScreenshotUrl ||
      fresh.qrImageUrl !== selectedItem.qrImageUrl;
    if (!changed) return;
    setSelectedItem((prev: any) => (prev?.id === fresh.id
      ? { ...prev, ...fresh, _type: t, _isBooking: prev._isBooking, _isSynthetic: prev._isSynthetic, _hasDetail: prev._hasDetail }
      : prev));
  }, [allData, selectedItem]);

  const rA = refetchAll;
  const rC = refetchAll;
  const rD = refetchAll;
  const rT = refetchAll;
  const rP = refetchAll;
  const rBookings = refetchAll;

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

  const { data: myHistoryData } = useQuery({
    queryKey: ["my-history"],
    queryFn: async () => {
      const res = await apiRequest("/services/my-history");
      if (!res.ok) return { active: [], completed: [] };
      return res.json();
    },
    // Banner counts only — fine to refresh once a minute. Mutations and the
    // tab-focus refetch above will keep the actual order list fresh.
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const bannerActiveCount    = (myHistoryData?.active    || []).length;
  const bannerHistoryCount   = (myHistoryData?.completed || []).length;

  // ── Academic visibility filter ──────────────────────────────────────────────
  // Students: only see listings for their exact program AND year.
  // Providers: see all listings in their program with year ≤ their year (they can book those).
  const ACADEMIC_CATS = ["assignments", "certifications", "projects"];
  const uid = user?.id;
  const userProgram = user?.program;
  const userYear = user?.year;

  // Tag each item with its _type so renderCard can dispatch correctly. Memoized
  // because allData re-references identically across polls when nothing changed,
  // so this avoids re-creating arrays + child re-renders on every poll tick.
  const rawAssignments = useMemo(
    () => (allData?.assignments || []).map((i: any) => ({ ...i, _type: "assignments" })),
    [allData?.assignments]
  );
  const rawCertifications = useMemo(
    () => (allData?.certifications || []).map((i: any) => ({ ...i, _type: "certifications" })),
    [allData?.certifications]
  );
  const rawProjects = useMemo(
    () => (allData?.projects || []).map((i: any) => ({ ...i, _type: "projects" })),
    [allData?.projects]
  );
  const deliveries = useMemo(
    () => (allData?.deliveries || []).map((i: any) => ({ ...i, _type: "deliveries" })),
    [allData?.deliveries]
  );
  const tasks = useMemo(
    () => (allData?.tasks || []).map((i: any) => ({ ...i, _type: "tasks" })),
    [allData?.tasks]
  );

  const filterAcademic = useCallback((items: any[]) => {
    if (!uid) return items;
    if (isProvider) {
      return items.filter(i =>
        (i.program === userProgram && (i.targetYear ?? i.target_year ?? 0) <= (userYear ?? 4))
        || i.poster?.id === uid
        || i.bookedById === uid
      );
    }
    return items.filter(i =>
      (i.program === userProgram && (i.targetYear ?? i.target_year ?? 0) === userYear)
      || i.bookedById === uid
    );
  }, [uid, isProvider, userProgram, userYear]);

  const assignments    = useMemo(() => filterAcademic(rawAssignments),    [filterAcademic, rawAssignments]);
  const certifications = useMemo(() => filterAcademic(rawCertifications), [filterAcademic, rawCertifications]);
  const projects       = useMemo(() => filterAcademic(rawProjects),       [filterAcademic, rawProjects]);
  const allItems       = useMemo(
    () => [...assignments, ...certifications, ...deliveries, ...tasks, ...projects],
    [assignments, certifications, deliveries, tasks, projects]
  );

  // ── Booking records (multi-booking for academic types) ─────────────────────
  // Transform each booking into the same item shape CompactActiveCard expects
  const myBookings: any[] = useMemo(
    () => (allData?.bookings || []).map((b: any) => ({
      id: b.id,
      _type: b.serviceType,
      _isBooking: true,
      _myPerspective: b._myPerspective,
      status: b.status,
      statusHistory: b.statusHistory,
      createdAt: b.createdAt,
      title: b.listing?.title,
      price: b.price || b.listing?.price,
      gstAmount: b.gstAmount,
      totalPaid: b.totalPaid,
      escrowStatus: b.escrowStatus,
      subject: b.listing?.subject,
      program: b.listing?.program,
      deadline: b.listing?.deadline,
      poster: b.listing?.poster,
      bookedBy: b.student,
      listingId: b.listingId,
    })),
    [allData?.bookings]
  );

  // Map listingId → booking for quick lookup (to show "Already Booked" on cards)
  const myActiveBookingByListing = useMemo(
    () => new Map<string, any>(
      myBookings
        .filter(b => !["delivered", "dismissed"].includes(b.status))
        .map(b => [b.listingId, b])
    ),
    [myBookings]
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
    const uid = user?.id;
    const isStudentOf  = item.bookedBy?.id === uid || item.requester?.id === uid || item.requesterId === uid;
    const isProviderOf = item.poster?.id === uid || item.deliveryAgent?.id === uid || item.assignedTo?.id === uid || item.deliveryAgentId === uid;
    // Pending deliveries show in Active Now for both the requester AND any agent who can accept them
    if (item._type === "deliveries" && item.status === "pending") {
      if (rejectedDeliveryIds.has(item.id)) return false;
      if (isStudentOf) return true;           // Requester: see own pending order
      if (isProvider) return true;            // Agent: see all available pending orders
    }
    // "completed" = agent arrived / provider done, student has NOT yet confirmed → KEEP in Active Now
    // Only "delivered" = both sides confirmed → remove (goes to history)
    const idle = ["open", "pending", "delivered", "cancelled"];
    if (idle.includes(item.status)) return false;
    return isStudentOf || isProviderOf;
  };

  // Terminal booking statuses (mirrors server BOOKING_TERMINAL) — these belong in history, not Active Now
  const BOOKING_TERMINAL = ["delivered", "dismissed", "cancelled", "rejected"];

  // Synthesize booking-display objects from OLD-MODEL academic listing rows.
  // These are listings that have non-"open" status + bookedById set but no corresponding
  // service_bookings record. We wrap them so BookingDetailCard renders instead of AcademicCard.
  const syntheticBookings: any[] = allItems.filter(i => {
    if (!ACADEMIC_CATS.includes(i._type)) return false;
    if (i.status === "open") return false; // Normal open listing — not a synthetic booking
    // Terminal statuses (matches server BOOKING_TERMINAL) → go to history, not Active Now
    if (BOOKING_TERMINAL.includes(i.status)) return false;
    if (myActiveBookingByListing.has(i.id)) return false; // Real booking exists, no need to synthesize
    const uid = user?.id;
    const isLister = i.poster?.id === uid;
    const isBooker = i.bookedBy?.id === uid || i.bookedById === uid;
    if (!isLister && !isBooker) return false;
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
    // Deliveries: all pending orders go to "Active Now" for both agents and requesters
    if (item._type === "deliveries") return false;
    return true;
  };

  const filteredItems   = getItemsForCat(activeCat);
  const allDeliveriesAndTasks = [...deliveries, ...tasks];

  // For academic tabs, active jobs = real booking records + synthetic (old-model) bookings
  // For delivery/task tabs, active jobs = listing items with non-idle status
  // For "all" tab, merge: non-academic active listings + all real bookings + all synthetic bookings
  const isVisibleBooking = (b: any) => {
    if (BOOKING_TERMINAL.includes(b.status)) return false;
    return true;
  };

  const catBookings = ACADEMIC_CATS.includes(activeCat)
    ? myBookings.filter(b => b._type === activeCat && isVisibleBooking(b))
    : [];
  const sortByRecent = (a: any, b: any) => {
    // Pending deliveries (awaiting agent) always float to the top
    const aPending = a._type === "deliveries" && a.status === "pending" ? 0 : 1;
    const bPending = b._type === "deliveries" && b.status === "pending" ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    // Within each group, sort most-recent first
    return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
  };
  const activeJobs: any[] = (ACADEMIC_CATS.includes(activeCat)
    ? [...catBookings, ...syntheticBookings.filter(b => b._type === activeCat)]
    : activeCat === "all"
      ? [
          ...allDeliveriesAndTasks.filter(isActiveJobLegacy),
          ...myBookings.filter(isVisibleBooking),
          ...syntheticBookings,
        ]
      : filteredItems.filter(isActiveJobLegacy)
  ).sort(sortByRecent);
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
      await refetchAll();
    } finally {
      setRefreshing(false);
    }
  }, [refetchAll]);

  // Deep-link from Service History: auto-open booking detail modal
  useEffect(() => {
    if (!openBookingId || !allData) return;
    const found = myBookings.find(b => b.id === openBookingId);
    if (found) setSelectedItem(found);
  }, [openBookingId, allData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mutations ─────────────────────────────────────────────────────────────
  const endpointMap: Record<string, string> = {
    assignments:    "/services/assignments",
    certifications: "/services/certifications",
    deliveries:     "/services/deliveries",
    tasks:          "/services/tasks",
    projects:       "/services/projects",
    bookings:       "/services/bookings",
  };

  const [bookConfirmItem, setBookConfirmItem] = useState<any>(null);

  const OPTIMISTIC_DELIVERY_ACTIONS = new Set(["accept", "progress", "confirm", "cancel", "mark-paid", "confirm-payment"]);

  const actionMutation = useMutation({
    mutationFn: async ({ id, action, tab, body }: { id: string; action: string; tab: string; body?: any }) => {
      const res = await apiRequest(`${endpointMap[tab]}/${id}/${action}`, {
        method: "POST",
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const text = await res.text();
      let json: any = {};
      try { json = JSON.parse(text); } catch {
        throw new Error(res.ok ? "Unexpected server response" : `Server error (${res.status})`);
      }
      if (!res.ok) throw new Error(json.message || json.error || "Action failed");
      return json;
    },
    onMutate: async ({ id, action, tab }: { id: string; action: string; tab: string; body?: any }) => {
      // Always mark this item as pending so the action button is disabled while
      // the request is in-flight. Without this, optimistic actions (accept,
      // progress, confirm, cancel, etc.) leave the button tappable, and because
      // the server call takes ~2-3 seconds the agent can double/triple-tap and
      // accidentally advance the order multiple status steps.
      setPendingId(id);
      if (tab !== "deliveries") return {};
      await queryClient.cancelQueries({ queryKey: ["services", "all"] });
      const prevDeliveries = queryClient.getQueryData(["services", "all"]);
      queryClient.setQueryData(["services", "all"], (old: any) => {
        if (!old?.deliveries) return old;
        const now = new Date().toISOString();
        return {
          ...old,
          deliveries: old.deliveries.map((d: any) => {
            if (d.id !== id) return d;
            const addHistory = (st: string) => {
              const h = d.statusHistory ? JSON.parse(d.statusHistory) : [];
              return JSON.stringify([...h, { status: st, at: now }]);
            };
            if (action === "accept") return { ...d, status: "accepted", statusHistory: addHistory("accepted") };
            if (action === "progress") {
              const isOutlet = d.pickupType === "outlet";
              const map: Record<string, string> = {
                accepted: "reaching_pickup",
                ...(isOutlet
                  ? { reaching_pickup: "placed_order", placed_order: "collecting_order", collecting_order: "reaching_drop" }
                  : { reaching_pickup: "reaching_drop" }),
                reaching_drop: "completed",
              };
              const next = map[d.status];
              if (!next) return d;
              return { ...d, status: next, statusHistory: addHistory(next) };
            }
            if (action === "confirm") return { ...d, status: "delivered", statusHistory: addHistory("delivered") };
            if (action === "cancel") return { ...d, status: "cancelled", statusHistory: addHistory("cancelled") };
            if (action === "mark-paid") return { ...d, status: "payment_marked" };
            if (action === "confirm-payment") return { ...d, chargeStatus: "paid" };
            return d;
          }),
        };
      });
      return { prevDeliveries };
    },
    onSuccess: (data, vars) => {
      if (vars.tab === "deliveries" && data) {
        queryClient.setQueryData(["services", "all"], (old: any) => {
          if (!old?.deliveries) return old;
          return { ...old, deliveries: old.deliveries.map((d: any) => d.id === vars.id ? { ...d, ...data } : d) };
        });
      }
      // Track deliveries the agent rejected locally so they vanish from Open Listings
      if (vars.action === "reject" && vars.tab === "deliveries") {
        setRejectedDeliveryIds(prev => new Set([...prev, vars.id]));
      }
      queryClient.invalidateQueries({ queryKey: ["services", "all"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      const msgs: Record<string, string> = {
        book: "Booked! Payment held in escrow.", apply: "Application sent!",
        accept: "Accepted!", reject: "Request declined", progress: "Status updated!", confirm: "Order marked received!",
        cancel: "Delivery cancelled.", selfie: "Selfie uploaded!", qr: "QR shared with requester!",
        "location-photo": "Location photo uploaded!", "pay-delivery-charge": "Delivery charge paid from wallet!",
        "mark-paid": "Marked as paid!", "confirm-payment": "Payment confirmed! You can now place the order.",
        "reject-payment": "Payment screenshot rejected. Student will be notified to re-upload.",
        "payment-screenshot": "Payment screenshot sent! Waiting for agent to confirm.",
        complete: "Marked as arrived!", "dismiss-rejection": "Booking dismissed.", "dismiss": "Booking dismissed.",
      };
      showToast(msgs[vars.action] || "Done!", "success");
    },
    onError: (err: any, vars: any, context: any) => {
      if (context?.prevDeliveries) {
        queryClient.setQueryData(["services", "all"], context.prevDeliveries);
      }
      const msg = err.message || "Action failed";
      if (msg.includes("InsufficientBalance") || msg.includes("Insufficient")) {
        setWalletConfirmItem(null);
        showToast("Insufficient wallet balance. Redirecting to top up...", "error");
        setTimeout(() => router.push("/(tabs)/wallet"), 1000);
      } else {
        showToast(msg, "error");
      }
    },
    onSettled: () => setPendingId(null),
  });

  const handleCameraAction = useCallback(async (id: string, type: "selfie" | "qr" | "location-photo", dataUri: string) => {
    const bodyKey = type === "selfie" ? "selfieUrl" : type === "qr" ? "qrImageUrl" : "locationPhotoUrl";
    actionMutation.mutate({ id, action: type, tab: "deliveries", body: { [bodyKey]: dataUri } });
  }, [actionMutation]);

  // Camera handler for compact card buttons (selfie + location-photo)
  const handleCompactCameraAction = useCallback(async (deliveryId: string, type: "selfie" | "location-photo") => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { showToast("Camera permission required to continue", "error"); return; }
    setCameraActionId(`${deliveryId}-${type}`);
    try {
      const result = await ImagePicker.launchCameraAsync({
        cameraType: type === "selfie" ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
        base64: true, quality: 0.5, allowsEditing: false,
      });
      if (!result.canceled && result.assets[0].base64) {
        const dataUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
        const bodyKey = type === "selfie" ? "selfieUrl" : "locationPhotoUrl";
        actionMutation.mutate({ id: deliveryId, action: type, tab: "deliveries", body: { [bodyKey]: dataUri } });
      }
    } catch { showToast("Camera error. Please try again.", "error"); }
    finally { setCameraActionId(null); }
  }, [actionMutation, showToast]);

  // QR upload modal handlers (agent uploads payment QR)
  const handleOpenQRUpload = useCallback((item: any) => {
    setQrUploadItem(item);
    setQrPreviewUri(null);
  }, []);

  const handleQRUploadPickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7, allowsEditing: false });
    if (!result.canceled && result.assets[0].base64) {
      setQrPreviewUri(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  }, []);

  const handleQRUploadSubmit = useCallback(() => {
    if (!qrUploadItem || !qrPreviewUri) return;
    actionMutation.mutate({ id: qrUploadItem.id, action: "qr", tab: "deliveries", body: { qrImageUrl: qrPreviewUri } });
    setQrUploadItem(null);
    setQrPreviewUri(null);
  }, [qrUploadItem, qrPreviewUri, actionMutation]);

  // Payment modal handlers (student sees QR + uploads screenshot)
  const handleOpenPaymentModal = useCallback((item: any) => {
    setPaymentItem(item);
    setScreenshotUri(null);
  }, []);

  const handlePaymentScreenshotPick = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7, allowsEditing: false });
    if (!result.canceled && result.assets[0].base64) {
      setScreenshotUri(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  }, []);

  const handlePaymentScreenshotSubmit = useCallback(() => {
    if (!paymentItem || !screenshotUri) return;
    actionMutation.mutate({ id: paymentItem.id, action: "payment-screenshot", tab: "deliveries", body: { paymentScreenshotUrl: screenshotUri } });
    setPaymentItem(null);
    setScreenshotUri(null);
  }, [paymentItem, screenshotUri, actionMutation]);

  // Screenshot helper for QR — uses React Native's built-in Share (no extra native modules needed)
  const handleSaveQRToGallery = useCallback(async (amount: string) => {
    try {
      await Share.share({
        message: `UPI payment QR for ₹${amount} — screenshot the QR code shown above to pay via your UPI app.`,
        title: "Save UPI QR Code",
      });
    } catch {
      showToast("Could not open share. Screenshot the QR manually.", "info");
    }
  }, [showToast]);

  // Pay delivery charge (gate delivery) — opens wallet confirmation modal first
  const handlePayDeliveryCharge = useCallback((item: any) => {
    setWalletConfirmItem(item);
  }, []);

  // Called from wallet confirm modal — actually executes the payment
  const handleConfirmWalletPay = useCallback(() => {
    if (!walletConfirmItem) return;
    setWalletConfirmItem(null);
    actionMutation.mutate({ id: walletConfirmItem.id, action: "pay-delivery-charge", tab: "deliveries" });
  }, [walletConfirmItem, actionMutation]);

  // Agent opens payment review modal (sees screenshot → confirm or reject)
  const handleReviewPayment = useCallback((item: any) => {
    setPaymentReviewItem(item);
    setReviewImageFullscreen(false);
  }, []);

  // Agent confirms payment from review modal
  const handleConfirmFromReview = useCallback(() => {
    if (!paymentReviewItem) return;
    const id = paymentReviewItem.id;
    setPaymentReviewItem(null);
    setReviewImageFullscreen(false);
    actionMutation.mutate({ id, action: "confirm-payment", tab: "deliveries" });
  }, [paymentReviewItem, actionMutation]);

  // Agent rejects payment from review modal → requester must re-upload
  const handleRejectPayment = useCallback(() => {
    if (!paymentReviewItem) return;
    const id = paymentReviewItem.id;
    setPaymentReviewItem(null);
    setReviewImageFullscreen(false);
    actionMutation.mutate({ id, action: "reject-payment", tab: "deliveries" });
  }, [paymentReviewItem, actionMutation]);

  // Requester marks order as received (both sides → delivered)
  const handleMarkReceived = useCallback((deliveryId: string) => {
    actionMutation.mutate({ id: deliveryId, action: "confirm", tab: "deliveries" });
  }, [actionMutation]);

  const rateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest(`/services/deliveries/${id}/rate`, { method: "POST", body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to submit rating");
      return json;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["services", "all"] }); showToast("Thanks for your rating!", "success"); },
    onError: (err: any) => showToast(err.message || "Failed to submit rating", "error"),
  });

  // Dismiss rejection always operates on the booking record
  const onDismissRejection = (id: string, tab: string) =>
    actionMutation.mutate({ id, action: tab === "bookings" ? "dismiss-rejection" : "dismiss", tab });

  // Book with confirmation modal showing price breakdown
  const handleBook = useCallback((item: any) => {
    setBookConfirmItem(item);
  }, []);

  // ── Render a single item card ──────────────────────────────────────────────
  const renderCard = useCallback((item: any) => {
    const type = item._type;
    if (type === "assignments" || type === "certifications" || type === "projects") {
      const myBooking = myActiveBookingByListing.get(item.id);
      const bookingCount = myBookings.filter(b => b.listingId === item.id && !["delivered", "dismissed"].includes(b.status)).length;
      return (
        <AcademicCard
          key={item.id} item={item} C={C} serviceType={type} currentUserId={user?.id}
          onAction={(id: string, action: string) => {
            if (action === "book") { handleBook(item); return; }
            actionMutation.mutate({ id, action, tab: type });
          }}
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
  }, [C, user, pendingId, actionMutation.isPending, rateMutation.isPending, myActiveBookingByListing, myBookings, handleBook, handleCameraAction]);

  // ── Post helpers ───────────────────────────────────────────────────────────
  const postableCats = ["deliveries", "assignments", "certifications", "tasks", "projects"].filter(canPost);
  const openPostFor = (type: string) => {
    if (type === "deliveries") { router.push("/request-delivery" as any); return; }
    setPostType(type); setShowPostModal(true);
  };
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
            {bannerActiveCount > 0 ? `${bannerActiveCount} active · ` : ""}{totalOpen} open listing{totalOpen !== 1 ? "s" : ""}
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
            {bannerActiveCount > 0 && <View style={CS.notifDot} />}
          </View>
        </View>
      </View>

      {/* ── Category chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={CS.chipsScroll}
        contentContainerStyle={CS.chipsRow}
      >
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
          <Pressable
            style={[CS.activityBanner, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => router.push("/service-history")}
          >
            <View style={[CS.activityIcon, { backgroundColor: "#EDE9FE" }]}>
              <Feather name="activity" size={16} color="#5B4FE8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[CS.activityTitle, { color: C.text }]}>Your activity</Text>
              <View style={{ flexDirection: "row", gap: 14, marginTop: 2 }}>
                <Text style={[CS.activityStat, { color: C.textSecondary }]}>
                  <Text style={{ color: "#5B4FE8", fontFamily: "Inter_700Bold" }}>{bannerActiveCount}</Text> active job{bannerActiveCount !== 1 ? "s" : ""}
                </Text>
                <Text style={[CS.activityStat, { color: C.textSecondary }]}>
                  <Text style={{ color: "#10B981", fontFamily: "Inter_700Bold" }}>{bannerHistoryCount}</Text> completed
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={C.textTertiary} />
          </Pressable>

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
                    cameraActionId={cameraActionId}
                    onCameraAction={handleCompactCameraAction}
                    onOpenQRUpload={handleOpenQRUpload}
                    onOpenPaymentModal={handleOpenPaymentModal}
                    onPayDeliveryCharge={handlePayDeliveryCharge}
                    onReviewPayment={handleReviewPayment}
                    onMarkReceived={handleMarkReceived}
                    onCancelDelivery={(id: string) => actionMutation.mutate({ id, action: "cancel", tab: "deliveries" })}
                    isOrderChatOpen={openOrderChatId === item.id}
                    onToggleOrderChat={(i: any) => setOpenOrderChatId(prev => i?.id && prev !== i.id ? i.id : null)}
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
              <View style={{ gap: 12 }}>
                {openListings.map((item: any) => (
                  <CompactListingRow
                    key={item.id}
                    item={item}
                    C={C}
                    user={user}
                    isPending={pendingId === item.id && actionMutation.isPending}
                    hasActiveBooking={!!myActiveBookingByListing.get(item.id)}
                    onBook={(_id: string, _type: string) => handleBook(item)}
                    onAccept={(id: string, type: string) => actionMutation.mutate({ id, action: "accept", tab: type })}
                    onReject={(id: string, type: string) => actionMutation.mutate({ id, action: "reject", tab: type })}
                    onApply={(id: string, type: string) => actionMutation.mutate({ id, action: "apply", tab: type })}
                    onCancel={(id: string) => actionMutation.mutate({ id, action: "cancel", tab: "deliveries" })}
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

      {/* ── Booking Confirmation Modal (price breakdown + wallet check) ── */}
      {bookConfirmItem && (() => {
        const item = bookConfirmItem;
        const price = parseFloat(item.price || "0");
        const gst = parseFloat((price * 0.18).toFixed(2));
        const total = parseFloat((price + gst).toFixed(2));
        const accentColor = item._type === "certifications" ? "#10B981" : item._type === "projects" ? "#6366F1" : "#5B4FE8";
        return (
          <Modal visible transparent animationType="fade" onRequestClose={() => setBookConfirmItem(null)}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}>
              <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 }}>
                <Text style={{ fontSize: 17, fontFamily: "Inter_800ExtraBold", color: C.text, marginBottom: 4 }}>Confirm Booking</Text>
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: C.textSecondary, marginBottom: 20 }}>{item.title}</Text>

                {/* Price breakdown */}
                <View style={{ backgroundColor: C.backgroundSecondary, borderRadius: 14, padding: 16, gap: 10, marginBottom: 20 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: C.textSecondary, fontSize: 14 }}>Service fee</Text>
                    <Text style={{ color: C.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>₹{price.toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: C.textSecondary, fontSize: 14 }}>GST (18%)</Text>
                    <Text style={{ color: C.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>₹{gst.toFixed(2)}</Text>
                  </View>
                  <View style={{ height: 1, backgroundColor: C.border }} />
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: C.text, fontFamily: "Inter_700Bold", fontSize: 15 }}>Total (from wallet)</Text>
                    <Text style={{ color: accentColor, fontFamily: "Inter_800ExtraBold", fontSize: 15 }}>₹{total.toFixed(2)}</Text>
                  </View>
                </View>

                <View style={{ backgroundColor: "#EDE9FE", borderRadius: 10, padding: 12, marginBottom: 20, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Feather name="lock" size={14} color="#5B4FE8" />
                  <Text style={{ color: "#4C1D95", fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 }}>Payment is held in secure escrow. Released to provider only when you confirm receipt. Refunded automatically if rejected.</Text>
                </View>

                <View style={{ gap: 10 }}>
                  <Pressable
                    style={{ backgroundColor: accentColor, paddingVertical: 15, borderRadius: 14, alignItems: "center", opacity: (pendingId === item.id && actionMutation.isPending) ? 0.6 : 1 }}
                    onPress={() => {
                      setBookConfirmItem(null);
                      actionMutation.mutate({ id: item.id, action: "book", tab: item._type });
                    }}
                    disabled={pendingId === item.id && actionMutation.isPending}
                  >
                    {(pendingId === item.id && actionMutation.isPending)
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 }}>Pay ₹{total.toFixed(2)} & Book</Text>}
                  </Pressable>
                  <Pressable style={{ paddingVertical: 13, borderRadius: 14, alignItems: "center", backgroundColor: C.backgroundSecondary }}
                    onPress={() => setBookConfirmItem(null)}>
                    <Text style={{ color: C.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        );
      })()}

      {/* ── Detail Modal (Track Order tap) ── */}
      {liveSelectedItem && (
        <DetailModal
          item={liveSelectedItem}
          C={C}
          user={user}
          onClose={() => setSelectedItem(null)}
          isPending={actionMutation.isPending && (pendingId === liveSelectedItem?.id || pendingId === liveSelectedItem?.listingId)}
          myBooking={liveSelectedItem._isBooking ? undefined : myActiveBookingByListing.get(liveSelectedItem.id)}
          onAction={(id: string, action: string) => actionMutation.mutate({ id, action, tab: liveSelectedItem._isSynthetic ? liveSelectedItem._type : liveSelectedItem._isBooking ? "bookings" : liveSelectedItem._type })}
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

      {/* ── QR Upload Modal (agent uploads outlet payment QR) ── */}
      <Modal
        visible={!!qrUploadItem}
        transparent
        animationType="fade"
        onRequestClose={() => { setQrUploadItem(null); setQrPreviewUri(null); }}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 20, width: "100%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: C.text }}>Upload Payment QR</Text>
              <Pressable onPress={() => { setQrUploadItem(null); setQrPreviewUri(null); }}>
                <Feather name="x" size={22} color={C.text} />
              </Pressable>
            </View>
            <Text style={{ color: C.textSecondary, fontSize: 13, marginBottom: 14 }}>
              Select the outlet's UPI QR code from your gallery — the student will see it to pay.
            </Text>
            {qrPreviewUri ? (
              <View style={{ alignItems: "center", marginBottom: 16 }}>
                <Image source={{ uri: qrPreviewUri }} style={{ width: 200, height: 200, borderRadius: 12 }} contentFit="contain" />
              </View>
            ) : (
              <Pressable
                style={{ borderWidth: 2, borderColor: C.border, borderStyle: "dashed", borderRadius: 12, padding: 36, alignItems: "center", marginBottom: 16 }}
                onPress={handleQRUploadPickImage}
              >
                <Feather name="upload" size={32} color={C.textTertiary} />
                <Text style={{ color: C.textTertiary, marginTop: 8, fontFamily: "Inter_500Medium" }}>Tap to select QR image</Text>
              </Pressable>
            )}
            {qrPreviewUri ? (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: C.backgroundSecondary, alignItems: "center" }}
                  onPress={handleQRUploadPickImage}
                >
                  <Text style={{ color: C.text, fontFamily: "Inter_500Medium" }}>Replace</Text>
                </Pressable>
                <Pressable
                  style={{ flex: 2, paddingVertical: 12, borderRadius: 12, backgroundColor: "#F59E0B", alignItems: "center" }}
                  onPress={handleQRUploadSubmit}
                  disabled={actionMutation.isPending}
                >
                  {actionMutation.isPending
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ color: "#fff", fontFamily: "Inter_700Bold" }}>Upload & Share with Student</Text>}
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ── Payment Modal (student sees QR + uploads payment screenshot) ── */}
      <Modal
        visible={!!paymentItem}
        transparent
        animationType="fade"
        onRequestClose={() => { setPaymentItem(null); setScreenshotUri(null); }}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 20, width: "100%", maxHeight: "85%" }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: C.text }}>Complete Payment</Text>
                <Pressable onPress={() => { setPaymentItem(null); setScreenshotUri(null); }}>
                  <Feather name="x" size={22} color={C.text} />
                </Pressable>
              </View>

              {/* QR code from agent */}
              {paymentItem?.qrImageUrl && (
                <View style={{ alignItems: "center", marginBottom: 16, backgroundColor: C.backgroundSecondary, borderRadius: 16, padding: 16 }}>
                  <Text style={{ color: C.textSecondary, fontSize: 13, marginBottom: 10 }}>Scan this QR to pay</Text>
                  <Image source={{ uri: paymentItem.qrImageUrl }} style={{ width: 200, height: 200, borderRadius: 12 }} contentFit="contain" cachePolicy="disk" />
                  {paymentItem?.subtotal && (
                    <Text style={{ color: C.text, fontFamily: "Inter_700Bold", fontSize: 20, marginTop: 10 }}>
                      ₹{parseFloat(paymentItem.subtotal).toFixed(0)}
                    </Text>
                  )}
                  <Text style={{ color: C.textSecondary, fontSize: 11, marginTop: 4 }}>UPI payment to outlet</Text>
                  <Pressable
                    style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, backgroundColor: "#5B4FE8" }}
                    onPress={() => handleSaveQRToGallery(paymentItem?.subtotal ? parseFloat(paymentItem.subtotal).toFixed(0) : "")}>
                    <Feather name="share-2" size={14} color="#fff" />
                    <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>Screenshot Reminder</Text>
                  </Pressable>
                  <Text style={{ color: "#78716C", fontSize: 10, marginTop: 6, textAlign: "center" }}>
                    Take a screenshot of the QR above to pay via your UPI app
                  </Text>
                </View>
              )}

              <Text style={{ color: C.textSecondary, fontSize: 13, marginBottom: 10 }}>
                After paying, upload your payment screenshot below:
              </Text>

              {screenshotUri && (
                <View style={{ alignItems: "center", marginBottom: 12 }}>
                  <Image source={{ uri: screenshotUri }} style={{ width: "100%", height: 180, borderRadius: 12 }} contentFit="cover" />
                </View>
              )}

              <Pressable
                style={{ borderWidth: 2, borderColor: C.border, borderStyle: "dashed", borderRadius: 12, padding: 20, alignItems: "center", marginBottom: 14 }}
                onPress={handlePaymentScreenshotPick}
              >
                <Feather name="upload" size={20} color={C.textTertiary} />
                <Text style={{ color: C.textTertiary, marginTop: 6, fontFamily: "Inter_500Medium" }}>
                  {screenshotUri ? "Replace Screenshot" : "Upload Payment Screenshot"}
                </Text>
              </Pressable>

              {screenshotUri && (
                <Pressable
                  style={{ paddingVertical: 14, borderRadius: 12, backgroundColor: "#10B981", alignItems: "center", marginBottom: 8 }}
                  onPress={handlePaymentScreenshotSubmit}
                  disabled={actionMutation.isPending}
                >
                  {actionMutation.isPending
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 }}>Confirm & Submit Screenshot</Text>}
                </Pressable>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Wallet Charge Confirmation Modal (gate delivery) ── */}
      <Modal
        visible={!!walletConfirmItem}
        transparent
        animationType="fade"
        onRequestClose={() => setWalletConfirmItem(null)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 }}>
          <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 24, width: "100%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: C.text }}>Pay Delivery Charge</Text>
              <Pressable onPress={() => setWalletConfirmItem(null)}>
                <Feather name="x" size={22} color={C.text} />
              </Pressable>
            </View>
            {walletConfirmItem && (() => {
              const fee = parseFloat(walletConfirmItem.deliveryFee || "30");
              const gst = parseFloat((fee * 0.18).toFixed(2));
              const total = fee + gst;
              return (
                <>
                  <View style={{ backgroundColor: C.backgroundSecondary, borderRadius: 14, padding: 16, marginBottom: 16, gap: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ color: C.textSecondary, fontSize: 13 }}>Delivery fee</Text>
                      <Text style={{ color: C.text, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>₹{fee.toFixed(0)}</Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ color: C.textSecondary, fontSize: 13 }}>GST (18%)</Text>
                      <Text style={{ color: C.text, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>₹{gst.toFixed(2)}</Text>
                    </View>
                    <View style={{ height: 1, backgroundColor: C.border, marginVertical: 4 }} />
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ color: C.text, fontFamily: "Inter_700Bold", fontSize: 15 }}>Total</Text>
                      <Text style={{ color: "#10B981", fontFamily: "Inter_800ExtraBold", fontSize: 18 }}>₹{total.toFixed(0)}</Text>
                    </View>
                  </View>
                  <Text style={{ color: C.textSecondary, fontSize: 12, textAlign: "center", marginBottom: 16 }}>
                    This amount will be deducted from your wallet balance.
                  </Text>
                  <Pressable
                    style={{ paddingVertical: 14, borderRadius: 12, backgroundColor: "#10B981", alignItems: "center", marginBottom: 10 }}
                    onPress={handleConfirmWalletPay}
                    disabled={actionMutation.isPending}>
                    {actionMutation.isPending
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 }}>💳 Pay ₹{total.toFixed(0)} from Wallet</Text>}
                  </Pressable>
                  <Pressable
                    style={{ paddingVertical: 12, borderRadius: 12, backgroundColor: C.backgroundSecondary, alignItems: "center" }}
                    onPress={() => { setWalletConfirmItem(null); router.push("/(tabs)/wallet"); }}>
                    <Text style={{ color: C.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Top Up Wallet</Text>
                  </Pressable>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── Payment Review Modal (provider reviews requester's screenshot → confirm or reject) ── */}
      <Modal
        visible={!!paymentReviewItem}
        transparent
        animationType="slide"
        onRequestClose={() => { setPaymentReviewItem(null); setReviewImageFullscreen(false); }}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
            {/* Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 0.5, borderColor: C.border }}>
              <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: C.text }}>Review Payment Screenshot</Text>
              <Pressable
                onPress={() => { setPaymentReviewItem(null); setReviewImageFullscreen(false); }}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.backgroundSecondary, alignItems: "center", justifyContent: "center" }}>
                <Feather name="x" size={18} color={C.text} />
              </Pressable>
            </View>

            {/* Info banner */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#EDE9FE", borderRadius: 10, margin: 16, marginBottom: 12, padding: 10 }}>
              <Feather name="info" size={14} color="#5B4FE8" />
              <Text style={{ color: "#5B4FE8", fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 }}>
                Student submitted this payment proof. Tap to view full screen before confirming.
              </Text>
            </View>

            {/* Screenshot image with full-screen expand button */}
            <View style={{ marginHorizontal: 16, borderRadius: 14, overflow: "hidden", backgroundColor: "#1C1917", position: "relative" }}>
              {paymentReviewItem?.paymentScreenshotUrl ? (
                <Image
                  source={{ uri: paymentReviewItem.paymentScreenshotUrl }}
                  style={{ width: "100%", height: 260 }}
                  contentFit="contain"
                  cachePolicy="disk"
                />
              ) : (
                <View style={{ height: 200, alignItems: "center", justifyContent: "center" }}>
                  <Feather name="image" size={40} color="#78716C" />
                  <Text style={{ color: "#78716C", marginTop: 8, fontSize: 12 }}>No screenshot available</Text>
                </View>
              )}
              {/* Expand button overlay */}
              {paymentReviewItem?.paymentScreenshotUrl && (
                <Pressable
                  onPress={() => setReviewImageFullscreen(true)}
                  style={{ position: "absolute", top: 10, right: 10, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 20, width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
                  <Feather name="maximize-2" size={18} color="#fff" />
                </Pressable>
              )}
            </View>

            {/* Confirm / Reject buttons */}
            <View style={{ flexDirection: "row", gap: 12, marginHorizontal: 16, marginTop: 18 }}>
              <Pressable
                style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: "#FEE2E2", alignItems: "center", opacity: actionMutation.isPending ? 0.6 : 1 }}
                onPress={handleRejectPayment}
                disabled={actionMutation.isPending}>
                {actionMutation.isPending
                  ? <ActivityIndicator color="#EF4444" size="small" />
                  : <>
                      <Feather name="x-circle" size={18} color="#EF4444" />
                      <Text style={{ color: "#EF4444", fontFamily: "Inter_700Bold", fontSize: 13, marginTop: 4 }}>Reject</Text>
                    </>}
              </Pressable>
              <Pressable
                style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: "#10B981", alignItems: "center", opacity: actionMutation.isPending ? 0.6 : 1 }}
                onPress={handleConfirmFromReview}
                disabled={actionMutation.isPending}>
                {actionMutation.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <Feather name="check-circle" size={18} color="#fff" />
                      <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13, marginTop: 4 }}>Confirm Payment</Text>
                    </>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Fullscreen Screenshot Viewer ── */}
      <Modal
        visible={reviewImageFullscreen}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setReviewImageFullscreen(false)}
        statusBarTranslucent
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          {/* Back arrow */}
          <Pressable
            onPress={() => setReviewImageFullscreen(false)}
            style={{ position: "absolute", top: 50, left: 16, zIndex: 10, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 22, width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </Pressable>
          {/* Full image */}
          {paymentReviewItem?.paymentScreenshotUrl && (
            <Image
              source={{ uri: paymentReviewItem.paymentScreenshotUrl }}
              style={{ flex: 1, width: "100%", height: "100%" }}
              contentFit="contain"
              cachePolicy="disk"
            />
          )}
        </View>
      </Modal>

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
  // Note on heights: borderRadius implicitly clips overflow on Android, so the
  // chip MUST be tall enough to fit the text+emoji or the glyphs get sliced
  // off at the rounded edges. We give the row a fixed minHeight, set explicit
  // lineHeight on both Text children, and disable includeFontPadding on
  // Android so Inter's extra ascent/descent doesn't push the text past the
  // clip boundary.
  // The ScrollView itself MUST have flexGrow:0 — without it, Android lets the
  // horizontal ScrollView stretch to fill remaining vertical space when the
  // active category has no listings, leaving a big blank gap above the chips.
  chipsScroll: { flexGrow: 0, flexShrink: 0 },
  chipsRow: { paddingHorizontal: 14, paddingVertical: 11, gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, minHeight: 34, borderRadius: 20, borderWidth: 1.5 },
  chipEmoji: { fontSize: 13, lineHeight: 16, includeFontPadding: false, textAlignVertical: "center" },
  chipLabel: { fontSize: 12, lineHeight: 16, fontFamily: "Inter_600SemiBold", includeFontPadding: false, textAlignVertical: "center" },

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
