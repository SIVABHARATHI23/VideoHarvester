import { AppHeader } from "@/components/app-header";
import { DownloadForm } from "@/components/download-form";
import { DownloadQueue } from "@/components/download-queue";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { ListPlus } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-material-bg">
      <AppHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <DownloadForm />
            <DownloadQueue />
          </div>
          
          <div className="lg:col-span-1">
            <Sidebar />
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <Button className="fixed bottom-6 right-6 bg-material-blue hover:bg-material-blue-dark text-white rounded-full p-4 shadow-lg h-auto">
        <ListPlus className="w-6 h-6" />
      </Button>
    </div>
  );
}
