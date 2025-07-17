import { Settings, HelpCircle, Download } from "lucide-react";

export function AppHeader() {
  return (
    <header className="bg-material-blue shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <Download className="text-white text-2xl" />
            <h1 className="text-white text-xl font-medium">Universal Video Downloader</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Settings className="text-white cursor-pointer hover:bg-material-blue-dark rounded p-1 transition-colors" />
            <HelpCircle className="text-white cursor-pointer hover:bg-material-blue-dark rounded p-1 transition-colors" />
          </div>
        </div>
      </div>
    </header>
  );
}
