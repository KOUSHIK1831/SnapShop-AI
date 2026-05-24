import React, { useMemo, useState } from 'react';
import { Order } from '@/hooks/useSeller';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  format, 
  startOfDay, 
  subDays, 
  isSameDay, 
  startOfWeek, 
  subWeeks, 
  isSameWeek, 
  startOfMonth, 
  subMonths, 
  isSameMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval
} from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, ShoppingCart, IndianRupee, CreditCard } from 'lucide-react';

interface AnalyticsProps {
  orders: Order[];
}

export default function Analytics({ orders }: AnalyticsProps) {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Filter for successful orders only (not cancelled)
  const validOrders = useMemo(() => 
    orders.filter(o => o.status !== 'cancelled' && o.pay_status !== 'failed'),
  [orders]);

  const stats = useMemo(() => {
    const totalRevenue = validOrders.reduce((sum, o) => sum + (o.unit_price * o.quantity), 0);
    const totalOrders = validOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const onlinePayments = validOrders.filter(o => o.pay_method === 'online').length;

    return { totalRevenue, totalOrders, avgOrderValue, onlinePayments };
  }, [validOrders]);

  const chartData = useMemo(() => {
    const now = new Date();
    
    if (period === 'daily') {
      const days = eachDayOfInterval({
        start: subDays(now, 6),
        end: now
      });

      return days.map(day => {
        const dayOrders = validOrders.filter(o => isSameDay(new Date(o.created_at), day));
        return {
          name: format(day, 'EEE'),
          fullDate: format(day, 'MMM dd'),
          sales: dayOrders.reduce((sum, o) => sum + (o.unit_price * o.quantity), 0),
          orders: dayOrders.length
        };
      });
    }

    if (period === 'weekly') {
      const weeks = eachWeekOfInterval({
        start: subWeeks(now, 3),
        end: now
      }, { weekStartsOn: 1 });

      return weeks.map(week => {
        const weekOrders = validOrders.filter(o => isSameWeek(new Date(o.created_at), week, { weekStartsOn: 1 }));
        return {
          name: `Week ${format(week, 'w')}`,
          fullDate: `From ${format(week, 'MMM dd')}`,
          sales: weekOrders.reduce((sum, o) => sum + (o.unit_price * o.quantity), 0),
          orders: weekOrders.length
        };
      });
    }

    if (period === 'monthly') {
      const months = eachMonthOfInterval({
        start: subMonths(now, 5),
        end: now
      });

      return months.map(month => {
        const monthOrders = validOrders.filter(o => isSameMonth(new Date(o.created_at), month));
        return {
          name: format(month, 'MMM'),
          fullDate: format(month, 'MMMM yyyy'),
          sales: monthOrders.reduce((sum, o) => sum + (o.unit_price * o.quantity), 0),
          orders: monthOrders.length
        };
      });
    }

    return [];
  }, [validOrders, period]);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Revenue" 
          value={`₹${stats.totalRevenue.toLocaleString()}`} 
          icon={IndianRupee} 
          description="Total sales value"
          color="blue"
        />
        <MetricCard 
          title="Total Orders" 
          value={stats.totalOrders} 
          icon={ShoppingCart} 
          description="Total successful orders"
          color="green"
        />
        <MetricCard 
          title="Avg. Order Value" 
          value={`₹${Math.round(stats.avgOrderValue).toLocaleString()}`} 
          icon={TrendingUp} 
          description="Revenue per order"
          color="amber"
        />
        <MetricCard 
          title="Online Payments" 
          value={stats.onlinePayments} 
          icon={CreditCard} 
          description="Orders paid online"
          color="purple"
        />
      </div>

      {/* Main Chart */}
      <Card className="border-border/50 shadow-surface">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
          <div>
            <CardTitle className="text-lg">Sales Performance</CardTitle>
            <CardDescription>Track your selling trends over time</CardDescription>
          </div>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as any)} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-3 w-full sm:w-[240px]">
              <TabsTrigger value="daily" className="text-xs">Daily</TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs">Weekly</TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-popover border border-border shadow-xl rounded-lg p-3 outline-none">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">{payload[0].payload.fullDate}</p>
                          <div className="flex items-center gap-2">
                            <div className="size-2 rounded-full bg-primary" />
                            <p className="text-sm font-bold text-foreground">₹{payload[0].value?.toLocaleString()}</p>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{payload[0].payload.orders} orders placed</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 shadow-surface">
          <CardHeader>
            <CardTitle className="text-base">Order Volume</CardTitle>
            <CardDescription>Number of orders per {period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover border border-border shadow-md rounded-md p-2 outline-none">
                            <p className="text-sm font-bold text-foreground">{payload[0].value} Orders</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-surface">
          <CardHeader>
            <CardTitle className="text-base">Insights</CardTitle>
            <CardDescription>Quick summary of your shop's health</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="size-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Bestselling Period</p>
                  <p className="text-xs text-muted-foreground">Most sales generated</p>
                </div>
              </div>
              <p className="text-sm font-bold">{chartData.length > 0 ? [...chartData].sort((a, b) => b.sales - a.sales)[0].name : '—'}</p>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-green-100 flex items-center justify-center">
                  <ShoppingCart className="size-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Total Items Sold</p>
                  <p className="text-xs text-muted-foreground">Across all successful orders</p>
                </div>
              </div>
              <p className="text-sm font-bold">{validOrders.reduce((sum, o) => sum + o.quantity, 0)} items</p>
            </div>

            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
              <p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">Pro Tip</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Sellers who offer discounts during "Weekends" see a 20% higher conversion rate. Try running a flash sale next Friday!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, description, color }: any) {
  const colorMap: any = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    amber: 'bg-amber-500/10 text-amber-500',
    purple: 'bg-purple-500/10 text-purple-500',
  };

  return (
    <Card className="border-border/50 shadow-surface overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <h3 className="text-2xl font-bold mt-1 tabular-nums">{value}</h3>
          </div>
          <div className={`p-2.5 rounded-xl ${colorMap[color] || 'bg-primary/10 text-primary'}`}>
            <Icon className="size-5" />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
