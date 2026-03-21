import { useState } from "react";
import { useAdminListPosts, useAdminDeletePost } from "@workspace/api-client-react";
import { useAuthHeaders, formatDate } from "@/lib/utils";
import { Card, Input, Button, PageLoader } from "@/components/ui/core";
import { useToast } from "@/hooks/use-toast";
import { Search, Trash2, Heart, MessageCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function PostsPage() {
  const req = useAuthHeaders();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const { data, isLoading } = useAdminListPosts({ search, page, pageSize }, { ...req });
  const delMut = useAdminDeletePost({ mutation: { onSuccess: () => { 
    queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
    toast({ description: "Post removed from feed" });
  }}});

  const handleDelete = (id: string) => {
    if(confirm("Remove this post permanently?")) {
      delMut.mutate({ postId: id }, req);
    }
  };

  return (
    <div className="space-y-6 animate-in-fade">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-1">Content Moderation</h1>
        <p className="text-muted-foreground">Manage social feed posts and enforce community guidelines.</p>
      </div>

      <Card className="glass-panel p-4 flex gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search post content..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {isLoading ? <PageLoader /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.posts?.map((post: any) => (
            <Card key={post.id} className="glass-panel flex flex-col hover:-translate-y-1 transition-transform duration-300">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      {post.authorName?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-semibold text-white leading-tight">{post.authorName}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(post.createdAt)}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-400/10 hover:text-red-300 -mr-2 -mt-2" onClick={() => handleDelete(post.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-white/80 text-sm whitespace-pre-wrap line-clamp-4">{post.content}</p>
              </div>
              <div className="px-5 py-3 border-t border-white/5 bg-black/20 flex gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Heart className="w-4 h-4"/> {post.likesCount}</span>
                <span className="flex items-center gap-1.5"><MessageCircle className="w-4 h-4"/> {post.commentsCount}</span>
              </div>
            </Card>
          ))}
          {!data?.posts?.length && <div className="col-span-full py-12 text-center text-muted-foreground">No posts found.</div>}
        </div>
      )}

      {/* Basic Pagination for Grid */}
      <div className="flex justify-center gap-4 pt-4">
        <Button variant="outline" onClick={() => setPage(p=>Math.max(1, p-1))} disabled={page === 1}>Previous</Button>
        <span className="flex items-center text-sm text-muted-foreground">Page {page}</span>
        <Button variant="outline" onClick={() => setPage(p=>p+1)} disabled={!data?.posts?.length || data.posts.length < pageSize}>Next</Button>
      </div>
    </div>
  );
}
