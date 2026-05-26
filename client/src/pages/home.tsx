import { AppHeader } from "@/components/app-header";
import DownloadForm from "@/components/download-form";
import AdvancedSidebar from "@/components/sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useState } from "react";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { 
  HelpCircle, Star, Shield, Zap, Sparkles, Video, Camera, Play, Image, Download, Award, Link2
} from "lucide-react";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("youtube");

  const getHeroBg = () => {
    switch (activeTab) {
      case "youtube":
        return "bg-gradient-to-br from-red-600 via-red-700 to-red-800 transition-all duration-700";
      case "instagram":
        return "bg-gradient-to-br from-pink-600 via-purple-600 to-orange-500 transition-all duration-700";
      case "facebook":
        return "bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 transition-all duration-700";
      case "pinterest":
        return "bg-gradient-to-br from-[#bd081c] via-[#a80718] to-[#910512] transition-all duration-700";
      default:
        return "bg-gradient-to-br from-sky-500 via-blue-600 to-[#0ba6e0] transition-all duration-700";
    }
  };

  const getPlatformTitle = () => {
    switch (activeTab) {
      case "youtube": return "YouTube Video Downloader";
      case "instagram": return "Instagram Story & Reel Downloader";
      case "facebook": return "Facebook Video Downloader";
      case "pinterest": return "Pinterest Photo & Video Grabber";
      default: return "All-in-One Social Video Downloader";
    }
  };

  const getPlatformSubtitle = () => {
    switch (activeTab) {
      case "youtube": return "Convert and download YouTube videos, shorts, and playlists in high-quality 1080p, 4K MP4 or 320kbps MP3 for free.";
      case "instagram": return "Instantly save HD Reels, Stories, Posts, and Carousel photos directly to your device without limits.";
      case "facebook": return "Download Facebook watch videos, stories, and live broadcasts in HD MP4 formats with absolute ease.";
      case "pinterest": return "Download high-resolution Pinterest pins, idea pins, and photos directly in high fidelity.";
      default: return "The ultimate engineered platform to extract video, audio, and images from all major streaming and social media portals.";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 relative font-sans transition-colors duration-300">
      <AppHeader onOpenSettings={() => setSidebarOpen(true)} />

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="right" className="w-full sm:w-[400px] p-0 border-l-0">
          <div className="h-full overflow-y-auto bg-gray-50 dark:bg-zinc-900">
            <AdvancedSidebar />
          </div>
        </SheetContent>
      </Sheet>

      {/* Hero / Main Download Section with Dynamic Tab-Compiling Background */}
      <div className={`${getHeroBg()} pt-16 pb-28 px-4 sm:px-6 lg:px-8 shadow-2xl text-center relative overflow-hidden`}>
        {/* Shimmering glass visual layers */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none"></div>
        
        <div className="max-w-4xl mx-auto relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-black uppercase tracking-widest animate-pulse">
            <Sparkles className="w-4 h-4 fill-white" />
            Sivabharathi Gold Edition
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight drop-shadow-lg leading-none">
            {getPlatformTitle()}
          </h1>
          
          <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto font-medium leading-relaxed drop-shadow">
            {getPlatformSubtitle()}
          </p>
        </div>

        <div className="max-w-[1100px] mx-auto mt-12 relative z-10">
          <DownloadForm activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </div>

      {/* Features Grid & Value Propositions */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-24">
        
        {/* Step-by-Step Educational Guide */}
        <div className="space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
              How to Download Social Media Videos
            </h2>
            <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-teal-400 mx-auto rounded-full"></div>
            <p className="text-gray-500 dark:text-gray-400 font-bold text-sm sm:text-base">
              Follow these three simple steps to extract and download media files in high quality instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                step: "01", 
                title: "Copy Media Link", 
                desc: "Navigate to your desired video on YouTube, Instagram, or Facebook, and copy the URL link from the address bar or Share menu.",
                icon: Link2
              },
              { 
                step: "02", 
                title: "Paste URL & Grab", 
                desc: "Paste the copied URL link into the VideoHarvester input box above, and press the 'HARVEST' button to parse it.",
                icon: Zap
              },
              { 
                step: "03", 
                title: "Choose Format & Fetch", 
                desc: "Select your preferred format (MP3 Audio or MP4 Video) and quality, and click 'GRAB' to download it instantly.",
                icon: Download
              }
            ].map((s, idx) => {
              return (
                <div key={idx} className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-gray-100 dark:border-zinc-800 shadow-lg shadow-gray-100/50 dark:shadow-none hover-lift transition-all relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 text-7xl font-black text-gray-100/80 dark:text-zinc-800/25 group-hover:text-blue-500/10 transition-colors pointer-events-none select-none">
                    {s.step}
                  </div>
                  <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-6 font-black group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                    <span className="text-lg font-black">✓</span>
                  </div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">{s.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-bold leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feature Focal Points */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { title: "Surgical High Speed", desc: "Downloads are processed in parallel with multi-threaded streaming, delivering lightning speeds.", icon: Zap },
            { title: "Datacenter Bypass", desc: "Equipped with unblocked cloud nodes, completely evading YouTube IP blocking blocks.", icon: Shield },
            { title: "No Subscriptions", desc: "Free to use without any pop-ups, hidden charges, or mandatory user registration.", icon: Star },
            { title: "Universal Formats", desc: "Convert any media into high quality MP3 (up to 320kbps) or crystal-clear HD MP4.", icon: Award }
          ].map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className="flex gap-4 p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-md">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 dark:text-white mb-1">{feat.title}</h4>
                  <p className="text-gray-400 dark:text-gray-500 text-xs font-bold leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Premium FAQ Accordion Section */}
        <div className="space-y-12 max-w-4xl mx-auto">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
              Frequently Asked Questions
            </h2>
            <div className="h-1 w-20 bg-gradient-to-r from-emerald-500 to-green-400 mx-auto rounded-full"></div>
            <p className="text-gray-500 dark:text-gray-400 font-bold text-sm">
              Quick answers to help you navigate copyright questions, speed concerns, and browser settings.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full bg-white dark:bg-zinc-900 rounded-[2rem] p-6 sm:p-10 border border-gray-100 dark:border-zinc-800 shadow-xl space-y-4">
            {[
              {
                q: "Is VideoHarvester completely free to use?",
                a: "Yes! VideoHarvester is 100% free, unlimited, and requires no registration or software installation. You can convert and download as many videos as you'd like at full speed."
              },
              {
                q: "How does the cloud bypass system work on the Render server?",
                a: "Live servers (like Render) have cloud IP addresses that YouTube normally blocks. VideoHarvester features an automated smart bypass system: when a block is detected, it instantly routes the download request through an active, unblocked Cobalt API node to download the stream and hand it off to your browser. This bypasses the datacenter block completely and requires zero setup from you!"
              },
              {
                q: "Can I download videos in 1080p, 2K, or 4K with audio?",
                a: "Yes! While YouTube naturally splits HD video and audio tracks, VideoHarvester's backend automatically merges the high-definition video track and best audio track together on the fly, delivering a single, fully synchronized high-quality MP4 file."
              },
              {
                q: "How can I convert YouTube videos to 320kbps MP3?",
                a: "Simply paste your link, and when the format grid appears, look at the 'High Fidelity Audio' section. Select the 320KBPS MP3 format and click 'GRAB'. The server will download the audio stream, convert it to a high-quality MP3 using FFmpeg, and serve it directly to you."
              },
              {
                q: "Does VideoHarvester store my downloaded files?",
                a: "No. VideoHarvester is a privacy-first utility. Downloaded files are held in a temporary directory on the server only during the extraction and transfer phase, and are automatically purged from the storage disk 1 second after your browser completes the download, ensuring absolute privacy."
              }
            ].map((faq, idx) => {
              return (
                <AccordionItem key={idx} value={`item-${idx}`} className="border-b border-gray-105 dark:border-zinc-800 last:border-0 pb-2">
                  <AccordionTrigger className="text-left font-black text-gray-900 dark:text-white text-base hover:no-underline hover:text-blue-500 dark:hover:text-cyan-400 py-4 transition-colors">
                    <span className="flex items-center gap-3">
                      <HelpCircle className="w-5 h-5 text-blue-500/80 shrink-0" />
                      {faq.q}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-500 dark:text-gray-400 text-sm font-bold pl-8 leading-relaxed pt-1 pb-4">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        {/* Dynamic Footer with signature */}
        <div className="text-center pt-12 border-t border-gray-200 dark:border-zinc-800 not-italic">
          <p className="text-sm text-gray-700 dark:text-gray-400 font-black tracking-widest uppercase">
            © 2026 Sivabharathi. All Rights Reserved.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-bold uppercase tracking-wider">
            Premium Video Harvesting Technology • Powered by Advanced Agentic Bypasses.
          </p>
        </div>

      </div>
    </div>
  );
}
