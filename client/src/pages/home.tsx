import { AppHeader } from "@/components/app-header";
import DownloadForm from "@/components/download-form";
import DownloadQueue from "@/components/download-queue";

export default function Home() {
  return (
    <div className="min-h-screen bg-white relative">
      <AppHeader />

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

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          <DownloadQueue />

          <div className="text-center mt-16 pt-12 border-t border-gray-100 italic text-gray-400">
            <h3 className="text-2xl font-bold text-gray-800 mb-8 not-italic">Related Services</h3>
            <p>Fast, Secure and Free to use Download Platform</p>
          </div>
        </div>
      </div>
    </div>
  );
}
