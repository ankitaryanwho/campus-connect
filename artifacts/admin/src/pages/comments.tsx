import { useState, useEffect } from "react";
import { adminFetch, formatDate } from "@/lib/utils";
import { Card, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Button, Input, PageLoader } from "@/components/ui/core";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Trash2, Search, RefreshCw, AlertTriangle } from "lucide-react";

type Comment = {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  postId: string;
  createdAt: string;
};

const FLAGGED_KEYWORDS = ["abuse", "spam", "hate", "scam", "fraud", "explicit", "xxx", "nude", "kill", "threat"];

function isFlagged(text: string): boolean {
  const lower = text.toLowerCase();
  return FLAGGED_KEYWORDS.some((k) => lower.includes(k));
}

export default function CommentsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<{ comments: Comment[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showFlagged, setShowFlagged] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "30" });
      if (search) params.append("search", search);
      const res = await adminFetch(`/comments?${params}`);
      setData(res);
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search, page]);

  const deleteComment = async (id: string) => {
    if (!confirm("Delete this comment permanently?")) return;
    try {
      await adminFetch(`/comments/${id}`, { method: "DELETE" });
      toast({ description: "Comment deleted" });
      setData((prev) =>
        prev ? { ...prev, comments: prev.comments.filter((c) => c.id !== id), total: prev.total - 1 } : prev
      );
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
    }
  };

  const comments = data?.comments ?? [];
  const flaggedCount = comments.filter((c) => isFlagged(c.content)).length;
  const displayed = showFlagged ? comments.filter((c) => isFlagged(c.content)) : comments;
  const total = data?.total ?? 0;
  const pageSize = 30;

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-1">Comments Moderation</h1>
          <p className="text-muted-foreground text-sm">Review and remove inappropriate comments from the social feed.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="glass-panel p-4">
          <div className="text-xs text-muted-foreground mb-1">Total Comments</div>
          <div className="text-2xl font-bold text-white">{total}</div>
        </Card>
        <Card className="glass-panel p-4">
          <div className="text-xs text-muted-foreground mb-1">Loaded</div>
          <div className="text-2xl font-bold text-white">{comments.length}</div>
        </Card>
        <Card className={`glass-panel p-4 ${flaggedCount > 0 ? "border-red-500/30" : ""}`}>
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Potentially Flagged
          </div>
          <div className={`text-2xl font-bold ${flaggedCount > 0 ? "text-red-400" : "text-white"}`}>{flaggedCount}</div>
        </Card>
      </div>

      {flaggedCount > 0 && (
        <Card className="glass-panel p-4 border-amber-500/30 bg-amber-500/5 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="flex-1 text-sm text-amber-200">
            <strong>{flaggedCount} comments</strong> contain potentially inappropriate content and may need review.
          </div>
          <Button
            size="sm"
            variant={showFlagged ? "default" : "outline"}
            onClick={() => setShowFlagged(!showFlagged)}
          >
            {showFlagged ? "Show All" : "Show Flagged Only"}
          </Button>
        </Card>
      )}

      {/* Search */}
      <Card className="glass-panel p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search comment content..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
      </Card>

      {loading ? <PageLoader /> : (
        <Card className="glass-panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Comment</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Post ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.map((comment) => {
                const flagged = isFlagged(comment.content);
                return (
                  <TableRow key={comment.id} className={flagged ? "bg-red-500/5 border-red-500/10" : ""}>
                    <TableCell>
                      <div className="flex items-start gap-2 max-w-[300px]">
                        {flagged && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />}
                        <span className={`text-sm ${flagged ? "text-amber-200" : "text-white/80"}`}>
                          {comment.content}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {(comment.authorName || "?")[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-white">{comment.authorName || "Unknown"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground font-mono">{comment.postId?.slice(0, 8)}...</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteComment(comment.id)}
                        title="Delete comment"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!displayed.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {showFlagged ? "No flagged comments found." : "No comments found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{total} total comments</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={comments.length < pageSize}>Next</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
