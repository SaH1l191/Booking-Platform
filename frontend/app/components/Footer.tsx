import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-navy text-white">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 21V7l9-4 9 4v14" stroke="#c9a96e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 21V11h6v10" stroke="#c9a96e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 11V7" stroke="#c9a96e" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-lg font-semibold font-serif">Haven</span>
            </div>
            <p className="text-sm text-white/50 leading-relaxed">
              Curated stays and extraordinary experiences in the world&apos;s most remarkable destinations.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gold mb-5">Explore</h3>
            <ul className="space-y-3 text-sm text-white/60">
              <li><Link href="/hotels" className="hover:text-white transition-colors">All Stays</Link></li>
              <li><Link href="/experiences" className="hover:text-white transition-colors">Experiences</Link></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Online Experiences</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Gift Cards</span></li>
            </ul>
          </div>

          {/* Hosting */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gold mb-5">Hosting</h3>
            <ul className="space-y-3 text-sm text-white/60">
              <li><Link href="/hotel" className="hover:text-white transition-colors">List Your Hotel</Link></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Host Resources</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Community Forum</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Hosting responsibly</span></li>
            </ul>
          </div>

          {/* Haven */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gold mb-5">Haven</h3>
            <ul className="space-y-3 text-sm text-white/60">
              <li><span className="hover:text-white transition-colors cursor-pointer">Newsroom</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Careers</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Investors</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Haven.org</span></li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-sm text-white/40">
            <span>&copy; 2026 Haven, Inc.</span>
            <span>&middot;</span>
            <span className="hover:text-white/70 cursor-pointer transition-colors">Privacy</span>
            <span>&middot;</span>
            <span className="hover:text-white/70 cursor-pointer transition-colors">Terms</span>
            <span>&middot;</span>
            <span className="hover:text-white/70 cursor-pointer transition-colors">Sitemap</span>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2 text-sm font-medium text-white/70">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              English (US)
            </div>
            <div className="text-sm font-medium text-white/70">$ USD</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
