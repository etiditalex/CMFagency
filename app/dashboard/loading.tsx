/** Instant fallback while a dashboard route segment loads (improves perceived navigation speed). */
export default function DashboardSegmentLoading() {
  return (
    <div className="text-left space-y-6" aria-busy="true" aria-label="Loading page">
      <div className="space-y-2">
        <div className="h-8 w-48 max-w-[70%] rounded bg-gray-200 animate-pulse" />
        <div className="h-4 max-w-xl rounded bg-gray-100 animate-pulse" />
        <div className="h-4 max-w-lg rounded bg-gray-100 animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-24 border border-[#e5e5e5] bg-white animate-pulse" />
        ))}
      </div>
      <div className="border border-[#e5e5e5] overflow-hidden">
        <div className="h-11 bg-white border-b border-[#e5e5e5]" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-14 border-b border-gray-100 flex items-center px-4 gap-3">
            <div className="h-4 flex-1 max-w-md rounded bg-gray-100 animate-pulse" />
            <div className="h-4 w-20 rounded bg-gray-100 animate-pulse hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
