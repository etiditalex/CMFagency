export default function BlogsLoading() {
  return (
    <div className="pt-20 min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-transparent">
      <div className="w-full px-2 sm:px-3 md:px-5 lg:px-6 xl:px-8 2xl:px-10 pb-8 sm:pb-10">
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 xl:gap-10">
          <div className="min-w-0 space-y-6 sm:space-y-8">
            <div className="h-36 sm:h-44 rounded-xl bg-gray-200/80 animate-pulse max-w-xl lg:max-w-none" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5 md:gap-6 lg:gap-8 w-full">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-gray-200/80 bg-white/90 overflow-hidden shadow-sm animate-pulse"
                >
                  <div className="h-40 sm:h-44 md:h-48 bg-gray-200/90" />
                  <div className="p-4 space-y-3">
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="h-48 rounded-xl bg-gray-200/80 animate-pulse" />
            <div className="h-40 rounded-xl bg-gray-200/80 animate-pulse" />
            <div className="h-36 rounded-xl bg-gray-200/80 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
