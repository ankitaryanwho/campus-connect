import { useState } from "react";
import { useLocation } from "wouter";
import { useAdminLogin } from "@workspace/api-client-react";
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/core";
import { Hexagon, Lock, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("admin@colyx.com");
  const [password, setPassword] = useState("admin-colyx-2024");

  const loginMutation = useAdminLogin({
    mutation: {
      onSuccess: (data) => {
        localStorage.setItem("admin_token", data.token);
        toast({ title: "Welcome back", description: "Successfully logged in to admin panel." });
        setLocation("/dashboard");
      },
      onError: (error) => {
        toast({ 
          title: "Login Failed", 
          description: error instanceof Error ? error.message : "Invalid credentials", 
          variant: "destructive" 
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { email, password } });
  };

  return (
    <div className="w-full max-w-md relative animate-in zoom-in-95 duration-700 fade-in">
      {/* Decorative background glows behind login card */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary to-accent opacity-30 blur-2xl z-0 animate-pulse" />
      
      <Card className="relative z-10 glass-panel border-white/10 rounded-2xl overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
        <CardHeader className="text-center pb-2 pt-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-white/10 flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <Hexagon className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display text-white text-glow">Admin Portal</CardTitle>
          <p className="text-muted-foreground text-sm mt-2">Sign in to manage Colyx</p>
        </CardHeader>
        <CardContent className="pt-6 pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 relative">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-black/40 border-white/10 focus-visible:border-primary" 
                  placeholder="admin@campus.edu"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 bg-black/40 border-white/10 focus-visible:border-primary" 
                  placeholder="••••••••"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 mt-4 text-base font-semibold"
              isLoading={loginMutation.isPending}
            >
              Sign In to System
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
