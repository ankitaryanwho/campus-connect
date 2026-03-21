import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Modal,
  useColorScheme, FlatList, ActivityIndicator, Platform,
  TextInput, Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_TABS = [
  { id: "assignments", label: "Assignments", icon: "file-text", color: "#5B4FE8" },
  { id: "certifications", label: "Certifications", icon: "award", color: "#10B981" },
  { id: "deliveries", label: "Delivery", icon: "package", color: "#F59E0B" },
  { id: "tasks", label: "Tasks", icon: "check-square", color: "#EF4444" },
];

const PROGRAMS = ["BCA", "BTech", "MBA", "MTech", "BSc", "BCom", "BA", "Other"];
const TASK_CATEGORIES = ["design", "development", "content", "video", "research", "other"];

const GATE_LOCATIONS = ["Gate No 3 (prepaid only)", "Gate No 1 (prepaid only)"];
const OUTLET_LOCATIONS = ["Southern Stories", "Hotspot", "Snapeats", "Kathi Junction", "Dominos", "Subway"];
const ALL_PICKUP_LOCATIONS = [...GATE_LOCATIONS, ...OUTLET_LOCATIONS];
const COURIER_COMPANIES = ["EKart Logistics", "BlueDart", "Amazon Shipping", "ShadowFax", "Express News", "SafeXpress"];

const isGate = (loc: string) => loc.startsWith("Gate No");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(s: string, C: any) {
  if (s === "open" || s === "pending") return C.success;
  if (s === "booked" || s === "accepted" || s === "payment_marked") return C.warning;
  if (s === "in_progress") return "#8B5CF6";
  if (s === "completed") return C.primary;
  if (s === "cancelled") return C.error;
  return C.textTertiary;
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    open: "Open", pending: "Pending", booked: "Booked",
    accepted: "Accepted", payment_marked: "Payment Sent",
    payment_confirmed: "Confirmed", in_progress: "On the way",
    completed: "Delivered", cancelled: "Cancelled",
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
  const endpoint = serviceType === "certifications" ? "/services/certifications" : "/services/assignments";

  const reset = () => { setTitle(""); setDescription(""); setPrice(""); setSubject(""); setTargetYear(user?.year || 1); };

  const yearOptions = serviceType === "certifications"
    ? [1, 2, 3, 4]
    : Array.from({ length: userYear }, (_, i) => i + 1);

  const programOptions = serviceType === "certifications" ? PROGRAMS : [userProgram];

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
            <Text style={[FS.modalTitle, { color: C.text }]}>Post {serviceType === "certifications" ? "Certification" : "Assignment"}</Text>
            <Pressable onPress={() => { reset(); onClose(); }}><Feather name="x" size={22} color={C.text} /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Field label="Title" value={title} onChange={setTitle} placeholder="e.g. BCA Sem 3 DBMS Assignment" C={C} icon="type" />
            <Field label="Description" value={description} onChange={setDescription} placeholder="What's included, timeline, format..." C={C} icon="align-left" multiline />
            <Field label="Price (₹)" value={price} onChange={setPrice} placeholder="e.g. 299" C={C} icon="credit-card" keyboard="numeric" />
            <Field label="Subject Name" value={subject} onChange={setSubject} placeholder="e.g. DBMS, Data Structures" C={C} icon="book" />

            <Text style={[FS.sectionLabel, { color: C.textSecondary }]}>
              For Year {serviceType === "assignments" ? `(max: Year ${userYear})` : ""}
            </Text>
            <View style={FS.chipRow}>
              {yearOptions.map(y => (
                <Pressable key={y} style={[FS.chip, { borderColor: C.border, backgroundColor: targetYear === y ? C.primary : C.backgroundSecondary }]} onPress={() => setTargetYear(y)}>
                  <Text style={[FS.chipText, { color: targetYear === y ? "#fff" : C.textSecondary }]}>Year {y}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[FS.sectionLabel, { color: C.textSecondary }]}>
              Program {serviceType === "assignments" ? "(your program only)" : ""}
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

function AcademicCard({ item, C, onAction, currentUserId, isPending, serviceType }: any) {
  const isOwner = item.poster?.id === currentUserId;
  const isBooked = item.bookedById != null;
  const canBook = !isOwner && !isBooked;
  const actionLabel = canBook ? "Book Now" : null;

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
          <View style={[CS.badge, { backgroundColor: statusColor(item.status, C) + "20" }]}>
            <Text style={[CS.badgeText, { color: statusColor(item.status, C) }]}>{statusLabel(item.status)}</Text>
          </View>
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
      {isOwner && (
        <View style={[CS.ownerBadge, { backgroundColor: C.primaryLight }]}>
          <Feather name="star" size={11} color={C.primary} />
          <Text style={[CS.ownerBadgeText, { color: C.primary }]}>Your listing</Text>
        </View>
      )}
      {item.bookedBy && (
        <View style={[CS.ownerBadge, { backgroundColor: C.successLight || "#D1FAE5" }]}>
          <Feather name="check-circle" size={11} color={C.success} />
          <Text style={[CS.ownerBadgeText, { color: C.success }]}>Booked by {item.bookedBy.name}</Text>
        </View>
      )}
      {actionLabel && (
        <Pressable
          style={[CS.actionBtn, { backgroundColor: C.primary }, isPending && { opacity: 0.6 }]}
          onPress={() => onAction(item.id)} disabled={isPending}>
          {isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={CS.actionBtnText}>{actionLabel}</Text>}
        </Pressable>
      )}
    </View>
  );
}

function DeliveryCard({ item, C, currentUser, onAccept, onReject, onMarkPaid, onConfirmPayment, onComplete, onRate, isPending }: any) {
  const isRequester = item.requester?.id === currentUser?.id;
  const isAgent = item.deliveryAgent?.id === currentUser?.id;
  const [showRating, setShowRating] = useState(false);

  const foodItems = item.foodItems ? JSON.parse(item.foodItems) : null;
  const subtotal = item.subtotal ? parseFloat(item.subtotal) : 0;
  const deliveryFee = item.deliveryFee ? parseFloat(item.deliveryFee) : 30;
  const total = subtotal + deliveryFee;

  const canCall = (isRequester || isAgent) && item.deliveryAgent?.phone && item.status !== "pending";

  return (
    <View style={[CS.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={CS.cardTop}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <View style={[CS.badge, { backgroundColor: item.pickupType === "gate" ? "#EDE9FE" : "#FEF3C7" }]}>
              <Text style={[CS.badgeText, { color: item.pickupType === "gate" ? "#5B4FE8" : "#D97706" }]}>
                {item.pickupType === "gate" ? "Parcel" : "Food Order"}
              </Text>
            </View>
          </View>
          <Text style={[CS.cardTitle, { color: C.text }]} numberOfLines={1}>{item.pickupLocation}</Text>
          <Text style={[CS.cardAuthor, { color: C.textSecondary }]}>→ {item.dropLocation}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          {item.pickupType === "outlet" && subtotal > 0 && (
            <Text style={[CS.cardPrice, { color: C.primary }]}>₹{total.toFixed(0)}</Text>
          )}
          <View style={[CS.badge, { backgroundColor: statusColor(item.status, C) + "20" }]}>
            <Text style={[CS.badgeText, { color: statusColor(item.status, C) }]}>{statusLabel(item.status)}</Text>
          </View>
        </View>
      </View>

      {/* Gate-specific info */}
      {item.pickupType === "gate" && (
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
        {item.requester && <Text style={{ color: C.textTertiary, fontSize: 11 }}>Requested by {item.requester.name}</Text>}
        {item.deliveryAgent && <Text style={{ color: C.textTertiary, fontSize: 11 }}>Agent: {item.deliveryAgent.name}</Text>}
      </View>

      {/* Payment timer (outlet, accepted, for requester) */}
      {isRequester && item.pickupType === "outlet" && item.status === "accepted" && item.paymentTimerStartedAt && (
        <PaymentTimer startedAt={item.paymentTimerStartedAt} C={C} />
      )}

      {/* Call button */}
      {canCall && item.deliveryAgent?.phone && (
        <Pressable
          style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#D1FAE5", borderRadius: 10, padding: 12, marginTop: 8 }}
          onPress={() => Linking.openURL(`tel:${item.deliveryAgent.phone}`)}>
          <Feather name="phone" size={16} color="#059669" />
          <Text style={{ color: "#059669", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Call {isRequester ? "Delivery Agent" : "Requester"}</Text>
        </Pressable>
      )}

      {/* Action buttons by role and status */}
      <View style={{ gap: 8, marginTop: 8 }}>
        {/* Provider: accept/reject pending */}
        {isAgent === false && currentUser?.role === "provider" && currentUser?.services?.includes("deliveries") && item.status === "pending" && (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable style={[CS.actionBtn, { flex: 1, backgroundColor: C.primary }, isPending && { opacity: 0.6 }]}
              onPress={() => onAccept(item.id)} disabled={isPending}>
              {isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={CS.actionBtnText}>Accept</Text>}
            </Pressable>
          </View>
        )}

        {/* Requester: mark paid (outlet, accepted) */}
        {isRequester && item.pickupType === "outlet" && item.status === "accepted" && (
          <Pressable style={[CS.actionBtn, { backgroundColor: "#F59E0B" }, isPending && { opacity: 0.6 }]}
            onPress={() => onMarkPaid(item.id)} disabled={isPending}>
            {isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={CS.actionBtnText}>I've Paid ✓</Text>}
          </Pressable>
        )}

        {/* Agent: confirm payment received */}
        {isAgent && item.status === "payment_marked" && (
          <Pressable style={[CS.actionBtn, { backgroundColor: "#10B981" }, isPending && { opacity: 0.6 }]}
            onPress={() => onConfirmPayment(item.id)} disabled={isPending}>
            {isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={CS.actionBtnText}>Confirm Payment Received</Text>}
          </Pressable>
        )}

        {/* Gate: requester sees "agent accepted" info, agent sees requester's contact */}
        {isRequester && item.pickupType === "gate" && item.status === "accepted" && (
          <View style={{ backgroundColor: C.infoLight || "#EFF6FF", borderRadius: 10, padding: 10 }}>
            <Text style={{ color: "#3B82F6", fontFamily: "Inter_500Medium", fontSize: 13 }}>Your delivery agent will pick up your parcel. Please be reachable on your phone.</Text>
          </View>
        )}

        {/* Agent: mark complete */}
        {isAgent && (item.status === "in_progress" || (item.status === "accepted" && item.pickupType === "gate")) && (
          <Pressable style={[CS.actionBtn, { backgroundColor: "#5B4FE8" }, isPending && { opacity: 0.6 }]}
            onPress={() => onComplete(item.id)} disabled={isPending}>
            {isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={CS.actionBtnText}>Mark as Delivered</Text>}
          </Pressable>
        )}

        {/* Requester: rate (completed, no rating yet) */}
        {isRequester && item.status === "completed" && !item.ratingHappiness && (
          <>
            <Pressable style={[CS.actionBtn, { backgroundColor: "#F59E0B" }]} onPress={() => setShowRating(true)}>
              <Text style={CS.actionBtnText}>⭐ Rate this delivery</Text>
            </Pressable>
            <RatingModal visible={showRating} onClose={() => setShowRating(false)}
              onSubmit={async (data: any) => { await onRate(item.id, data); setShowRating(false); }} C={C} />
          </>
        )}

        {/* Rated */}
        {isRequester && item.status === "completed" && item.ratingHappiness && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FEF3C7", borderRadius: 10, padding: 10 }}>
            <Feather name="star" size={14} color="#F59E0B" />
            <Text style={{ color: "#92400E", fontFamily: "Inter_500Medium", fontSize: 13 }}>
              You rated: {item.ratingHappiness}★ happiness, {item.ratingHandling}★ handling, {item.ratingOnTime}★ on-time
            </Text>
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

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

  const isProvider = user?.role === "provider";
  const userServices: string[] = user?.services ? JSON.parse(user.services) : [];
  const canPost = (tab: string) => {
    if (tab === "deliveries") return user?.role === "student"; // students POST delivery requests
    if (tab === "tasks") return true; // anyone can post tasks
    return isProvider && (userServices.includes(tab) || userServices.length === 0);
  };

  const endpointMap: Record<string, string> = {
    assignments: "/services/assignments",
    certifications: "/services/certifications",
    deliveries: "/services/deliveries",
    tasks: "/services/tasks",
  };

  // Main data query
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["services", activeTab],
    queryFn: async () => {
      const res = await apiRequest(endpointMap[activeTab]);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  // Outlet items (for delivery form)
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

  // Action mutation (book, apply)
  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      setPendingId(id);
      const res = await apiRequest(`${endpointMap[activeTab]}/${id}/${action}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Action failed");
      return json;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["services", activeTab] });
      const msgs: Record<string, string> = { book: "Booked!", apply: "Applied!", accept: "Accepted!", "mark-paid": "Marked as paid!", "confirm-payment": "Payment confirmed!", complete: "Marked as delivered!" };
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

  const items =
    data?.assignments || data?.certifications || data?.deliveries || data?.tasks || [];
  const activeService = SERVICE_TABS.find(t => t.id === activeTab)!;

  // Post button label
  const postLabel = () => {
    if (activeTab === "deliveries") return "Request";
    if (activeTab === "tasks") return "Post Task";
    return "Post";
  };

  const showPostBtn = canPost(activeTab);

  const renderItem = useCallback(({ item }: any) => {
    if (activeTab === "assignments" || activeTab === "certifications") {
      return (
        <AcademicCard
          item={item} C={C} serviceType={activeTab} currentUserId={user?.id}
          onAction={(id: string) => actionMutation.mutate({ id, action: "book" })}
          isPending={pendingId === item.id && actionMutation.isPending}
        />
      );
    }
    if (activeTab === "deliveries") {
      return (
        <DeliveryCard
          item={item} C={C} currentUser={user}
          onAccept={(id: string) => actionMutation.mutate({ id, action: "accept" })}
          onReject={(id: string) => actionMutation.mutate({ id, action: "reject" })}
          onMarkPaid={(id: string) => actionMutation.mutate({ id, action: "mark-paid" })}
          onConfirmPayment={(id: string) => actionMutation.mutate({ id, action: "confirm-payment" })}
          onComplete={(id: string) => actionMutation.mutate({ id, action: "complete" })}
          onRate={(id: string, data: any) => rateMutation.mutate({ id, data })}
          isPending={pendingId === item.id && (actionMutation.isPending || rateMutation.isPending)}
        />
      );
    }
    if (activeTab === "tasks") {
      return (
        <TaskCard
          item={item} C={C} currentUserId={user?.id}
          onAction={(id: string) => actionMutation.mutate({ id, action: "apply" })}
          isPending={pendingId === item.id && actionMutation.isPending}
          hasApplied={false}
        />
      );
    }
    return null;
  }, [activeTab, C, user, pendingId, actionMutation.isPending]);

  return (
    <View style={[CS.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[CS.header, { paddingTop: isWeb ? 67 : insets.top + 8, backgroundColor: C.background, borderBottomColor: C.border }]}>
        <View>
          <Text style={[CS.headerTitle, { color: C.text }]}>Services</Text>
          <Text style={[CS.headerSub, { color: C.textSecondary }]}>{items.length} listing{items.length !== 1 ? "s" : ""}</Text>
        </View>
        {showPostBtn && (
          <Pressable style={[CS.addBtn, { backgroundColor: activeService.color }]} onPress={() => setShowPostModal(true)}>
            <Feather name="plus" size={18} color="#fff" />
            <Text style={[CS.addBtnText]}>{ postLabel()}</Text>
          </Pressable>
        )}
      </View>

      {/* Role hint for delivery */}
      {activeTab === "deliveries" && (
        <View style={{ backgroundColor: C.backgroundSecondary, padding: 10, marginHorizontal: 12, marginTop: 4, borderRadius: 10 }}>
          <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" }}>
            {user?.role === "student"
              ? "You see your own delivery requests. Tap + to create a new one."
              : "You see pending requests + your accepted deliveries."}
          </Text>
        </View>
      )}

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={CS.tabsRow}>
        {SERVICE_TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[CS.tab, active ? { backgroundColor: tab.color } : { backgroundColor: C.backgroundSecondary, borderColor: C.border, borderWidth: 1 }]}
              onPress={() => setActiveTab(tab.id)}>
              <Feather name={tab.icon as any} size={15} color={active ? "#fff" : C.textSecondary} />
              <Text style={[CS.tabLabel, { color: active ? "#fff" : C.textSecondary }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* List */}
      {isLoading ? (
        <View style={CS.center}>
          <ActivityIndicator color={activeService.color} size="large" />
          <Text style={[{ color: C.textSecondary, fontSize: 14, fontFamily: "Inter_400Regular" }]}>Loading {activeService.label}...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item: any) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: isWeb ? 34 + 84 : 100, gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={CS.empty}>
              <View style={[CS.emptyIcon, { backgroundColor: activeService.color + "15" }]}>
                <Feather name={activeService.icon as any} size={36} color={activeService.color} />
              </View>
              <Text style={[CS.emptyTitle, { color: C.text }]}>
                {activeTab === "deliveries" && user?.role === "student"
                  ? "No delivery requests yet"
                  : activeTab === "deliveries"
                  ? "No pending deliveries"
                  : `No ${activeService.label} yet`}
              </Text>
              <Text style={[{ color: C.textSecondary, fontSize: 13, fontFamily: "Inter_400Regular" }]}>
                {showPostBtn ? "Be the first to post!" : "Check back later for listings."}
              </Text>
              {showPostBtn && (
                <Pressable style={[CS.emptyBtn, { backgroundColor: activeService.color }]} onPress={() => setShowPostModal(true)}>
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={[CS.emptyBtnText]}>{postLabel()}</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}

      {/* Post Modals */}
      {(activeTab === "assignments" || activeTab === "certifications") && (
        <PostAssignmentModal
          visible={showPostModal} onClose={() => setShowPostModal(false)}
          C={C} apiRequest={apiRequest} queryClient={queryClient} showToast={showToast}
          user={user} serviceType={activeTab}
        />
      )}
      {activeTab === "deliveries" && (
        <PostDeliveryModal
          visible={showPostModal} onClose={() => setShowPostModal(false)}
          C={C} apiRequest={apiRequest} queryClient={queryClient} showToast={showToast}
          outletItems={outletItems}
        />
      )}
      {activeTab === "tasks" && (
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  addBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  tabsRow: { paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  tabLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
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
