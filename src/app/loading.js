export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-8 bg-slate-800 rounded w-1/3"></div>
        <div className="h-10 bg-slate-800 rounded w-32"></div>
      </div>
      
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-slate-800 rounded-lg animate-pulse"></div>
        ))}
      </div>
      
      {/* Table skeleton */}
      <div className="mt-8">
        <div className="h-8 bg-slate-800 rounded w-1/4 mb-4"></div>
        <div className="h-64 bg-slate-800 rounded-lg animate-pulse"></div>
      </div>
    </div>
  );
}
