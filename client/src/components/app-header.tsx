import { Settings, HelpCircle, Download } from "lucide-react";

export function AppHeader() {
  return (
    <header className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 shadow-2xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center animate-pulse-glow shadow-lg">
              <Download className="text-white w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-white drop-shadow-lg tracking-tight animate-slide-up">
              YouTube & Video Downloader
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <button className="bg-blue-500/20 hover:bg-blue-400 hover-lift p-3 text-white hover:text-white transition-all duration-300 rounded-lg border border-blue-400/30">
              <Settings className="w-5 h-5" />
            </button>
            <button className="bg-blue-500/20 hover:bg-blue-400 hover-lift p-3 text-white hover:text-white transition-all duration-300 rounded-lg border border-blue-400/30">
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
