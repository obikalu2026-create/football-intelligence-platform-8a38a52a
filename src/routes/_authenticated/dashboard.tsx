import { createFileRoute } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy,
  CalendarDays,
  Users,
  ClipboardList,
  Sparkles,
  Brain,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [{ title: "Dashboard — Football Intelligence" }],
  }),
});

const TABLES = [
  { key: "competitions", label: "Competitions", icon: Trophy, table: "competitions" as const },
  { key: "seasons", label: "Seasons", icon: CalendarDays, table: "seasons" as const },
  { key: "teams", label: "Teams", icon: Users, table: "teams" as const },
  { key: "fixtures", label: "Fixtures", icon: ClipboardList, table: "fixtures" as const },
  { key: "predictions", label: "Predictions", icon: Sparkles, table: "predictions" as const },
  {
    key: "intelligence",
    label: "Intelligence Records",
    icon: Brain,
    table: "intelligence_scores" as const,
  },
];

async function countRows(table: (typeof TABLES)[number]["table"]) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

function DashboardPage() {
  const queries = useQueries({
    queries: TABLES.map((t) => ({
      queryKey: ["count", t.table],
      queryFn: () => countRows(t.table),
      staleTime: 60_000,
    })),
  });

  const chartData = TABLES.map((t, i) => ({
    name: t.label,
    value: queries[i].data ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your football intelligence platform
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {TABLES.map((t, i) => (
          <StatCard
            key={t.key}
            label={t.label}
            value={queries[i].data}
            loading={queries[i].isLoading}
            error={queries[i].isError}
            icon={t.icon}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data volume overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--popover-foreground)",
                  }}
                />
                <Bar dataKey="value" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
  error,
  icon: Icon,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
  error: boolean;
  icon: LucideIcon;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className="h-8 w-8 rounded-md bg-primary/15 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : error ? (
          <div className="text-sm text-destructive">Failed to load</div>
        ) : (
          <div className="text-3xl font-bold tabular-nums">
            {value?.toLocaleString() ?? 0}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
