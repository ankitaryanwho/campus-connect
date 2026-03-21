import { useState, useEffect } from "react";
import { adminFetch, formatDate } from "@/lib/utils";
import { Card, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge, Button, PageLoader, Modal } from "@/components/ui/core";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Users, Trash2, Eye, RefreshCw, Hash } from "lucide-react";

type Chatroom = {
  id: string;
  name: string;
  description?: string;
  category: string;
  member_count: number;
  message_count: number;
  created_at: string;
};

type Conversation = {
  id: string;
  participant1_id: string;
  participant1_name: string;
  participant1_email: string;
  participant2_id: string;
  participant2_name: string;
  participant2_email: string;
  message_count: number;
  last_message?: string;
  updated_at: string;
};

type Message = {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  created_at: string;
  is_read?: boolean;
};

type Tab = "chatrooms" | "conversations";

export default function ChatPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("chatrooms");
  const [rooms, setRooms] = useState<Chatroom[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgModal, setMsgModal] = useState<{ open: boolean; title: string; type: "room" | "conv"; id: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [convPage, setConvPage] = useState(1);
  const [convTotal, setConvTotal] = useState(0);

  const loadRooms = async () => {
    try {
      const res = await adminFetch("/chat/rooms");
      setRooms(Array.isArray(res.rooms) ? res.rooms : []);
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
    }
  };

  const loadConversations = async () => {
    try {
      const res = await adminFetch(`/chat/conversations?page=${convPage}&pageSize=20`);
      setConversations(Array.isArray(res.conversations) ? res.conversations : []);
      setConvTotal(res.total || 0);
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadRooms(), loadConversations()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadConversations(); }, [convPage]);

  const viewMessages = async (type: "room" | "conv", id: string, title: string) => {
    setMsgModal({ open: true, type, id, title });
    setMsgLoading(true);
    try {
      const ep = type === "room" ? `/chat/rooms/${id}/messages` : `/chat/conversations/${id}/messages`;
      const res = await adminFetch(ep);
      setMessages(Array.isArray(res.messages) ? res.messages : []);
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
    } finally {
      setMsgLoading(false);
    }
  };

  const deleteMessage = async (msgId: string) => {
    if (!confirm("Delete this message permanently?")) return;
    try {
      await adminFetch(`/chat/messages/${msgId}`, { method: "DELETE" });
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      toast({ description: "Message deleted" });
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
    }
  };

  const CATEGORY_COLORS: Record<string, string> = {
    general: "default", academic: "secondary", hostel: "warning", sports: "success", events: "outline",
  };

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-1">Chat Moderation</h1>
          <p className="text-muted-foreground text-sm">Monitor chatrooms and private conversations. Delete inappropriate messages.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setLoading(true); Promise.all([loadRooms(), loadConversations()]).finally(() => setLoading(false)); }}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-panel p-4">
          <div className="text-xs text-muted-foreground mb-1">Chatrooms</div>
          <div className="text-2xl font-bold text-white">{rooms.length}</div>
        </Card>
        <Card className="glass-panel p-4">
          <div className="text-xs text-muted-foreground mb-1">Total Messages (Rooms)</div>
          <div className="text-2xl font-bold text-white">{rooms.reduce((s, r) => s + Number(r.message_count || 0), 0)}</div>
        </Card>
        <Card className="glass-panel p-4">
          <div className="text-xs text-muted-foreground mb-1">Private Conversations</div>
          <div className="text-2xl font-bold text-white">{convTotal}</div>
        </Card>
        <Card className="glass-panel p-4">
          <div className="text-xs text-muted-foreground mb-1">Total Members</div>
          <div className="text-2xl font-bold text-white">{rooms.reduce((s, r) => s + Number(r.member_count || 0), 0)}</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-black/20 rounded-xl border border-white/5 w-fit">
        {(["chatrooms", "conversations"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-white"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? <PageLoader /> : (
        <>
          {tab === "chatrooms" && (
            <Card className="glass-panel overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-white">{room.name}</div>
                            {room.description && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{room.description}</div>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={(CATEGORY_COLORS[room.category] || "outline") as any}>{room.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          {room.member_count}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MessageCircle className="w-3 h-3 text-muted-foreground" />
                          {room.message_count}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(room.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => viewMessages("room", room.id, `#${room.name}`)}>
                          <Eye className="w-4 h-4 mr-1" /> View Messages
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!rooms.length && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No chatrooms found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          )}

          {tab === "conversations" && (
            <Card className="glass-panel overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participants</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead>Last Message</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversations.map((conv) => (
                    <TableRow key={conv.id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium text-white">{conv.participant1_name}</div>
                          <div className="text-xs text-muted-foreground">↔ {conv.participant2_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{conv.message_count} msgs</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground max-w-[180px] truncate">
                          {conv.last_message || "No messages"}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(conv.updated_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => viewMessages("conv", conv.id, `${conv.participant1_name} ↔ ${conv.participant2_name}`)}>
                          <Eye className="w-4 h-4 mr-1" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!conversations.length && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No conversations found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{convTotal} total conversations</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setConvPage((p) => Math.max(1, p - 1))} disabled={convPage === 1}>Previous</Button>
                  <Button variant="outline" size="sm" onClick={() => setConvPage((p) => p + 1)} disabled={conversations.length < 20}>Next</Button>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Messages Modal */}
      {msgModal && (
        <Modal isOpen={msgModal.open} onClose={() => setMsgModal(null)} title={`Messages — ${msgModal.title}`}>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {msgLoading ? (
              <div className="flex items-center justify-center py-8"><PageLoader /></div>
            ) : messages.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No messages in this conversation.</p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="flex gap-3 p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-colors group">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {(msg.sender_name || "?")[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-white">{msg.sender_name || "Unknown"}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(msg.created_at)}</span>
                    </div>
                    <p className="text-sm text-white/80 break-words">{msg.content}</p>
                  </div>
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-all"
                    title="Delete message"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
