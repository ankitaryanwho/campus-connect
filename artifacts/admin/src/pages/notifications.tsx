import { useState } from "react";
import { useAdminBroadcastNotification } from "@workspace/api-client-react";
import { useAuthHeaders } from "@/lib/utils";
import { Card, Input, Button, Select } from "@/components/ui/core";
import { useToast } from "@/hooks/use-toast";
import { Send, Megaphone, CheckCircle2 } from "lucide-react";

export default function NotificationsPage() {
  const req = useAuthHeaders();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetRole, setTargetRole] = useState("all");
  const [isSuccess, setIsSuccess] = useState(false);

  const mutation = useAdminBroadcastNotification({
    mutation: {
      onSuccess: () => {
        setIsSuccess(true);
        setTitle("");
        setBody("");
        toast({ title: "Broadcast Sent", description: "Notification dispatched to users." });
        setTimeout(() => setIsSuccess(false), 3000);
      },
      onError: (err) => {
        toast({ title: "Failed to send", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;
    mutation.mutate({ data: { title, body, targetRole } }, req);
  };

  return (
    <div className="space-y-6 animate-in-fade max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 mx-auto flex items-center justify-center mb-4 shadow-lg shadow-primary/20 border border-primary/20">
          <Megaphone className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-display font-bold text-white mb-2">Global Broadcast</h1>
        <p className="text-muted-foreground text-lg">Push real-time notifications to user devices.</p>
      </div>

      <Card className="glass-panel p-8 relative overflow-hidden">
        {isSuccess && (
          <div className="absolute inset-0 z-20 bg-card/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in zoom-in">
            <CheckCircle2 className="w-20 h-20 text-emerald-500 mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold text-white">Broadcast Sent!</h2>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/90">Target Audience</label>
            <Select value={targetRole} onChange={e => setTargetRole(e.target.value)} className="h-12 bg-black/40">
              <option value="all">Everyone (All Users)</option>
              <option value="student">Students Only</option>
              <option value="provider">Service Providers Only</option>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/90">Notification Title</label>
            <Input 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="e.g., Scheduled Maintenance Downtime" 
              className="h-12 bg-black/40 text-lg"
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/90">Message Body</label>
            <textarea 
              value={body} 
              onChange={e => setBody(e.target.value)} 
              placeholder="Enter the detailed message here..." 
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[150px] resize-y"
              required
            />
          </div>

          <Button type="submit" size="lg" className="w-full text-lg shadow-[0_0_20px_rgba(59,130,246,0.3)]" isLoading={mutation.isPending}>
            <Send className="w-5 h-5 mr-2" /> Dispatch Notification
          </Button>
        </form>
      </Card>
    </div>
  );
}
