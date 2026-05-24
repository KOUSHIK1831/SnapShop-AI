import { useTranslation } from "react-i18next";import React, { useMemo, useState } from 'react';
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
  Area } from
'recharts';
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
  eachMonthOfInterval } from
'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, ShoppingCart, IndianRupee, CreditCard } from 'lucide-react';

interface AnalyticsProps {
  orders: Order[];
}

export default function Analytics({ orders }: AnalyticsProps) {const { t } = useTranslation();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Filter for successful orders only (not cancelled)
  const validOrders = useMemo(() =>
  orders.filter((o) => o.status !== 'cancelled' && o.pay_status !== 'failed'),
  [orders]);

  const stats = useMemo(() => {
    const totalRevenue = validOrders.reduce((sum, o) => sum + o.unit_price * o.quantity, 0);
    const totalOrders = validOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const onlinePayments = validOrders.filter((o) => o.pay_method === 'online').length;

    return { totalRevenue, totalOrders, avgOrderValue, onlinePayments };
  }, [validOrders]);

  const chartData = useMemo(() => {
    const now = new Date();

    if (period === 'daily') {
      const days = eachDayOfInterval({
        start: subDays(now, 6),
        end: now
      });

      return days.map((day) => {
        const dayOrders = validOrders.filter((o) => isSameDay(new Date(o.created_at), day));
        return {
          name: format(day, 'EEE'),
          fullDate: format(day, 'MMM dd'),
          sales: dayOrders.reduce((sum, o) => sum + o.unit_price * o.quantity, 0),
          orders: dayOrders.length
        };
      });
    }

    if (period === 'weekly') {
      const weeks = eachWeekOfInterval({
        start: subWeeks(now, 3),
        end: now
      }, { weekStartsOn: 1 });

      return weeks.map((week) => {
        const weekOrders = validOrders.filter((o) => isSameWeek(new Date(o.created_at), week, { weekStartsOn: 1 }));
        return {
          name: `Week ${format(week, 'w')}`,
          fullDate: `From ${format(week, 'MMM dd')}`,
          sales: weekOrders.reduce((sum, o) => sum + o.unit_price * o.quantity, 0),
          orders: weekOrders.length
        };
      });
    }

    if (period === 'monthly') {
      const months = eachMonthOfInterval({
        start: subMonths(now, 5),
        end: now
      });

      return months.map((month) => {
        const monthOrders = validOrders.filter((o) => isSameMonth(new Date(o.created_at), month));
        return {
          name: format(month, 'MMM'),
          fullDate: format(month, 'MMMM yyyy'),
          sales: monthOrders.reduce((sum, o) => sum + o.unit_price * o.quantity, 0),
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
          title={t("auto.total_revenue")}
          value={`₹${stats.totalRevenue.toLocaleString()}`}
          icon={IndianRupee}
          description={t("auto.total_sales_value")}
          color="blue" />
        
        <MetricCard
          title={t("admin.stats.totalOrders")}
          value={stats.totalOrders}
          icon={ShoppingCart}
          description={t("auto.total_successful_orders")}
          color="green" />
        
        <MetricCard
          title={t("auto.avg_order_value")}
          value={`₹${Math.round(stats.avgOrderValue).toLocaleString()}`}
          icon={TrendingUp}
          description={t("auto.revenue_per_order")}
          color="amber" />
        
        <MetricCard
          title={t("auto.online_payments")}
          value={stats.onlinePayments}
          icon={CreditCard}
          description={t("auto.orders_paid_online")}
          color="purple" />
        
      </div>

      {/* Main Chart */}
      <Card className="border-border/50 shadow-surface">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
          <div>
            <CardTitle className="text-lg">{t("auto.sales_performance")}</CardTitle>
            <CardDescription>{t("auto.track_your_selling_trends_over")}</CardDescription>
          </div>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as any)} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-3 w-full sm:w-[240px]">
              <TabsTrigger value={t("auto.daily")} className="text-xs">{t("auto.daily_344")}</TabsTrigger>
              <TabsTrigger value={t("auto.weekly")} className="text-xs">{t("auto.weekly_280")}</TabsTrigger>
              <TabsTrigger value={t("auto.monthly")} className="text-xs">{t("auto.monthly_911")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={t("auto.hsl_var_primary")} stopOpacity={0.1} />
                    <stop offset="95%" stopColor={t("auto.hsl_var_primary")} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={t("auto.hsl_var_border")} />
                <XAxis
                  dataKey={t("auto.name")}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  dy={10} />
                
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(value) => `₹${value}`} />
                
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
                          <p className="text-[11px] text-muted-foreground mt-0.5">{payload[0].payload.orders}{t("auto.orders_placed")}</p>
                        </div>);

                    }
                    return null;
                  }} />
                
                <Area
                  type="monotone"
                  dataKey={t("auto.sales")}
                  stroke={t("auto.hsl_var_primary")}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={t("auto.url_colorsales")}
                  animationDuration={1000} />
                
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 shadow-surface">
          <CardHeader>
            <CardTitle className="text-base">{t("auto.order_volume")}</CardTitle>
            <CardDescription>{t("auto.number_of_orders_per")}{period === 'daily' ? t("auto.day") : period === 'weekly' ? t("auto.week") : t("auto.month")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={t("auto.hsl_var_border")} />
                  <XAxis
                    dataKey={t("auto.name")}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover border border-border shadow-md rounded-md p-2 outline-none">
                            <p className="text-sm font-bold text-foreground">{payload[0].value}{t("dashboard.tabs.orders")}</p>
                          </div>);

                      }
                      return null;
                    }} />
                  
                  <Bar dataKey={t("auto.orders")} fill={t("auto.hsl_var_primary")} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-surface">
          <CardHeader>
            <CardTitle className="text-base">{t("auto.insights")}</CardTitle>
            <CardDescription>{t("auto.quick_summary_of_your_shop_s_h")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="size-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{t("auto.bestselling_period")}</p>
                  <p className="text-xs text-muted-foreground">{t("auto.most_sales_generated")}</p>
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
                  <p className="text-sm font-medium">{t("auto.total_items_sold")}</p>
                  <p className="text-xs text-muted-foreground">{t("auto.across_all_successful_orders")}</p>
                </div>
              </div>
              <p className="text-sm font-bold">{validOrders.reduce((sum, o) => sum + o.quantity, 0)}{t("auto.items")}</p>
            </div>

            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
              <p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">{t("auto.pro_tip")}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{t("auto.sellers_who_offer_discounts_du")}

              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>);

}

function MetricCard({ title, value, icon: Icon, description, color }: any) {
  const colorMap: any = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    amber: 'bg-amber-500/10 text-amber-500',
    purple: 'bg-purple-500/10 text-purple-500'
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
    </Card>);

}