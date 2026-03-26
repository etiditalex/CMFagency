export default function BlogSlugLoading() {
  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="container-blog py-10 md:py-12">
        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-8" />
        <div className="flex flex-col gap-10 lg:gap-12 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="min-w-0 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-8 sm:px-6 md:py-10 lg:px-8 space-y-6">
            <div className="h-6 w-24 bg-gray-100 rounded-full animate-pulse" />
            <div className="space-y-3">
              <div className="h-10 md:h-12 bg-gray-200 rounded-lg animate-pulse max-w-3xl" />
              <div className="h-10 md:h-12 bg-gray-200 rounded-lg animate-pulse max-w-2xl" />
            </div>
            <div className="flex gap-4">
              <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="aspect-video w-full bg-gray-200 rounded-xl animate-pulse" />
            <div className="space-y-3 pt-2">
              <div className="h-4 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 bg-gray-100 rounded animate-pulse max-w-[90%]" />
              <div className="h-4 bg-gray-100 rounded animate-pulse max-w-[95%]" />
              <div className="h-4 bg-gray-100 rounded animate-pulse max-w-[80%]" />
            </div>
          </div>
          <div className="hidden lg:block space-y-4">
            <div className="h-40 rounded-xl bg-gray-200/80 animate-pulse" />
            <div className="h-52 rounded-xl bg-gray-200/80 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
