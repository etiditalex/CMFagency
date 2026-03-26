export default function BlogsLoading() {
  return (
    <div className="pt-20 min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-transparent">
      <div className="w-full px-2 sm:px-3 md:px-5 lg:px-6 xl:px-8 2xl:px-10 pb-8 sm:pb-10">
        <div className="h-36 sm:h-44 rounded-xl bg-gray-200/80 animate-pulse mb-5 sm:mb-8 max-w-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 md:gap-6 lg:gap-8 w-full">
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
    </div>
  );
}
