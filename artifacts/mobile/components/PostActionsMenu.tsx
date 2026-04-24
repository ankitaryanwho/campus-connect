import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

type Post = {
  id: string;
  content: string;
  hidden?: boolean;
};

interface Props {
  post: Post | null;
  visible: boolean;
  onClose: () => void;
  /** Called after a successful action so parents can refresh local state if needed. */
  onChanged?: (kind: "edit" | "hide" | "unhide" | "delete") => void;
  isDark?: boolean;
}

// Bottom-sheet menu shown from a post's 3-dot button.
// Renders Edit / Hide-or-Unhide / Delete actions for the owner.
// Internally manages an Edit modal so each call site doesn't repeat that boilerplate.
// Accepts post=null so call sites can always render this component without guards.
export function PostActionsMenu({ post, visible, onClose, onChanged, isDark = false }: Props) {
  const C = Colors[isDark ? "dark" : "light"];
  const { apiRequest } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  // Draft text starts empty; the effect below syncs it when the menu opens.
  const [editText, setEditText] = useState("");

  // When the menu opens, seed the draft from the current post content.
  React.useEffect(() => {
    if (visible && post) setEditText(post.content);
  }, [visible, post?.content]);

  const invalidateAll = (postId: string) => {
    queryClient.invalidateQueries({ queryKey: ["posts"] });
    queryClient.invalidateQueries({ queryKey: ["post", postId] });
    queryClient.invalidateQueries({ queryKey: ["userPosts"] });
  };

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!post) throw new Error("No post selected");
      const trimmed = editText.trim();
      if (!trimmed) throw new Error("Post cannot be empty");
      const res = await apiRequest(`/posts/${post.id}`, {
        method: "PATCH",
        body: JSON.stringify({ content: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to edit");
      return data;
    },
    onSuccess: () => {
      showToast("Post updated", "success");
      setEditing(false);
      onClose();
      if (post) invalidateAll(post.id);
      onChanged?.("edit");
    },
    onError: (err: any) => showToast(err.message || "Could not edit post", "error"),
  });

  const hideMutation = useMutation({
    mutationFn: async (action: "hide" | "unhide") => {
      if (!post) throw new Error("No post selected");
      const res = await apiRequest(`/posts/${post.id}/${action}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Failed to ${action}`);
      return { ...data, action };
    },
    onSuccess: ({ action }) => {
      showToast(action === "hide" ? "Post hidden from others" : "Post is public again", "success");
      onClose();
      if (post) invalidateAll(post.id);
      onChanged?.(action);
    },
    onError: (err: any) => showToast(err.message || "Could not update post", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!post) throw new Error("No post selected");
      const res = await apiRequest(`/posts/${post.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete");
      return data;
    },
    onSuccess: () => {
      showToast("Post deleted", "success");
      onClose();
      if (post) invalidateAll(post.id);
      onChanged?.("delete");
    },
    onError: (err: any) => showToast(err.message || "Could not delete post", "error"),
  });

  // All hooks are above this line — safe to bail out here if there's nothing to show.
  if (!post || !visible) return null;

  const confirmDelete = () => {
    if (Platform.OS === "web") {
      // eslint-disable-next-line no-alert
      const ok = typeof window !== "undefined" && window.confirm(
        "Are you sure you want to delete your post permanently? This cannot be undone."
      );
      if (ok) deleteMutation.mutate();
      return;
    }
    Alert.alert(
      "Delete post?",
      "Are you sure you want to delete your post permanently? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate() },
      ],
    );
  };

  const isHidden = !!post.hidden;

  return (
    <>
      {/* Action sheet */}
      <Modal visible={visible && !editing} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={[styles.sheet, { backgroundColor: C.surface }]} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={[styles.sheetTitle, { color: C.textTertiary }]}>POST ACTIONS</Text>

            <TouchableOpacity
              style={styles.row}
              onPress={() => setEditing(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: "#EEF2FF" }]}>
                <Feather name="edit-2" size={18} color="#5B4FE8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: C.text }]}>Edit</Text>
                <Text style={[styles.rowSub, { color: C.textSecondary }]}>
                  Change what this post says
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.row}
              onPress={() => hideMutation.mutate(isHidden ? "unhide" : "hide")}
              disabled={hideMutation.isPending}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: "#FEF3C7" }]}>
                {hideMutation.isPending ? (
                  <ActivityIndicator size="small" color="#F59E0B" />
                ) : (
                  <Feather name={isHidden ? "eye" : "eye-off"} size={18} color="#F59E0B" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: C.text }]}>
                  {isHidden ? "Unhide" : "Hide"}
                </Text>
                <Text style={[styles.rowSub, { color: C.textSecondary }]}>
                  {isHidden ? "Make this post public again" : "Only you will see this post"}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.row, { borderBottomWidth: 0 }]}
              onPress={confirmDelete}
              disabled={deleteMutation.isPending}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: "#FEE2E2" }]}>
                {deleteMutation.isPending ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Feather name="trash-2" size={18} color="#EF4444" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: "#EF4444" }]}>Delete</Text>
                <Text style={[styles.rowSub, { color: C.textSecondary }]}>
                  Permanently remove this post
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: C.border }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelText, { color: C.text }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit modal */}
      <Modal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)}>
        <Pressable style={styles.overlay} onPress={() => setEditing(false)}>
          <Pressable style={[styles.editSheet, { backgroundColor: C.surface }]} onPress={() => {}}>
            <View style={styles.handle} />
            <View style={styles.editHeader}>
              <Text style={[styles.editTitle, { color: C.text }]}>Edit post</Text>
              <TouchableOpacity onPress={() => setEditing(false)} hitSlop={8}>
                <Feather name="x" size={22} color={C.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              value={editText}
              onChangeText={setEditText}
              multiline
              maxLength={500}
              autoFocus
              placeholder="What's on your mind?"
              placeholderTextColor={C.textTertiary}
              style={[
                styles.editInput,
                { backgroundColor: C.backgroundSecondary, color: C.text, borderColor: C.border },
              ]}
            />
            <View style={styles.editFooter}>
              <Text style={[styles.charCount, { color: C.textTertiary }]}>
                {editText.length}/500
              </Text>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: editText.trim() && editText.trim() !== post.content
                      ? C.primary
                      : C.backgroundSecondary,
                  },
                ]}
                onPress={() => editMutation.mutate()}
                disabled={
                  editMutation.isPending ||
                  !editText.trim() ||
                  editText.trim() === post.content
                }
                activeOpacity={0.85}
              >
                {editMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.saveBtnText,
                      {
                        color:
                          editText.trim() && editText.trim() !== post.content
                            ? "#fff"
                            : C.textTertiary,
                      },
                    ]}
                  >
                    Save changes
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  rowSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  cancelBtn: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Edit sheet
  editSheet: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    minHeight: 320,
  },
  editHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  editTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  editInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 140,
    textAlignVertical: "top",
  },
  editFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  charCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 14,
    minWidth: 130,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
