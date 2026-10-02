import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, TrendingUp, Shield, Zap, Trophy } from "lucide-react";
import type { FixtureWithRels, PredictionWithRels } from "@/lib/queries";

interface MatchCardProps {
  fixture: FixtureWithRels;
  prediction?: PredictionWithRels | null;
}

function pct(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return "—";
  return `${(Number(v) * 100).toFixed(0)}%`;
}

function riskColor(risk?: string | null) {
  if (risk === "low") return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
  if (risk === "medium") return "bg-amber-500/15 text-amber-500 border-amber-500/30";
  return "bg-rose-500/15 text-rose-500 border-rose-500/30";
}

interface ReasoningPayload {
  bullets?: string[];
  markets?: Record<string, number>;
  expected_home_goals?: number;
  expected_away_goals?: number;
  risk?: string;
  recommended?: string[];
}

export function MatchCard({ fixture, prediction }: MatchCardProps) {
  const r = (prediction?.reasoning ?? null) as ReasoningPayload | null;
  const m = r?.markets;
  const kickoff = fixture.kickoff_time ? new Date(fixture.kickoff_time) : null;

  return (
    <Card className="overflow-hidden border-border/60 hover:border-primary/40 transition-colors">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-3 w-3" />
            <span className="truncate">{fixture.competition?.name ?? "—"}</span>
            {fixture.round && <span className="opacity-60">· {fixture.round}</span>}
          </div>
          <Badge variant="outline" className="text-[10px] uppercase">
            {fixture.status ?? "?"}
          </Badge>
        </div>

        {/* Teams + score */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <TeamBlock name={fixture.home_team?.name ?? "Home"} logo={fixture.home_team?.logo_url} align="left" />
          <div className="text-center">
            {fixture.home_score != null && fixture.away_score != null ? (
              <div className="text-2xl font-bold tabular-nums">
                {fixture.home_score} <span className="text-muted-foreground">–</span> {fixture.away_score}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                {kickoff
                  ? kickoff.toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "TBD"}
              </div>
            )}
          </div>
          <TeamBlock name={fixture.away_team?.name ?? "Away"} logo={fixture.away_team?.logo_url} align="right" />
        </div>

        {/* Venue / kickoff meta */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {kickoff ? kickoff.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "—"}
          </span>
          {fixture.venue && (
            <span className="flex items-center gap-1 truncate max-w-[60%]">
              <MapPin className="h-3 w-3" />
              {fixture.venue}
            </span>
          )}
        </div>

        {/* Prediction */}
        {prediction && m ? (
          <div className="pt-2 border-t border-border/60 space-y-2.5">
            <ProbBar
              home={m.home_win ?? 0}
              draw={m.draw ?? 0}
              away={m.away_win ?? 0}
            />
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <MetricPill icon={Zap} label="xG" value={`${(r?.expected_home_goals ?? 0).toFixed(2)} - ${(r?.expected_away_goals ?? 0).toFixed(2)}`} />
              <MetricPill icon={TrendingUp} label="O1.5" value={pct(m.over_1_5)} />
              <MetricPill icon={Shield} label="O 2.5" value={pct(m.over_2_5)} />
              <MetricPill
                icon={Shield}
                label="Score"
                value={`${prediction.home_score ?? "?"} - ${prediction.away_score ?? "?"}`}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase text-muted-foreground">Confidence</span>
                <Progress value={Number(prediction.confidence ?? 0)} className="w-20 h-1.5" />
                <span className="text-[11px] font-semibold tabular-nums">
                  {Number(prediction.confidence ?? 0).toFixed(0)}
                </span>
              </div>
              <Badge className={`text-[10px] border ${riskColor(r?.risk)}`} variant="outline">
                {r?.risk ?? "—"} risk
              </Badge>
            </div>
            {r?.recommended?.length ? (
              <div className="flex flex-wrap gap-1">
                {r.recommended.slice(0, 3).map((rec) => (
                  <Badge key={rec} variant="secondary" className="text-[10px]">
                    {rec}
                  </Badge>
                ))}
              </div>
            ) : null}
            {r?.bullets?.length ? (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {r.bullets[0]}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground text-center">
            No prediction yet. Run recompute in{" "}
            <Link to="/system-status" className="underline text-primary">
              System Status
            </Link>
            .
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TeamBlock({ name, logo, align }: { name: string; logo?: string | null; align: "left" | "right" }) {
  return (
    <div className={`flex items-center gap-2 min-w-0 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      {logo ? (
        <img src={logo} alt="" className="h-7 w-7 rounded-full object-contain bg-muted/40 shrink-0" />
      ) : (
        <div className="h-7 w-7 rounded-full bg-muted/60 shrink-0" />
      )}
      <div className="text-sm font-medium truncate">{name}</div>
    </div>
  );
}

function ProbBar({ home, draw, away }: { home: number; draw: number; away: number }) {
  const total = home + draw + away || 1;
  const h = (home / total) * 100;
  const d = (draw / total) * 100;
  const a = (away / total) * 100;
  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/40">
        <div className="bg-primary" style={{ width: `${h}%` }} />
        <div className="bg-muted-foreground/50" style={{ width: `${d}%` }} />
        <div className="bg-accent" style={{ width: `${a}%` }} />
      </div>
      <div className="flex justify-between text-[10px] mt-1 tabular-nums text-muted-foreground">
        <span className="text-primary font-semibold">{(home * 100).toFixed(0)}%</span>
        <span>{(draw * 100).toFixed(0)}%</span>
        <span className="text-accent font-semibold">{(away * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

function MetricPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted/30 px-2 py-1">
      <span className="flex items-center gap-1 text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
