export default function AllVotingLoading() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 pt-24">
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-10 space-y-3">
          <div className="h-9 w-64 max-w-full rounded-lg bg-white/20 animate-pulse" />
          <div className="h-4 w-full max-w-xl rounded bg-white/15 animate-pulse" />
          <div className="h-4 w-2/3 max-w-md rounded bg-white/10 animate-pulse" />
        </div>
        <div className="space-y-6">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-2xl bg-white/95 p-6 shadow-lg">
              <div className="h-6 w-48 max-w-full rounded bg-gray-200 animate-pulse" />
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="h-16 rounded-lg bg-gray-100 animate-pulse" />
                <div className="h-16 rounded-lg bg-gray-100 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-primary-100">Loading voting categories…</p>
      </div>
    </div>
  );
}
