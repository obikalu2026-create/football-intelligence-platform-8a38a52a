import { Skeleton } from "@/components/ui/skeleton";
import type { UseQueryResult } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

export function QueryBoundary<T>({
  query,
  children,
  loading,
  skeletonRows = 6,
}: {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  loading?: ReactNode;
  skeletonRows?: number;
}) {
  if (query.isLoading) {
    return (
      loading ?? (
        <div className="space-y-2">
          {Array.from({ length: skeletonRows }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )
    );
  }
  if (query.isError) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 text-destructive p-4 flex items-start gap-2 text-sm">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <div className="font-medium">Failed to load</div>
          <div className="text-xs opacity-80">
            {(query.error as Error | null)?.message ?? "Unknown error"}
          </div>
        </div>
      </div>
    );
  }
  return <>{children(query.data as T)}</>;
}
