import { useAdminGetAnalytics } from "@workspace/api-client-react";
import { useAuthHeaders } from "@/lib/utils";
import { Card, CardContent, PageLoader, Select } from "@/components/ui/core";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { useState } from "react";
import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  const req = useAuthHeaders();
  const [days, setDays] = useState(30);
  const { data, isLoading } = useAdminGetAnalytics({ days }, { ...req });

  if (isLoading) return <PageLoader />;
  if (!data) return <div>No data available</div>;

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-1">Deep Analytics</h1>
          <p className="text-muted-foreground">Comprehensive platform growth and revenue analysis.</p>
        </div>
        <div className="w-40">
          <Select value={days} onChange={e => setDays(Number(e.target.value))}>
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </Select>
        </div>
      </div>

      <Card className="glass-panel p-6">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" /> User Growth Trend
        </h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.usersByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" />
              <YAxis stroke="rgba(255,255,255,0.3)" />
              <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'rgba(255,255,255,0.1)' }} />
              <Line type="monotone" dataKey="count" name="New Users" stroke="hsl(var(--primary))" strokeWidth={4} dot={{r:4, fill: 'hsl(var(--primary))', strokeWidth: 2}} activeDot={{r: 8}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-panel p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Order Volume by Day</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.ordersByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" />
                <YAxis stroke="rgba(255,255,255,0.3)" />
                <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'rgba(255,255,255,0.1)' }} />
                <Bar dataKey="count" name="Orders" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="glass-panel p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Revenue Breakdown (by Service Type)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueByService} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="rgba(255,255,255,0.3)" tickFormatter={(val) => `₹${val}`} />
                <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.8)" width={100} />
                <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'rgba(255,255,255,0.1)' }} />
                <Bar dataKey="value" name="Revenue (₹)" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
