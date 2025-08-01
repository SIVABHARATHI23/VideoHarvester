import { AppHeader } from "@/components/app-header";
import DownloadForm from "@/components/download-form";
import DownloadQueue from "@/components/download-queue";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { ListPlus } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-modern-surface via-modern-surface-alt to-modern-surface">
      <AppHeader />
      
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-8">
          <div className="lg:col-span-2 space-y-8">
            <DownloadForm />
            <DownloadQueue />
          </div>
          
          <div className="lg:col-span-1 mt-8 lg:mt-0">
            <Sidebar />
          </div>
        </div>
      </div>

      {/* Modern Floating Action Button */}
      <Button className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 bg-gradient-modern hover:shadow-2xl text-white rounded-full p-4 shadow-xl h-auto hover-lift animate-float">
        <ListPlus className="w-6 h-6" />
      </Button>
    </div>
  );
}
