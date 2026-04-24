import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const C = {
  bg: "#FAF8F4",
  primary: "#5B4FE8",
  surface: "#FFFFFF",
  text: "#1A1A2E",
  muted: "rgba(26,26,46,0.55)" as const,
  border: "#E8E4F0",
  success: "#10B981",
  header: "#1A1A2E",
};

const GATE_LOCATIONS = ["Gate No 3 (prepaid only)", "Gate No 1 (prepaid only)"];
const OUTLET_LOCATIONS = ["Southern Stories", "Hotspot", "Snapeats", "Kathi Junction", "Dominos", "Subway"];
const ALL_PICKUP_LOCATIONS = [...OUTLET_LOCATIONS, ...GATE_LOCATIONS];
const COURIER_COMPANIES = ["EKart Logistics", "BlueDart", "Amazon Shipping", "ShadowFax", "Express News", "SafeXpress"];
const DELIVERY_CHARGE = 30;

const isGate = (loc: string) => loc.startsWith("Gate No");

type CardId = "item" | "pickup" | "dropoff" | "payment";
const STEPS: CardId[] = ["item", "pickup", "dropoff", "payment"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function AccordionCard({
  id, active, done, label, summary, onToggle, children,
}: {
  id: CardId; active: boolean; done: boolean; label: string;
  summary: string; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <View style={[styles.card, active && styles.cardActive]}>
      <Pressable style={styles.cardHeader} onPress={onToggle}>
        <View style={styles.cardLeft}>
          {done && !active ? (
            <Feather name="check-circle" size={20} color={C.success} />
          ) : active ? (
            <View style={styles.activeDot} />
          ) : (
            <View style={styles.inactiveDot} />
          )}
          <Text style={[styles.cardLabel, active && { color: C.primary }]}>{label}</Text>
          {active && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>REQUIRED</Text>
            </View>
          )}
        </View>
        <View style={styles.cardRight}>
          {!active && (
            <Text style={styles.summary} numberOfLines={1}>{summary}</Text>
          )}
          <Feather name={active ? "chevron-up" : "chevron-down"} size={20} color={C.muted} />
        </View>
      </Pressable>
      {active && (
        <View style={styles.cardBody}>
          {children}
        </View>
      )}
    </View>
  );
}

function FieldInput({
  label, value, onChange, placeholder, icon, keyboard,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; icon: string; keyboard?: any;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldRow}>
        <Feather name={icon as any} size={16} color={C.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.fieldText}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={C.muted}
          keyboardType={keyboard || "default"}
        />
      </View>
    </View>
  );
}

function DropdownPicker({
  label, options, value, onChange,
}: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={styles.fieldRow} onPress={() => setOpen((p) => !p)}>
        <Feather name="truck" size={16} color={C.muted} style={{ marginRight: 8 }} />
        <Text style={[styles.fieldText, { flex: 1, color: value ? C.text : C.muted }]}>
          {value || `Select ${label}`}
        </Text>
        <Feather name={open ? "chevron-up" : "chevron-down"} size={16} color={C.muted} />
      </Pressable>
      {open && (
        <View style={styles.dropdown}>
          {options.map((opt) => (
            <Pressable
              key={opt}
              style={[styles.dropdownItem, value === opt && styles.dropdownItemActive]}
              onPress={() => { onChange(opt); setOpen(false); }}
            >
              <Text style={[styles.dropdownText, value === opt && { color: C.primary, fontFamily: "Inter_600SemiBold" }]}>
                {opt}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function CartRow({
  item, qty, onQtyChange,
}: {
  item: any; qty: number; onQtyChange: (q: number) => void;
}) {
  return (
    <View style={styles.cartRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cartName}>{item.name}</Text>
        <Text style={styles.cartPrice}>₹{item.price}</Text>
      </View>
      <View style={styles.qtyRow}>
        <Pressable
          style={[styles.qtyBtn, qty === 0 && { borderColor: C.border }]}
          onPress={() => qty > 0 && onQtyChange(qty - 1)}
        >
          <Feather name="minus" size={13} color={qty > 0 ? C.primary : C.muted} />
        </Pressable>
        <Text style={styles.qtyText}>{qty}</Text>
        <Pressable style={styles.qtyBtn} onPress={() => onQtyChange(qty + 1)}>
          <Feather name="plus" size={13} color={C.primary} />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RequestDeliveryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { apiRequest } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [activeCard, setActiveCard] = useState<CardId>("pickup");
  const [pickupLocation, setPickupLocation] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [dropLocation, setDropLocation] = useState("");
  const [websiteName, setWebsiteName] = useState("");
  const [courierCompany, setCourierCompany] = useState("");
  const [orderCustomerName, setOrderCustomerName] = useState("");
  const [orderId, setOrderId] = useState("");
  const [orderMobile, setOrderMobile] = useState("");
  const [cart, setCart] = useState<Record<string, any>>({});

  const { data: outletData } = useQuery({
    queryKey: ["outlet-items"],
    queryFn: async () => {
      const res = await apiRequest("/services/outlet-items");
      if (!res.ok) throw new Error("Failed to load outlet items");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  const allItems: any[] = outletData?.items || [];

  const isGatePickup = pickupLocation ? isGate(pickupLocation) : false;
  const isOutletPickup = pickupLocation ? !isGate(pickupLocation) : false;
  const cartItems = Object.values(cart) as any[];
  const subtotal = cartItems.reduce((s, i) => s + parseFloat(i.price) * i.qty, 0);
  const total = isOutletPickup ? subtotal + DELIVERY_CHARGE : DELIVERY_CHARGE;

  const outletMenu = isOutletPickup
    ? allItems.filter((i) => i.outletName === pickupLocation && i.available)
    : [];

  const filteredLocs = ALL_PICKUP_LOCATIONS.filter((l) =>
    l.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const done: Record<CardId, boolean> = {
    item: isGatePickup
      ? !!(websiteName && courierCompany && orderCustomerName && orderId && orderMobile)
      : isOutletPickup
      ? cartItems.length > 0
      : false,
    pickup: !!pickupLocation,
    dropoff: !!dropLocation.trim(),
    payment: false,
  };

  const isValid =
    !!pickupLocation &&
    !!dropLocation.trim() &&
    (isGatePickup
      ? !!(websiteName && courierCompany && orderCustomerName && orderId && orderMobile)
      : isOutletPickup
      ? cartItems.length > 0
      : false);

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
        payload.foodItems = cartItems.map((i) => ({
          id: i.id,
          name: i.name,
          price: parseFloat(i.price),
          qty: i.qty,
        }));
        payload.subtotal = subtotal;
      }
      const res = await apiRequest("/services/deliveries", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to post");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services", "all"] });
      showToast("Delivery request posted!", "success");
      router.back();
    },
    onError: (err: any) => showToast(err.message || "Failed to post delivery", "error"),
  });

  const toggleCard = (card: CardId) =>
    setActiveCard((prev) => (prev === card ? "pickup" : card));

  const stepIndex = STEPS.indexOf(activeCard);

  const itemSummary = isGatePickup
    ? websiteName || "Gate package details"
    : cartItems.length > 0
    ? `${cartItems.length} item${cartItems.length > 1 ? "s" : ""} selected`
    : "Add items from menu";

  const resetPickup = () => {
    setCart({});
    setWebsiteName("");
    setCourierCompany("");
    setOrderCustomerName("");
    setOrderId("");
    setOrderMobile("");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.screen}>
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.headerBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>New Delivery</Text>
          <Pressable style={styles.headerBtn}>
            <Feather name="help-circle" size={20} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>

        {/* ── Progress segments ── */}
        <View style={styles.progressWrap}>
          {STEPS.map((step, i) => {
            const filled = i < stepIndex || done[step];
            const isActive = i === stepIndex;
            return (
              <View
                key={step}
                style={[
                  styles.seg,
                  filled || isActive ? styles.segFilled : styles.segEmpty,
                  isActive && styles.segActive,
                ]}
              />
            );
          })}
        </View>

        {/* ── Cards ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 110 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card 1 — Item Details */}
          <AccordionCard
            id="item"
            active={activeCard === "item"}
            done={done.item}
            label="Item Details"
            summary={itemSummary}
            onToggle={() => toggleCard("item")}
          >
            {!pickupLocation ? (
              <Text style={styles.hint}>
                Choose a pickup location first to see available options.
              </Text>
            ) : isGatePickup ? (
              <>
                <View style={styles.infoBox}>
                  <Feather name="info" size={13} color="#3B82F6" />
                  <Text style={styles.infoText}>
                    {" "}Gate pickups are for Amazon, Flipkart & other courier deliveries. Fill in your order details.
                  </Text>
                </View>
                <FieldInput
                  label="Website Name"
                  value={websiteName}
                  onChange={setWebsiteName}
                  placeholder="e.g. Amazon, Flipkart, Meesho"
                  icon="globe"
                />
                <DropdownPicker
                  label="Courier Company"
                  options={COURIER_COMPANIES}
                  value={courierCompany}
                  onChange={setCourierCompany}
                />
                <FieldInput
                  label="Customer Name"
                  value={orderCustomerName}
                  onChange={setOrderCustomerName}
                  placeholder="Name on the order"
                  icon="user"
                />
                <FieldInput
                  label="Order ID"
                  value={orderId}
                  onChange={setOrderId}
                  placeholder="e.g. 408-XXXXXXX"
                  icon="hash"
                />
                <FieldInput
                  label="Order Mobile"
                  value={orderMobile}
                  onChange={setOrderMobile}
                  placeholder="+91 XXXXX XXXXX"
                  icon="phone"
                  keyboard="phone-pad"
                />
              </>
            ) : outletMenu.length === 0 ? (
              <Text style={styles.hint}>No menu items available for this outlet right now.</Text>
            ) : (
              <>
                {outletMenu.map((item: any) => (
                  <CartRow
                    key={item.id}
                    item={item}
                    qty={cart[item.id]?.qty || 0}
                    onQtyChange={(q: number) => {
                      if (q === 0) {
                        const next = { ...cart };
                        delete next[item.id];
                        setCart(next);
                      } else {
                        setCart((prev) => ({ ...prev, [item.id]: { ...item, qty: q } }));
                      }
                    }}
                  />
                ))}
                {cartItems.length > 0 && (
                  <View style={styles.subtotalBox}>
                    <View style={styles.subtotalRow}>
                      <Text style={styles.subtotalLabel}>Items subtotal</Text>
                      <Text style={styles.subtotalValue}>₹{subtotal.toFixed(0)}</Text>
                    </View>
                    <View style={styles.subtotalRow}>
                      <Text style={styles.subtotalLabel}>Delivery charge</Text>
                      <Text style={styles.subtotalValue}>₹{DELIVERY_CHARGE}</Text>
                    </View>
                    <View style={[styles.subtotalRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>Total</Text>
                      <Text style={[styles.totalValue, { color: C.primary }]}>₹{total.toFixed(0)}</Text>
                    </View>
                  </View>
                )}
              </>
            )}
          </AccordionCard>

          {/* Card 2 — Pickup Location */}
          <AccordionCard
            id="pickup"
            active={activeCard === "pickup"}
            done={done.pickup}
            label="Pickup Location"
            summary={pickupLocation || "Select location"}
            onToggle={() => toggleCard("pickup")}
          >
            <View style={styles.searchRow}>
              <Feather name="search" size={15} color={C.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search locations..."
                placeholderTextColor={C.muted}
                value={locationSearch}
                onChangeText={setLocationSearch}
              />
            </View>
            {filteredLocs.map((loc, i) => {
              const gate = isGate(loc);
              const sel = pickupLocation === loc;
              return (
                <View key={loc}>
                  <Pressable
                    style={[styles.locRow, sel && styles.locRowSel]}
                    onPress={() => {
                      setPickupLocation(loc);
                      resetPickup();
                    }}
                  >
                    <View
                      style={[
                        styles.locIcon,
                        { backgroundColor: gate ? "#FEF3C7" : "#EDE9FE" },
                      ]}
                    >
                      <Feather
                        name={gate ? "package" : "coffee"}
                        size={17}
                        color={gate ? "#F59E0B" : C.primary}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.locName, sel && { color: C.primary }]}>{loc}</Text>
                      <Text style={styles.locSub}>
                        {gate ? "Parcel / courier pickup" : "Food & outlet delivery"}
                      </Text>
                    </View>
                    {sel ? (
                      <View style={styles.radioFilled}>
                        <View style={styles.radioDot} />
                      </View>
                    ) : (
                      <View style={styles.radioEmpty} />
                    )}
                  </Pressable>
                  {i < filteredLocs.length - 1 && <View style={styles.divider} />}
                </View>
              );
            })}
            <View style={styles.cantFindWrap}>
              <Pressable>
                <Text style={styles.cantFind}>Can't find your spot?</Text>
              </Pressable>
            </View>
          </AccordionCard>

          {/* Card 3 — Drop-off */}
          <AccordionCard
            id="dropoff"
            active={activeCard === "dropoff"}
            done={done.dropoff}
            label="Drop-off"
            summary={dropLocation || "Tap to enter your location"}
            onToggle={() => toggleCard("dropoff")}
          >
            <TextInput
              style={styles.dropInput}
              placeholder="Room / Block number (e.g. Block A Room 204)"
              placeholderTextColor={C.muted}
              value={dropLocation}
              onChangeText={setDropLocation}
            />
          </AccordionCard>

          {/* Card 4 — Payment */}
          <AccordionCard
            id="payment"
            active={activeCard === "payment"}
            done={false}
            label="Payment"
            summary={`Wallet Balance: ₹120 · Est. ₹${total}`}
            onToggle={() => toggleCard("payment")}
          >
            <View style={styles.payRow}>
              <Text style={styles.payLabel}>Wallet Balance</Text>
              <Text style={styles.payValue}>₹120</Text>
            </View>
            <View style={styles.payRow}>
              <Text style={styles.payLabel}>Estimated Charge</Text>
              <Text style={styles.payValue}>₹{total.toFixed(0)}</Text>
            </View>
          </AccordionCard>
        </ScrollView>

        {/* ── Sticky bottom bar ── */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View>
            <Text style={styles.bottomLabel}>Total</Text>
            <Text style={styles.bottomTotal}>₹{total.toFixed(0)}</Text>
          </View>
          <Pressable
            style={[styles.continueBtn, (!isValid || mutation.isPending) && { opacity: 0.5 }]}
            onPress={() => mutation.mutate()}
            disabled={!isValid || mutation.isPending}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.continueBtnText}>Request Pickup →</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  header: {
    backgroundColor: C.header,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingBottom: 14,
  },
  headerBtn: { padding: 10, borderRadius: 100 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#fff" },

  progressWrap: {
    flexDirection: "row",
    backgroundColor: C.header,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 6,
  },
  seg: { height: 4, flex: 1, borderRadius: 100 },
  segFilled: { backgroundColor: C.primary },
  segEmpty: { backgroundColor: "rgba(255,255,255,0.2)" },
  segActive: {
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 2,
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  cardActive: { borderColor: C.primary },
  cardHeader: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 10 },
  cardRight: { flexDirection: "row", alignItems: "center", gap: 6, maxWidth: "44%" },
  cardLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.text },
  summary: { fontSize: 13, color: C.muted, flexShrink: 1 },
  activeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary, marginLeft: 5 },
  inactiveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.border, marginLeft: 5 },
  chip: { backgroundColor: "rgba(91,79,232,0.1)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  chipText: { fontSize: 9, fontFamily: "Inter_700Bold", color: C.primary, letterSpacing: 0.5 },
  cardBody: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: C.border },

  locRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 2, borderRadius: 12 },
  locRowSel: { backgroundColor: "rgba(91,79,232,0.05)" },
  locIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  locName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.text },
  locSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  radioEmpty: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.border },
  radioFilled: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.primary, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },
  divider: { height: 1, backgroundColor: "rgba(232,228,240,0.6)", marginLeft: 50, marginVertical: 2 },

  searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: C.text, fontFamily: "Inter_400Regular" },

  cantFindWrap: { alignItems: "center", marginTop: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  cantFind: { fontSize: 14, fontFamily: "Inter_500Medium", color: C.primary },

  cartRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  cartName: { fontSize: 14, fontFamily: "Inter_500Medium", color: C.text },
  cartPrice: { fontSize: 13, color: C.muted, marginTop: 2 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: C.primary, alignItems: "center", justifyContent: "center" },
  qtyText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text, minWidth: 16, textAlign: "center" },

  subtotalBox: { backgroundColor: C.bg, borderRadius: 12, padding: 12, marginTop: 14 },
  subtotalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  totalRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border, marginBottom: 0 },
  subtotalLabel: { fontSize: 13, color: C.muted },
  subtotalValue: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.text },
  totalLabel: { fontSize: 15, fontFamily: "Inter_700Bold", color: C.text },
  totalValue: { fontSize: 15, fontFamily: "Inter_700Bold" },

  dropInput: { backgroundColor: C.bg, borderRadius: 12, padding: 14, fontSize: 14, color: C.text, fontFamily: "Inter_400Regular", marginTop: 8 },

  payRow: { backgroundColor: C.bg, borderRadius: 12, padding: 14, flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  payLabel: { fontSize: 13, color: C.muted },
  payValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.text },

  fieldWrap: { marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: C.muted, marginBottom: 5, marginLeft: 4 },
  fieldRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12 },
  fieldText: { flex: 1, fontSize: 14, color: C.text, fontFamily: "Inter_400Regular" },

  dropdown: { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginTop: 4, overflow: "hidden" },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  dropdownItemActive: { backgroundColor: "rgba(91,79,232,0.06)" },
  dropdownText: { fontSize: 14, color: C.text, fontFamily: "Inter_400Regular" },

  infoBox: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#EFF6FF", borderRadius: 10, padding: 12, marginBottom: 12 },
  infoText: { fontSize: 12, color: "#3B82F6", fontFamily: "Inter_500Medium", flex: 1 },
  hint: { fontSize: 13, color: C.muted, textAlign: "center", paddingVertical: 14 },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomLabel: { fontSize: 12, color: C.muted, fontFamily: "Inter_400Regular" },
  bottomTotal: { fontSize: 22, fontFamily: "Inter_700Bold", color: C.text },
  continueBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 100,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
