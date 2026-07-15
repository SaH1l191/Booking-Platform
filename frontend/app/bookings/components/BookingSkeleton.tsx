export default function BookingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white border border-border-light rounded-2xl overflow-hidden animate-pulse">
          <div className="flex flex-col sm:flex-row">
            <div className="sm:w-48 h-40 bg-border-light" />
            <div className="flex-1 p-5 space-y-3">
              <div className="h-5 bg-border-light rounded w-48" />
              <div className="h-4 bg-border-light rounded w-32" />
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-10 bg-border-light rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
