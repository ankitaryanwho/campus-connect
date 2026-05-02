import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, Pressable, Modal, ScrollView,
  TextInput, ActivityIndicator, FlatList, Linking,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { Image } from "expo-image";
import { PLACEHOLDER_BLURHASH } from "@/constants/imagePlaceholder";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Seller {
  id: string;
  name: string;
  avatar?: string;
  college?: string;
  program?: string;
  phone?: string;
  verified?: boolean;
}

interface MarketplaceListing {
  id: string;
  listingType: "sell" | "rent";
  itemCategory: string;
  title: string;
  description: string;
  photos: string[];
  price: number;
  rentalUnit?: string;
  status: "active" | "sold" | "rented" | "withdrawn";
  seller: Seller;
  isOwn: boolean;
  offerCount: number;
  myOffer?: { id: string; amount: number; status: string } | null;
  createdAt: string;
}

interface MarketplaceOffer {
  id: string;
  listing_id: string;
  buyer_name: string;
  buyer_avatar?: string;
  buyer_college?: string;
  amount: number;
  message?: string;
  status: string;
  created_at: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ITEM_CATEGORIES = [
  { id: "electronics", label: "Electronics", emoji: "📱" },
  { id: "books", label: "Books & Notes", emoji: "📚" },
  { id: "clothing", label: "Clothing", emoji: "👕" },
  { id: "vehicles", label: "Vehicles", emoji: "🚗" },
  { id: "sports", label: "Sports", emoji: "⚽" },
  { id: "other", label: "Other", emoji: "📦" },
];

const RENTAL_UNITS = [
  { id: "hour", label: "/ hour" },
  { id: "day", label: "/ day" },
  { id: "week", label: "/ week" },
  { id: "month", label: "/ month" },
];

const TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "sell", label: "For Sale" },
  { id: "rent", label: "For Rent" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(price: number, listingType: string, rentalUnit?: string) {
  const fmt = new Intl.NumberFormat("en-IN").format(price);
  if (listingType === "rent" && rentalUnit) return `₹${fmt}/${rentalUnit}`;
  return `₹${fmt}`;
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── GradientAvatar (fallback) ───────────────────────────────────────────────

function MiniAvatar({ name, avatar, size = 32 }: { name: string; avatar?: string; size?: number }) {
  const initials = (name || "?")[0].toUpperCase();
  const hue = [...(name || "")].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  if (avatar) {
    return (
      <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} cachePolicy="disk" placeholder={PLACEHOLDER_BLURHASH} transition={200} />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: `hsl(${hue},65%,55%)`, alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ color: "#fff", fontSize: size * 0.4, fontFamily: "Inter_700Bold" }}>{initials}</Text>
    </View>
  );
}

// ─── Listing Card ────────────────────────────────────────────────────────────

function MarketplaceCard({
  listing, isDark, C, onMakeOffer, onViewOffers, onTextSeller, onMarkStatus,
}: {
  listing: MarketplaceListing;
  isDark: boolean;
  C: any;
  onMakeOffer: (l: MarketplaceListing) => void;
  onViewOffers: (l: MarketplaceListing) => void;
  onTextSeller: (l: MarketplaceListing) => void;
  onMarkStatus: (l: MarketplaceListing, status: string) => void;
}) {
  const isRent = listing.listingType === "rent";
  const catInfo = ITEM_CATEGORIES.find(c => c.id === listing.itemCategory);
  const photo = listing.photos?.[0];
  const isDone = listing.status !== "active";

  const surface = isDark ? C.surface : "#FFFFFF";
  const border = isDark ? C.border : "#E7E5E4";
  const textPrimary = isDark ? C.text : "#1C1917";
  const textMuted = isDark ? C.textTertiary : "#A8A29E";
  const textSec = isDark ? C.textSecondary : "#78716C";

  return (
    <View style={[cardStyles.card, { backgroundColor: surface, borderColor: border }]}>
      {/* Hero image / placeholder */}
      <View style={cardStyles.heroWrap}>
        {photo ? (
          <Image source={{ uri: photo }} style={cardStyles.heroImg} contentFit="cover" cachePolicy="disk" placeholder={PLACEHOLDER_BLURHASH} transition={200} />
        ) : (
          <View style={[cardStyles.heroPlaceholder, { backgroundColor: isRent ? "#F0FDF4" : "#FFFBEB" }]}>
            <Text style={cardStyles.heroEmoji}>{catInfo?.emoji ?? "📦"}</Text>
          </View>
        )}
        {/* Overlaid badges */}
        <View style={cardStyles.badgeRow}>
          <View style={[cardStyles.typeBadge, { backgroundColor: isRent ? "#10B981" : "#F59E0B" }]}>
            <Text style={cardStyles.typeBadgeText}>{isRent ? "RENT" : "SELL"}</Text>
          </View>
          {catInfo && (
            <View style={cardStyles.catBadge}>
              <Text style={cardStyles.catBadgeText}>{catInfo.emoji} {catInfo.label}</Text>
            </View>
          )}
        </View>
        {isDone && (
          <View style={cardStyles.soldOverlay}>
            <Text style={cardStyles.soldText}>{listing.status.toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={cardStyles.body}>
        <View style={cardStyles.titleRow}>
          <Text style={[cardStyles.title, { color: textPrimary }]} numberOfLines={1}>
            {listing.title}
          </Text>
          <Text style={[cardStyles.price, { color: isRent ? "#10B981" : "#F59E0B" }]}>
            {formatPrice(listing.price, listing.listingType, listing.rentalUnit)}
          </Text>
        </View>

        {listing.description ? (
          <Text style={[cardStyles.desc, { color: textSec }]} numberOfLines={2}>
            {listing.description}
          </Text>
        ) : null}

        {/* Seller info */}
        <View style={cardStyles.sellerRow}>
          <MiniAvatar name={listing.seller?.name || "?"} avatar={listing.seller?.avatar} size={22} />
          <Text style={[cardStyles.sellerName, { color: textMuted }]}>
            {listing.seller?.name}
            {listing.seller?.college ? ` · ${listing.seller.college}` : ""}
          </Text>
          <Text style={[cardStyles.timeAgo, { color: textMuted }]}>{timeAgo(listing.createdAt)}</Text>
        </View>

        {/* Actions */}
        <View style={[cardStyles.actions, { borderTopColor: isDark ? C.borderLight : "#F0EDEA" }]}>
          {listing.isOwn ? (
            <>
              <Pressable style={cardStyles.offersBtn} onPress={() => onViewOffers(listing)}>
                <Feather name="inbox" size={14} color="#6B7280" />
                <Text style={cardStyles.offersBtnText}>
                  {listing.offerCount > 0 ? `${listing.offerCount} Offer${listing.offerCount > 1 ? "s" : ""}` : "No Offers"}
                </Text>
              </Pressable>
              {!isDone && (
                <Pressable
                  style={[cardStyles.markBtn, { backgroundColor: isRent ? "#ECFDF5" : "#FEF9C3" }]}
                  onPress={() => onMarkStatus(listing, isRent ? "rented" : "sold")}
                >
                  <Text style={[cardStyles.markBtnText, { color: isRent ? "#10B981" : "#D97706" }]}>
                    Mark {isRent ? "Rented" : "Sold"}
                  </Text>
                </Pressable>
              )}
            </>
          ) : (
            <>
              {!isDone && (
                <Pressable
                  style={[cardStyles.offerMainBtn, { backgroundColor: isRent ? "#10B981" : "#F59E0B" }]}
                  onPress={() => onMakeOffer(listing)}
                >
                  <Feather name="tag" size={14} color="#fff" />
                  <Text style={cardStyles.offerMainBtnText}>
                    {listing.myOffer?.status === "pending" ? `Offered ₹${new Intl.NumberFormat("en-IN").format(listing.myOffer.amount)}` : "Make an Offer"}
                  </Text>
                </Pressable>
              )}
              <Pressable style={cardStyles.iconBtn} onPress={() => onTextSeller(listing)}>
                <Feather name="message-circle" size={17} color={isDark ? C.textSecondary : "#78716C"} />
              </Pressable>
              {listing.seller?.phone ? (
                <Pressable
                  style={cardStyles.iconBtn}
                  onPress={() => Linking.openURL(`tel:${listing.seller.phone}`)}
                >
                  <Feather name="phone" size={17} color={isDark ? C.textSecondary : "#78716C"} />
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  heroWrap: { position: "relative", height: 180 },
  heroImg: { width: "100%", height: "100%" },
  heroPlaceholder: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  heroEmoji: { fontSize: 60 },
  badgeRow: { position: "absolute", top: 10, left: 10, flexDirection: "row", gap: 6 },
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  catBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: "rgba(0,0,0,0.45)" },
  catBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  soldOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  soldText: { color: "#fff", fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  body: { padding: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold", flex: 1, marginRight: 8 },
  price: { fontSize: 16, fontFamily: "Inter_700Bold" },
  desc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginBottom: 8 },
  sellerRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  sellerName: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  timeAgo: { fontSize: 11, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, paddingTop: 10 },
  offerMainBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, height: 36, borderRadius: 10,
  },
  offerMainBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#F5F3EF", alignItems: "center", justifyContent: "center" },
  offersBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    height: 36, borderRadius: 10, backgroundColor: "#F5F3EF",
    justifyContent: "center",
  },
  offersBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#6B7280" },
  markBtn: { height: 36, borderRadius: 10, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  markBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});

// ─── Make Offer Sheet ─────────────────────────────────────────────────────────

function OfferSheet({
  listing, visible, onClose,
}: {
  listing: MarketplaceListing | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { apiRequest } = useAuth();
  const { showToast } = useToast();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!listing) return;
    const num = parseFloat(amount);
    if (!num || num <= 0) { showToast("Enter a valid offer amount", "error"); return; }
    setLoading(true);
    try {
      const res = await apiRequest(`/marketplace/${listing.id}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: num, message: message.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      showToast("Offer sent!", "success");
      qc.invalidateQueries({ queryKey: ["marketplace"] });
      setAmount(""); setMessage("");
      onClose();
    } catch {
      showToast("Failed to send offer", "error");
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheetStyles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={sheetStyles.kvWrap}>
        <View style={sheetStyles.sheet}>
          <View style={sheetStyles.handle} />
          <Text style={sheetStyles.sheetTitle}>Make an Offer</Text>
          {listing && (
            <View style={sheetStyles.listingSnippet}>
              <Text style={sheetStyles.snippetTitle} numberOfLines={1}>{listing.title}</Text>
              <Text style={sheetStyles.snippetAsk}>
                Asking: {formatPrice(listing.price, listing.listingType, listing.rentalUnit)}
              </Text>
            </View>
          )}

          <Text style={sheetStyles.inputLabel}>Your offer (₹)</Text>
          <TextInput
            style={sheetStyles.bigInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#A8A29E"
          />

          <Text style={[sheetStyles.inputLabel, { marginTop: 14 }]}>Message (optional)</Text>
          <TextInput
            style={[sheetStyles.textArea]}
            value={message}
            onChangeText={setMessage}
            placeholder="Tell the seller something..."
            placeholderTextColor="#A8A29E"
            multiline
            numberOfLines={3}
          />

          <Pressable
            style={[sheetStyles.submitBtn, { opacity: loading ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" size="small" /> : (
              <Text style={sheetStyles.submitBtnText}>Send Offer</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Seller Offers Sheet ──────────────────────────────────────────────────────

function SellerOffersSheet({
  listing, visible, onClose,
}: {
  listing: MarketplaceListing | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { apiRequest } = useAuth();
  const { showToast } = useToast();
  const qc = useQueryClient();
  const [acting, setActing] = useState<string | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ["marketplace-offers", listing?.id],
    queryFn: async () => {
      if (!listing) return { offers: [] };
      const res = await apiRequest(`/marketplace/${listing.id}/offers`);
      return res.json();
    },
    enabled: !!listing && visible,
  });

  const offers: MarketplaceOffer[] = data?.offers ?? [];

  const handleAction = async (offerId: string, action: "accept" | "reject") => {
    setActing(offerId);
    try {
      const res = await apiRequest(`/marketplace/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      showToast(action === "accept" ? "Offer accepted!" : "Offer declined", action === "accept" ? "success" : "info");
      refetch();
      qc.invalidateQueries({ queryKey: ["marketplace"] });
      if (action === "accept") onClose();
    } catch {
      showToast("Action failed", "error");
    } finally { setActing(null); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheetStyles.backdrop} onPress={onClose} />
      <View style={[sheetStyles.sheet, { maxHeight: "70%" }]}>
        <View style={sheetStyles.handle} />
        <Text style={sheetStyles.sheetTitle}>
          Offers Received {offers.length > 0 ? `(${offers.length})` : ""}
        </Text>
        {offers.length === 0 ? (
          <View style={sheetStyles.emptyOffers}>
            <Feather name="inbox" size={36} color="#A8A29E" />
            <Text style={sheetStyles.emptyOffersText}>No offers yet</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {offers.map(offer => (
              <View key={offer.id} style={sheetStyles.offerRow}>
                <MiniAvatar name={offer.buyer_name} avatar={offer.buyer_avatar} size={38} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={sheetStyles.offerBuyer}>{offer.buyer_name}</Text>
                  {offer.buyer_college ? (
                    <Text style={sheetStyles.offerCollege}>{offer.buyer_college}</Text>
                  ) : null}
                  {offer.message ? (
                    <Text style={sheetStyles.offerMsg} numberOfLines={2}>{offer.message}</Text>
                  ) : null}
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <Text style={sheetStyles.offerAmount}>
                    ₹{new Intl.NumberFormat("en-IN").format(offer.amount)}
                  </Text>
                  {offer.status === "pending" ? (
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <Pressable
                        style={[sheetStyles.actionBtn, { backgroundColor: "#DCFCE7" }]}
                        onPress={() => handleAction(offer.id, "accept")}
                        disabled={!!acting}
                      >
                        {acting === offer.id ? <ActivityIndicator size="small" color="#16A34A" /> : (
                          <Text style={{ color: "#16A34A", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Accept</Text>
                        )}
                      </Pressable>
                      <Pressable
                        style={[sheetStyles.actionBtn, { backgroundColor: "#FEE2E2" }]}
                        onPress={() => handleAction(offer.id, "reject")}
                        disabled={!!acting}
                      >
                        <Text style={{ color: "#DC2626", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Decline</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={[sheetStyles.statusChip, {
                      backgroundColor: offer.status === "accepted" ? "#DCFCE7" : "#FEE2E2"
                    }]}>
                      <Text style={{
                        fontSize: 11, fontFamily: "Inter_600SemiBold",
                        color: offer.status === "accepted" ? "#16A34A" : "#DC2626",
                      }}>
                        {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  kvWrap: { justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E7E5E4", alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#1C1917", marginBottom: 14 },
  listingSnippet: {
    backgroundColor: "#FFFBEB", borderRadius: 10, padding: 12, marginBottom: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  snippetTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#1C1917", flex: 1 },
  snippetAsk: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#F59E0B" },
  inputLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#78716C", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  bigInput: {
    fontSize: 32, fontFamily: "Inter_700Bold", color: "#1C1917",
    borderBottomWidth: 2, borderBottomColor: "#F59E0B", paddingVertical: 8,
    paddingHorizontal: 4,
  },
  textArea: {
    fontSize: 14, fontFamily: "Inter_400Regular", color: "#1C1917",
    borderWidth: 1, borderColor: "#E7E5E4", borderRadius: 12,
    padding: 12, minHeight: 80, textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: "#F59E0B", borderRadius: 14, height: 50,
    alignItems: "center", justifyContent: "center", marginTop: 20,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyOffers: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyOffersText: { fontSize: 15, fontFamily: "Inter_500Medium", color: "#A8A29E" },
  offerRow: {
    flexDirection: "row", alignItems: "flex-start", paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#F0EDEA",
  },
  offerBuyer: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#1C1917" },
  offerCollege: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#A8A29E" },
  offerMsg: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#78716C", marginTop: 2 },
  offerAmount: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#1C1917" },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  statusChip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
});

// ─── Listing Create Sheet (Multi-Step) ────────────────────────────────────────

const TOTAL_STEPS = 5;

function ListingCreateSheet({
  visible, onClose, onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { apiRequest } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState(0);
  const [listingType, setListingType] = useState<"sell" | "rent">("sell");
  const [category, setCategory] = useState("electronics");
  const [photos, setPhotos] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [rentalUnit, setRentalUnit] = useState("day");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep(0); setListingType("sell"); setCategory("electronics");
    setPhotos([]); setTitle(""); setDescription(""); setPrice(""); setRentalUnit("day");
  };

  const handleClose = () => { reset(); onClose(); };

  const pickPhoto = async () => {
    if (photos.length >= 4) { showToast("Maximum 4 photos", "info"); return; }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { showToast("Photo access denied", "error"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      setPhotos(p => [...p, uri]);
    }
  };

  const removePhoto = (idx: number) => setPhotos(p => p.filter((_, i) => i !== idx));

  const canNext = () => {
    if (step === 2 && !title.trim()) return false;
    if (step === 3 && (!price || parseFloat(price) <= 0)) return false;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const resolvedPhotos = await Promise.all(
        photos.map(async (uri) => {
          if (!uri.startsWith("data:image/")) return uri;
          const uploadRes = await apiRequest("/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ base64: uri, folder: "campusconnect/marketplace" }),
          });
          if (!uploadRes.ok) throw new Error("Failed to upload one or more photos");
          const { url } = await uploadRes.json();
          return url as string;
        }),
      );

      const res = await apiRequest("/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingType, itemCategory: category, title: title.trim(),
          description: description.trim(), photos: resolvedPhotos,
          price: parseFloat(price),
          rentalUnit: listingType === "rent" ? rentalUnit : undefined,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      showToast("Listing posted!", "success");
      reset();
      onCreated();
      onClose();
    } catch (e: any) {
      showToast(e.message || "Failed to post listing", "error");
    } finally { setSubmitting(false); }
  };

  const stepContent = () => {
    switch (step) {
      // ── Step 0: Choose type ────────────────────────────────────────────────
      case 0:
        return (
          <View style={createStyles.stepBody}>
            <Text style={createStyles.stepHeading}>What are you doing?</Text>
            <Text style={createStyles.stepSub}>Choose one to get started</Text>
            <View style={{ gap: 14, marginTop: 10 }}>
              <Pressable
                style={[createStyles.typeCard, listingType === "sell" && createStyles.typeCardActive, { borderColor: "#F59E0B" }]}
                onPress={() => setListingType("sell")}
              >
                <View style={[createStyles.typeIcon, { backgroundColor: "#FFFBEB" }]}>
                  <Text style={{ fontSize: 36 }}>🏷️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={createStyles.typeTitle}>Sell something</Text>
                  <Text style={createStyles.typeSub}>List an item for a fixed price</Text>
                </View>
                {listingType === "sell" && (
                  <View style={[createStyles.checkCircle, { backgroundColor: "#F59E0B" }]}>
                    <Feather name="check" size={14} color="#fff" />
                  </View>
                )}
              </Pressable>

              <Pressable
                style={[createStyles.typeCard, listingType === "rent" && createStyles.typeCardActive, { borderColor: "#10B981" }]}
                onPress={() => setListingType("rent")}
              >
                <View style={[createStyles.typeIcon, { backgroundColor: "#F0FDF4" }]}>
                  <Text style={{ fontSize: 36 }}>📅</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={createStyles.typeTitle}>Rent something out</Text>
                  <Text style={createStyles.typeSub}>Earn from things you own</Text>
                </View>
                {listingType === "rent" && (
                  <View style={[createStyles.checkCircle, { backgroundColor: "#10B981" }]}>
                    <Feather name="check" size={14} color="#fff" />
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        );

      // ── Step 1: Category ───────────────────────────────────────────────────
      case 1:
        return (
          <View style={createStyles.stepBody}>
            <Text style={createStyles.stepHeading}>What category?</Text>
            <Text style={createStyles.stepSub}>Pick the best match for your item</Text>
            <View style={createStyles.catGrid}>
              {ITEM_CATEGORIES.map(cat => (
                <Pressable
                  key={cat.id}
                  style={[createStyles.catTile, category === cat.id && createStyles.catTileActive]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Text style={createStyles.catEmoji}>{cat.emoji}</Text>
                  <Text style={[createStyles.catLabel, category === cat.id && { color: "#F59E0B" }]}>
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        );

      // ── Step 2: Photos + Title + Description ───────────────────────────────
      case 2:
        return (
          <ScrollView style={createStyles.stepBody} showsVerticalScrollIndicator={false}>
            <Text style={createStyles.stepHeading}>Add photos & details</Text>

            {/* Photos */}
            <View style={createStyles.photosSection}>
              <View style={createStyles.photosRow}>
                {photos.map((uri, i) => (
                  <View key={i} style={createStyles.photoThumb}>
                    <Image source={{ uri }} style={{ width: "100%", height: "100%", borderRadius: 10 }} contentFit="cover" />
                    <Pressable style={createStyles.removePhotoBtn} onPress={() => removePhoto(i)}>
                      <Feather name="x" size={11} color="#fff" />
                    </Pressable>
                  </View>
                ))}
                {photos.length < 4 && (
                  <Pressable style={createStyles.addPhotoBtn} onPress={pickPhoto}>
                    <Feather name="camera" size={22} color="#A8A29E" />
                    <Text style={createStyles.addPhotoText}>
                      {photos.length === 0 ? "Add photo" : "More"}
                    </Text>
                  </Pressable>
                )}
              </View>
              <Text style={createStyles.photoHint}>Up to 4 photos · optional but recommended</Text>
            </View>

            {/* Title */}
            <Text style={createStyles.fieldLabel}>Title *</Text>
            <TextInput
              style={createStyles.underlineInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Give it a catchy title..."
              placeholderTextColor="#A8A29E"
              maxLength={80}
            />

            {/* Description */}
            <Text style={[createStyles.fieldLabel, { marginTop: 20 }]}>Description</Text>
            <TextInput
              style={[createStyles.underlineInput, { minHeight: 80, textAlignVertical: "top" }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe condition, usage, reason for selling..."
              placeholderTextColor="#A8A29E"
              multiline
            />
          </ScrollView>
        );

      // ── Step 3: Price ──────────────────────────────────────────────────────
      case 3:
        return (
          <View style={createStyles.stepBody}>
            <Text style={createStyles.stepHeading}>
              {listingType === "rent" ? "What's your rate?" : "Set your price"}
            </Text>
            <Text style={createStyles.stepSub}>
              {listingType === "rent" ? "How much do you charge?" : "How much do you want for it?"}
            </Text>

            <View style={createStyles.priceInputWrap}>
              <Text style={createStyles.rupeeSign}>₹</Text>
              <TextInput
                style={createStyles.priceInput}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#A8A29E"
                autoFocus
              />
            </View>

            {listingType === "rent" && (
              <View style={{ marginTop: 24 }}>
                <Text style={createStyles.fieldLabel}>Rental period</Text>
                <View style={createStyles.unitRow}>
                  {RENTAL_UNITS.map(u => (
                    <Pressable
                      key={u.id}
                      style={[createStyles.unitChip, rentalUnit === u.id && createStyles.unitChipActive]}
                      onPress={() => setRentalUnit(u.id)}
                    >
                      <Text style={[createStyles.unitChipText, rentalUnit === u.id && createStyles.unitChipTextActive]}>
                        {u.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>
        );

      // ── Step 4: Review ─────────────────────────────────────────────────────
      case 4:
        return (
          <ScrollView style={createStyles.stepBody} showsVerticalScrollIndicator={false}>
            <Text style={createStyles.stepHeading}>Ready to post?</Text>
            <Text style={createStyles.stepSub}>Here's a preview of your listing</Text>

            <View style={createStyles.reviewCard}>
              {photos[0] ? (
                <Image source={{ uri: photos[0] }} style={createStyles.reviewPhoto} contentFit="cover" />
              ) : (
                <View style={[createStyles.reviewPhoto, { backgroundColor: "#FEF9C3", alignItems: "center", justifyContent: "center" }]}>
                  <Text style={{ fontSize: 48 }}>{ITEM_CATEGORIES.find(c => c.id === category)?.emoji ?? "📦"}</Text>
                </View>
              )}
              <View style={{ padding: 14 }}>
                <View style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
                  <View style={[createStyles.reviewBadge, { backgroundColor: listingType === "rent" ? "#10B981" : "#F59E0B" }]}>
                    <Text style={{ color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" }}>
                      {listingType.toUpperCase()}
                    </Text>
                  </View>
                  <View style={[createStyles.reviewBadge, { backgroundColor: "#F5F3EF" }]}>
                    <Text style={{ color: "#78716C", fontSize: 10, fontFamily: "Inter_600SemiBold" }}>
                      {ITEM_CATEGORIES.find(c => c.id === category)?.label}
                    </Text>
                  </View>
                </View>
                <Text style={createStyles.reviewTitle}>{title || "(No title)"}</Text>
                {description ? <Text style={createStyles.reviewDesc} numberOfLines={3}>{description}</Text> : null}
                <Text style={createStyles.reviewPrice}>
                  {formatPrice(parseFloat(price) || 0, listingType, listingType === "rent" ? rentalUnit : undefined)}
                </Text>
              </View>
            </View>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  const isLastStep = step === TOTAL_STEPS - 1;
  const accentColor = listingType === "rent" ? "#10B981" : "#F59E0B";

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={createStyles.container}>
          {/* Header */}
          <View style={createStyles.header}>
            <Pressable onPress={step === 0 ? handleClose : () => setStep(s => s - 1)} style={createStyles.backBtn}>
              <Feather name={step === 0 ? "x" : "arrow-left"} size={22} color="#1C1917" />
            </Pressable>
            {/* Step dots */}
            <View style={createStyles.dotsWrap}>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <View
                  key={i}
                  style={[createStyles.dot, i === step && { ...createStyles.dotActive, backgroundColor: accentColor }]}
                />
              ))}
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            {stepContent()}
          </View>

          {/* Footer */}
          <View style={createStyles.footer}>
            <Pressable
              style={[createStyles.nextBtn, { backgroundColor: accentColor, opacity: canNext() ? 1 : 0.4 }]}
              onPress={isLastStep ? handleSubmit : () => setStep(s => s + 1)}
              disabled={!canNext() || submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : (
                <Text style={createStyles.nextBtnText}>
                  {isLastStep ? "Post Listing" : "Continue"}
                </Text>
              )}
              {!isLastStep && !submitting && <Feather name="arrow-right" size={18} color="#fff" />}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF8F4" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: Platform.OS === "ios" ? 60 : 20, paddingBottom: 16,
    backgroundColor: "#FAF8F4",
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F0EDEA", alignItems: "center", justifyContent: "center" },
  dotsWrap: { flexDirection: "row", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#E7E5E4" },
  dotActive: { width: 20, height: 6, borderRadius: 3 },
  stepBody: { flex: 1, paddingHorizontal: 24 },
  stepHeading: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#1C1917", marginTop: 12, marginBottom: 6 },
  stepSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#78716C", marginBottom: 24 },
  typeCard: {
    flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16,
    borderWidth: 2, borderColor: "#E7E5E4", backgroundColor: "#FFFFFF", gap: 14,
  },
  typeCardActive: { borderWidth: 2 },
  typeIcon: { width: 60, height: 60, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  typeTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#1C1917", marginBottom: 2 },
  typeSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#78716C" },
  checkCircle: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catTile: {
    width: "30%", aspectRatio: 1, borderRadius: 14,
    backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#E7E5E4",
    alignItems: "center", justifyContent: "center", gap: 6,
  },
  catTileActive: { borderColor: "#F59E0B", backgroundColor: "#FFFBEB" },
  catEmoji: { fontSize: 28 },
  catLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#78716C", textAlign: "center" },
  photosSection: { marginBottom: 20 },
  photosRow: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginBottom: 6 },
  photoThumb: { width: 80, height: 80, borderRadius: 10, overflow: "visible", position: "relative" },
  removePhotoBtn: {
    position: "absolute", top: -6, right: -6, zIndex: 10,
    backgroundColor: "#EF4444", width: 20, height: 20, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  addPhotoBtn: {
    width: 80, height: 80, borderRadius: 10, borderWidth: 1.5, borderColor: "#E7E5E4",
    borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4,
    backgroundColor: "#F9F9F7",
  },
  addPhotoText: { fontSize: 10, fontFamily: "Inter_500Medium", color: "#A8A29E" },
  photoHint: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#A8A29E" },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#78716C", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  underlineInput: {
    fontSize: 16, fontFamily: "Inter_400Regular", color: "#1C1917",
    borderBottomWidth: 1.5, borderBottomColor: "#E7E5E4", paddingVertical: 8, paddingHorizontal: 0,
  },
  priceInputWrap: { flexDirection: "row", alignItems: "center", marginTop: 24 },
  rupeeSign: { fontSize: 36, fontFamily: "Inter_700Bold", color: "#A8A29E", marginRight: 4 },
  priceInput: { flex: 1, fontSize: 48, fontFamily: "Inter_700Bold", color: "#1C1917" },
  unitRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  unitChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: "#E7E5E4", backgroundColor: "#FFFFFF",
  },
  unitChipActive: { borderColor: "#10B981", backgroundColor: "#F0FDF4" },
  unitChipText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#78716C" },
  unitChipTextActive: { color: "#10B981" },
  reviewCard: { borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#E7E5E4", backgroundColor: "#FFFFFF", marginTop: 16 },
  reviewPhoto: { width: "100%", height: 160 },
  reviewBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  reviewTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#1C1917", marginBottom: 4 },
  reviewDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#78716C", marginBottom: 8 },
  reviewPrice: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#F59E0B" },
  footer: {
    paddingHorizontal: 24, paddingVertical: 16, paddingBottom: Platform.OS === "ios" ? 34 : 20,
    backgroundColor: "#FAF8F4", borderTopWidth: 1, borderTopColor: "#F0EDEA",
  },
  nextBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    height: 54, borderRadius: 16, gap: 8,
  },
  nextBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
});

// ─── Main MarketplaceFeed ─────────────────────────────────────────────────────

export function MarketplaceFeed({ isDark, C, user }: { isDark: boolean; C: any; user: any }) {
  const { apiRequest } = useAuth();
  const { showToast } = useToast();
  const qc = useQueryClient();

  const [typeFilter, setTypeFilter] = useState("all");
  const [createVisible, setCreateVisible] = useState(false);
  const [offerListing, setOfferListing] = useState<MarketplaceListing | null>(null);
  const [offersListing, setOffersListing] = useState<MarketplaceListing | null>(null);

  const { data, isLoading, refetch, isRefreshing } = useQuery({
    queryKey: ["marketplace", typeFilter],
    queryFn: async () => {
      const qs = typeFilter !== "all" ? `?type=${typeFilter}` : "";
      const res = await apiRequest(`/marketplace${qs}`);
      return res.json();
    },
  }) as any;

  const listings: MarketplaceListing[] = data?.listings ?? [];

  const handleTextSeller = async (listing: MarketplaceListing) => {
    if (listing.isOwn) return;
    try {
      const res = await apiRequest("/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: listing.seller.id }),
      });
      const json = await res.json();
      const convId = json.conversation?.id ?? json.id;
      if (convId) router.push(`/chat/${convId}`);
    } catch {
      showToast("Could not open chat", "error");
    }
  };

  const handleMarkStatus = async (listing: MarketplaceListing, status: string) => {
    try {
      const res = await apiRequest(`/marketplace/${listing.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      showToast(`Marked as ${status}!`, "success");
      qc.invalidateQueries({ queryKey: ["marketplace"] });
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  const bg = isDark ? C.background : "#FAF8F4";

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Type filter tabs */}
      <View style={[feedStyles.filterBar, { backgroundColor: bg }]}>
        {TYPE_FILTERS.map(f => (
          <Pressable
            key={f.id}
            style={[feedStyles.filterChip, typeFilter === f.id && feedStyles.filterChipActive]}
            onPress={() => setTypeFilter(f.id)}
          >
            <Text style={[feedStyles.filterChipText, typeFilter === f.id && feedStyles.filterChipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
        <View style={{ flex: 1 }} />
        <Pressable style={feedStyles.listBtn} onPress={() => setCreateVisible(true)}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={feedStyles.listBtnText}>List Item</Text>
        </Pressable>
      </View>

      {/* Feed */}
      {isLoading ? (
        <View style={feedStyles.centerWrap}>
          <ActivityIndicator color="#F59E0B" size="large" />
        </View>
      ) : listings.length === 0 ? (
        <View style={feedStyles.emptyWrap}>
          <Text style={feedStyles.emptyEmoji}>🛒</Text>
          <Text style={feedStyles.emptyTitle}>No listings yet</Text>
          <Text style={feedStyles.emptyMsg}>
            Be the first to {typeFilter === "rent" ? "list something for rent" : "sell something"} on campus!
          </Text>
          <Pressable style={feedStyles.emptyBtn} onPress={() => setCreateVisible(true)}>
            <Text style={feedStyles.emptyBtnText}>Post a Listing</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={l => l.id}
          renderItem={({ item }) => (
            <MarketplaceCard
              listing={item}
              isDark={isDark}
              C={C}
              onMakeOffer={l => setOfferListing(l)}
              onViewOffers={l => setOffersListing(l)}
              onTextSeller={handleTextSeller}
              onMarkStatus={handleMarkStatus}
            />
          )}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
          refreshing={!!isRefreshing}
          onRefresh={refetch}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modals */}
      <ListingCreateSheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreated={() => qc.invalidateQueries({ queryKey: ["marketplace"] })}
      />
      <OfferSheet
        listing={offerListing}
        visible={!!offerListing}
        onClose={() => setOfferListing(null)}
      />
      <SellerOffersSheet
        listing={offersListing}
        visible={!!offersListing}
        onClose={() => setOffersListing(null)}
      />
    </View>
  );
}

const feedStyles = StyleSheet.create({
  filterBar: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "#F0EDEA",
  },
  filterChipActive: { backgroundColor: "#F59E0B" },
  filterChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#78716C" },
  filterChipTextActive: { color: "#fff" },
  listBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "#1C1917",
  },
  listBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 10 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#1C1917" },
  emptyMsg: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#78716C", textAlign: "center" },
  emptyBtn: { marginTop: 8, backgroundColor: "#F59E0B", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  emptyBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
