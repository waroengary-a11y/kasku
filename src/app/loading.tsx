export default function Loading() {
  return (
    <div className="space-y-4 p-4 lg:p-6 animate-pulse w-full max-w-7xl mx-auto">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 rounded-lg" />
          <div className="h-4 w-72 bg-slate-100 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-slate-200 rounded-lg" />
          <div className="h-9 w-28 bg-slate-200 rounded-lg" />
        </div>
      </div>

      {/* Cards / Stat Summary Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
        <div className="h-20 bg-slate-100 rounded-xl border border-slate-200/60 p-3 space-y-2">
          <div className="h-3 w-16 bg-slate-200 rounded" />
          <div className="h-5 w-24 bg-slate-200 rounded" />
        </div>
        <div className="h-20 bg-slate-100 rounded-xl border border-slate-200/60 p-3 space-y-2">
          <div className="h-3 w-16 bg-slate-200 rounded" />
          <div className="h-5 w-24 bg-slate-200 rounded" />
        </div>
        <div className="h-20 bg-slate-100 rounded-xl border border-slate-200/60 p-3 space-y-2">
          <div className="h-3 w-16 bg-slate-200 rounded" />
          <div className="h-5 w-24 bg-slate-200 rounded" />
        </div>
        <div className="h-20 bg-slate-100 rounded-xl border border-slate-200/60 p-3 space-y-2">
          <div className="h-3 w-16 bg-slate-200 rounded" />
          <div className="h-5 w-24 bg-slate-200 rounded" />
        </div>
      </div>

      {/* Main Table / List Skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs mt-4">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="h-8 w-60 bg-slate-100 rounded-lg" />
          <div className="h-8 w-20 bg-slate-100 rounded-lg" />
        </div>
        <div className="divide-y divide-slate-100">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-1/3 bg-slate-200 rounded" />
                <div className="h-3 w-1/4 bg-slate-100 rounded" />
              </div>
              <div className="h-4 w-20 bg-slate-200 rounded" />
              <div className="h-4 w-16 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
