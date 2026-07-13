export function TeamCell({
  team,
  size = "sm",
  align,
}: {
  team: { name: string; short_name?: string | null; logo_url?: string | null } | null;
  size?: "sm" | "md" | "lg";
  align?: "left" | "right";
}) {
  if (!team) return <span className="text-muted-foreground">—</span>;
  const dim = size === "lg" ? "h-8 w-8" : size === "md" ? "h-6 w-6" : "h-5 w-5";
  return (
    <div className={`flex items-center gap-2 min-w-0 ${align === "right" ? "flex-row-reverse text-right justify-start" : ""}`}>
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
