export function TeamCell({
  team,
  size = "sm",
}: {
  team: { name: string; short_name?: string | null; logo_url?: string | null } | null;
  size?: "sm" | "md";
}) {
  if (!team) return <span className="text-muted-foreground">—</span>;
  const dim = size === "md" ? "h-6 w-6" : "h-5 w-5";
  return (
    <div className="flex items-center gap-2 min-w-0">
      {team.logo_url ? (
        <img
          src={team.logo_url}
          alt=""
          loading="lazy"
          className={`${dim} rounded-sm object-contain bg-muted/40`}
        />
      ) : (
        <div className={`${dim} rounded-sm bg-muted`} />
      )}
      <span className="truncate">{team.short_name || team.name}</span>
    </div>
  );
}
