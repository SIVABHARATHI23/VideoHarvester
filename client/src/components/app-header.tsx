import { Download, ChevronDown, Menu } from "lucide-react";
import { useState } from "react";

export function AppHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-[#111822] text-white sticky top-0 z-50 w-full shadow-lg">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - VideoHarvester branding */}
          <div className="flex items-center flex-shrink-0 gap-3">
            <div className="w-9 h-9 bg-[#1cb8f0] rounded-xl flex items-center justify-center shadow-md">
              <Download className="text-white w-5 h-5" />
            </div>
            <a href="/" className="text-2xl sm:text-3xl font-black tracking-tight leading-none">
              <span className="text-[#1cb8f0]">Video</span>
              <span className="text-white">Harvester</span>
            </a>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-4 xl:space-x-6">
            {[
              "YouTube", "Instagram", "Facebook",
              "Twitter", "Pinterest", "YT to MP4", "YT to MP3"
            ].map((item) => (
              <a
                key={item}
                href="#"
                className="text-white hover:text-[#1cb8f0] text-[13px] font-bold transition-colors whitespace-nowrap uppercase tracking-wider"
              >
                {item}
              </a>
            ))}
          </nav>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white hover:text-[#1cb8f0] p-2"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#1a2433] px-4 pt-2 pb-4 space-y-1 shadow-inner border-t border-white/10">
          {[
            "YouTube", "Instagram", "YT to MP4", "YT to MP3"
          ].map((item) => (
            <a
              key={item}
              href="#"
              className="block px-3 py-2 rounded-md text-sm font-bold text-white hover:text-[#1cb8f0] hover:bg-white/5 uppercase tracking-wider"
            >
              {item}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
