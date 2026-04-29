export default function EmpresasLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-muted rounded-md animate-pulse" />
        <div className="h-9 w-32 bg-muted rounded-md animate-pulse" />
      </div>
      <div className="h-10 w-full bg-muted rounded-md animate-pulse" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
