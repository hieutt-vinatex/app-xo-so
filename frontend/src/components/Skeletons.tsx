import { Card } from "./ui/Card";

function Bar({ className }: { className?: string }): JSX.Element {
  return (
    <div className={`motion-safe:animate-pulse rounded bg-slate-200 dark:bg-slate-700 ${className ?? ""}`} />
  );
}

export function DashboardSkeleton(): JSX.Element {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <Bar className="h-3 w-20" />
            <Bar className="mt-3 h-7 w-16" />
            <Bar className="mt-2 h-3 w-24" />
          </Card>
        ))}
      </div>
      <Card>
        <Bar className="h-4 w-40" />
        <Bar className="mt-4 h-64 w-full" />
      </Card>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <Bar className="h-4 w-40" />
          <Bar className="mt-4 h-64 w-full" />
        </Card>
        <Card>
          <Bar className="h-4 w-40" />
          <Bar className="mt-4 h-64 w-full" />
        </Card>
      </div>
    </div>
  );
}
