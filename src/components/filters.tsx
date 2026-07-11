import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { competitionsQuery, seasonsQuery } from "@/lib/queries";

export function CompetitionFilter({
  value,
  onChange,
  allowAll = true,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  allowAll?: boolean;
}) {
  const { data } = useSuspenseQuery(competitionsQuery());
  return (
    <Select
      value={value ?? "__all"}
      onValueChange={(v) => onChange(v === "__all" ? undefined : v)}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Competition" />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value="__all">All competitions</SelectItem>}
        {data.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SeasonFilter({
  competitionId,
  value,
  onChange,
  allowAll = true,
}: {
  competitionId?: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  allowAll?: boolean;
}) {
  const { data } = useSuspenseQuery(seasonsQuery(competitionId));
  return (
    <Select
      value={value ?? "__all"}
      onValueChange={(v) => onChange(v === "__all" ? undefined : v)}
    >
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="Season" />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value="__all">All seasons</SelectItem>}
        {data.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.year}
            {s.current_season ? " (current)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function StatusFilter({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <Select
      value={value ?? "__all"}
      onValueChange={(v) => onChange(v === "__all" ? undefined : v)}
    >
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all">All status</SelectItem>
        <SelectItem value="NS">Not started</SelectItem>
        <SelectItem value="LIVE">Live</SelectItem>
        <SelectItem value="FT">Finished</SelectItem>
        <SelectItem value="PST">Postponed</SelectItem>
        <SelectItem value="CANC">Cancelled</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full sm:w-[240px]">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  );
}
