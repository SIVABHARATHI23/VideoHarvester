import { AppHeader } from "@/components/app-header";
import DownloadForm from "@/components/download-form";
import DownloadQueue from "@/components/download-queue";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { ListPlus, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-mesh-gradient relative overflow-hidden">
      {/* Animated Background Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent pointer-events-none"></div>

      {/* Floating Geometric Shapes */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-purple-blue opacity-20 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-pink-orange opacity-20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-gradient-blue-teal opacity-20 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>

      <AppHeader />

      <div className="max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8 relative z-10">
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-8">
          <div className="lg:col-span-2 space-y-12 animate-fade-in">
            <DownloadForm />
            <DownloadQueue />
          </div>

          <div className="lg:col-span-1 mt-8 lg:mt-0 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Sidebar />
          </div>
        </div>
      </div>

      {/* Modern Floating Action Button with Glow */}
      <Button className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 bg-gradient-purple-blue hover:shadow-glow-purple text-white rounded-full p-4 shadow-xl h-auto hover-lift hover-scale animate-float group">
        <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
      </Button>
    </div>
  );
}
