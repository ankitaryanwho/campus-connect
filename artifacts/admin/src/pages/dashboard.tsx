import { useAdminGetStats, useAdminGetAnalytics } from "@workspace/api-client-react";
import { useAuthHeaders, formatCurrency } from "@/lib/utils";
import { Card, CardContent, PageLoader } from "@/components/ui/core";
import { Users, CreditCard, ShoppingBag, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function DashboardPage() {
  const req = useAuthHeaders();
  const { data: stats, isLoading: statsLoading } = useAdminGetStats({ ...req });
  const { data: analytics, isLoading: analyticsLoading } = useAdminGetAnalytics({ days: 7 }, { ...req });

  if (statsLoading || analyticsLoading) return <PageLoader />;
  if (!stats || !analytics) return <div>Failed to load dashboard</div>;

  return (
    <div className="space-y-8 animate-in-fade">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-2">Overview</h1>
        <p className="text-muted-foreground">Monitor platform activity and performance metrics.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Users" value={stats.totalUsers} icon={Users} color="text-blue-500" bg="bg-blue-500/10" trend="+12% this week" />
        <StatCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={CreditCard} color="text-emerald-500" bg="bg-emerald-500/10" trend="Active volume" />
        <StatCard title="Completed Orders" value={stats.completedOrders} icon={ShoppingBag} color="text-purple-500" bg="bg-purple-500/10" trend="Delivery & Tasks" />
        <StatCard title="Total Posts" value={stats.totalPosts} icon={Activity} color="text-amber-500" bg="bg-amber-500/10" trend="Community engagement" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="glass-panel">
          <div className="p-6 pb-2 border-b border-white/5">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Revenue (Last 7 Days)
            </h3>
          </div>
          <CardContent className="pt-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.revenueByDay}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: 'white' }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Users Chart */}
        <Card className="glass-panel">
          <div className="p-6 pb-2 border-b border-white/5">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              New Users (Last 7 Days)
            </h3>
          </div>
          <CardContent className="pt-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.usersByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg, trend }: any) {
  return (
    <Card className="glass-panel relative overflow-hidden group hover:border-white/20 transition-all duration-300">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className="w-16 h-16" />
      </div>
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
          <h3 className="font-medium text-muted-foreground">{title}</h3>
        </div>
        <div className="flex flex-col">
          <span className="text-3xl font-display font-bold text-white">{value}</span>
          <span className="text-xs text-muted-foreground mt-2 font-medium">{trend}</span>
        </div>
      </CardContent>
    </Card>
  );
}
