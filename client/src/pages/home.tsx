import { AppHeader } from "@/components/app-header";
import DownloadForm from "@/components/download-form";
import AdvancedSidebar from "@/components/sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useState } from "react";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white relative">
      <AppHeader onOpenSettings={() => setSidebarOpen(true)} />

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="right" className="w-full sm:w-[400px] p-0 border-l-0">
          <div className="h-full overflow-y-auto bg-gray-50 dark:bg-modern-background">
            <AdvancedSidebar />
          </div>
        </SheetContent>
      </Sheet>

      {/* Hero / Main Download Section with Blue Background */}
      <div className="bg-[#0ba6e0] pt-12 pb-24 px-4 sm:px-6 lg:px-8 shadow-inner text-center">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-2 drop-shadow-md">
          <span className="text-white">Video</span>
          <span className="text-[#ffdd00]">Harvester</span>
        </h1>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Free Video Downloader
        </h2>
        <p className="text-lg md:text-xl text-white/90 mb-10 font-medium">
          Fast, Secure and Free High Speed Video Downloader
        </p>

        <div className="max-w-[1200px] mx-auto">
          <DownloadForm />
        </div>
      </div>

      {/* Removed Download Queue as per user request */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          <div className="text-center mt-1 pt-12 border-t border-gray-100 italic text-gray-400">
            <h3 className="text-2xl font-bold text-gray-800 mb-8 not-italic">Related Services</h3>
            <p className="mb-4">Fast, Secure and Free to use Download Platform</p>
            <div className="mt-12 pt-8 border-t border-gray-50 not-italic">
              <p className="text-sm text-gray-500 font-bold">
                © 2026 Sivabharathi. All Rights Reserved.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Fast, Secure and Reliable Video Harvesting Technology.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
