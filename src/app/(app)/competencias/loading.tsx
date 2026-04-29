export default function CompetenciasLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-3 px-6 py-4 border-b bg-background">
        <div className="h-9 w-36 bg-muted rounded-md animate-pulse" />
        <div className="h-9 w-24 bg-muted rounded-md animate-pulse" />
        <div className="h-9 w-24 bg-muted rounded-md animate-pulse" />
        <div className="ml-auto h-9 w-32 bg-muted rounded-md animate-pulse" />
      </div>
      {/* Kanban skeleton */}
      <div className="flex gap-4 p-6 overflow-x-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-64 space-y-3">
            <div className="h-8 bg-muted rounded-md animate-pulse" />
            {Array.from({ length: Math.floor(Math.random() * 3) + 1 }).map((_, j) => (
              <div key={j} className="h-24 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
