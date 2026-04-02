export default function AllVotingLoading() {
  return (
    <div className="pt-24 min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-sm px-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading voting categories…</p>
      </div>
    </div>
  );
}
