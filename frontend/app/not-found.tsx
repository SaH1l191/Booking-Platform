import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center px-6">
        <h1 className="text-8xl font-serif font-bold text-navy">404</h1>
        <p className="mt-4 text-xl text-muted">Page not found</p>
        <p className="mt-2 text-sm text-muted-light">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <Link
          href="/"
          className="inline-block mt-8 px-6 py-3 bg-navy text-white rounded-xl font-semibold hover:bg-navy-light transition-colors shadow-luxury"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
