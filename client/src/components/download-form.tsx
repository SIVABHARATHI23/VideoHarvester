import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Link, Plus, Play, Camera, Music, Video, HelpCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlternativeMethods } from "./alternative-methods";
import type { InsertDownloadItem } from "@shared/schema";

export function DownloadForm() {
  const [url, setUrl] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<"mp4" | "mp3">("mp4");
  const [showAlternatives, setShowAlternatives] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addDownloadMutation = useMutation({
    mutationFn: async (data: InsertDownloadItem) => {
      const response = await apiRequest("POST", "/api/downloads", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/downloads"] });
      console.log('Download added successfully:', data);
      toast({
        title: "Download Added",
        description: `${data.title || 'Video'} has been added to the download queue.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add download",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    // Clean and validate URL
    const cleanUrl = url.trim();
    console.log('Submitting URL:', cleanUrl);

    // Show Instagram warning before attempting download
    if (cleanUrl.includes('instagram.com')) {
      toast({
        title: "Instagram Authentication Required", 
        description: "Instagram blocks automated downloads. Trying advanced methods, but manual alternatives may be needed.",
        variant: "default",
      });
    }

    // Clear the input immediately when submitting
    setUrl("");

    addDownloadMutation.mutate({
      url: cleanUrl,
      status: "queued",
      format: selectedFormat,
      quality: selectedFormat === "mp3" ? null : "720p",
    });
  };

  return (
    <div className="mb-8">
      <Card className="glass-card animate-slide-up hover-lift border-0">
        <CardContent className="pt-8 pb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold bg-gradient-modern bg-clip-text text-transparent mb-2">
              Instagram Video Downloader
            </h2>
            <p className="text-modern-muted">Specialized for Instagram with advanced extraction methods</p>
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              <Badge variant="secondary" className="text-xs">🎯 Instagram (Primary Focus)</Badge>
              <Badge variant="secondary" className="text-xs">✓ YouTube</Badge>
              <Badge variant="secondary" className="text-xs">✓ TikTok</Badge>
              <Badge variant="secondary" className="text-xs">✓ Twitter</Badge>
              <Badge variant="secondary" className="text-xs">✓ Facebook</Badge>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer hover:bg-modern-surface-alt">
                    💡 Need Help?
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <AlternativeMethods url={url} onClose={() => {}} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Format Selection with Modern Pills */}
            <div className="text-center">
              <label className="text-sm font-semibold text-modern-muted mb-3 block">
                Choose Format
              </label>
              <div className="inline-flex bg-modern-surface-alt rounded-xl p-1 border border-modern-border">
                <button
                  type="button"
                  onClick={() => setSelectedFormat("mp4")}
                  className={`flex items-center px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                    selectedFormat === "mp4"
                      ? "bg-modern-primary text-white shadow-lg transform scale-105"
                      : "text-modern-text-muted hover:text-modern-primary hover:bg-white"
                  }`}
                >
                  <Video className="w-5 h-5 mr-2" />
                  Video (MP4)
              </button>
                <button
                  type="button"
                  onClick={() => setSelectedFormat("mp3")}
                  className={`flex items-center px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                    selectedFormat === "mp3"
                      ? "bg-modern-accent text-white shadow-lg transform scale-105"
                      : "text-modern-text-muted hover:text-modern-accent hover:bg-white"
                  }`}
                >
                  <Music className="w-5 h-5 mr-2" />
                  Audio (MP3)
                </button>
            </div>
          </div>

            {/* URL Input with Modern Design */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-modern rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative">
                <Input
                  type="url"
                  placeholder="🔗 Paste video URL from any platform..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="h-14 pr-20 text-base border-2 border-modern-border rounded-xl focus:border-modern-primary transition-all duration-300 bg-white/50 backdrop-blur-sm"
                  required
                />
                <Button
                  type="submit"
                  disabled={addDownloadMutation.isPending}
                  className="absolute right-2 top-2 bottom-2 px-6 bg-gradient-modern hover:shadow-lg text-white rounded-lg transition-all duration-300 transform hover:scale-105"
                >
                  {addDownloadMutation.isPending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Download
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Platform Support with Animated Badges */}
            <div className="text-center">
              <p className="text-sm text-modern-muted mb-3">Supports 1000+ platforms including:</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Badge className="bg-red-500 text-white px-3 py-1 rounded-full animate-float" style={{animationDelay: '0s'}}>
                  <Camera className="w-4 h-4 mr-1" />
                  YouTube
                </Badge>
                <Badge className="bg-purple-500 text-white px-3 py-1 rounded-full animate-float" style={{animationDelay: '0.5s'}}>
                  <Play className="w-4 h-4 mr-1" />
                  Instagram
                </Badge>
                <Badge className="bg-black text-white px-3 py-1 rounded-full animate-float" style={{animationDelay: '1s'}}>
                  🎵 TikTok
                </Badge>
                <Badge className="bg-blue-500 text-white px-3 py-1 rounded-full animate-float" style={{animationDelay: '1.5s'}}>
                  📺 Vimeo
                </Badge>
                <Badge className="bg-orange-500 text-white px-3 py-1 rounded-full animate-float" style={{animationDelay: '2s'}}>
                  🚀 +996 more
                </Badge>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Instagram Alternatives Modal */}
      {showAlternatives && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full">
            <AlternativeMethods 
              url={url} 
              onClose={() => {
                setShowAlternatives(false);
                setUrl("");
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
