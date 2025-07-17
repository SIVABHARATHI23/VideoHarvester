import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, Plus, Play, Camera, Music, Video } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InsertDownloadItem } from "@shared/schema";

export function DownloadForm() {
  const [url, setUrl] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<"mp4" | "mp3">("mp4");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addDownloadMutation = useMutation({
    mutationFn: async (data: InsertDownloadItem) => {
      const response = await apiRequest("POST", "/api/downloads", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/downloads"] });
      setUrl("");
      toast({
        title: "Download Added",
        description: "Video has been added to the download queue.",
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

    addDownloadMutation.mutate({
      url: url.trim(),
      status: "queued",
      format: selectedFormat,
      quality: selectedFormat === "mp3" ? null : "720p",
    });
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <h2 className="text-xl font-medium text-gray-900 mb-4 flex items-center">
          <Link className="mr-2 text-material-blue" />
          Add Video URL
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Format Selection Pills */}
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-sm text-gray-600 font-medium">Format:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setSelectedFormat("mp4")}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedFormat === "mp4"
                    ? "bg-white text-material-blue shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Video className="w-4 h-4 mr-2" />
                Video (MP4)
              </button>
              <button
                type="button"
                onClick={() => setSelectedFormat("mp3")}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedFormat === "mp3"
                    ? "bg-white text-material-blue shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Music className="w-4 h-4 mr-2" />
                Audio (MP3)
              </button>
            </div>
          </div>

          <div className="relative">
            <Input
              type="url"
              placeholder="Paste video URL here (YouTube, Instagram, TikTok, etc.)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pr-20 py-3 border-2 focus:border-material-blue"
            />
            <Button
              type="submit"
              disabled={!url.trim() || addDownloadMutation.isPending}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-material-blue hover:bg-material-blue-dark"
            >
              {addDownloadMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              Add
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-material-gray-light">Supported:</span>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                <Play className="w-3 h-3 mr-1" />
                YouTube
              </Badge>
              <Badge variant="secondary" className="bg-pink-100 text-pink-800">
                <Camera className="w-3 h-3 mr-1" />
                Instagram
              </Badge>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                <Music className="w-3 h-3 mr-1" />
                TikTok
              </Badge>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                <Video className="w-3 h-3 mr-1" />
                Vimeo
              </Badge>
              <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                +1000 more
              </Badge>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
