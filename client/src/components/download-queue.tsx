import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ListEnd, Play, CheckCircle, Clock, X, FolderOpen, Pause, Download, Music, Video } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { VideoPlayer } from "@/components/video-player";
import type { DownloadItem, WebSocketMessage } from "@shared/schema";

export function DownloadQueue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVideo, setSelectedVideo] = useState<{ title: string; fileName: string } | null>(null);

  const { data: downloads = [], isLoading } = useQuery<DownloadItem[]>({
    queryKey: ["/api/downloads"],
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/downloads/${id}/cancel`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/downloads"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/downloads/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/downloads"] });
    },
  });

  const clearCompletedMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/downloads/clear-completed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/downloads"] });
      toast({
        title: "Cleared",
        description: "Completed downloads have been cleared.",
      });
    },
  });

  const openFolderMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/open-folder");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Folder Opened",
        description: data.message,
      });
    },
  });

  // Handle WebSocket messages
  useWebSocket((message: WebSocketMessage) => {
    queryClient.invalidateQueries({ queryKey: ["/api/downloads"] });
    
    if (message.type === "download_complete") {
      toast({
        title: "Download Complete",
        description: "Your video has been downloaded successfully!",
      });
    } else if (message.type === "download_error") {
      toast({
        title: "Download Failed",
        description: message.error,
        variant: "destructive",
      });
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "downloading":
        return <Pause className="w-4 h-4 text-material-blue" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-material-success" />;
      case "queued":
        return <Clock className="w-4 h-4 text-material-warning" />;
      case "failed":
        return <X className="w-4 h-4 text-material-error" />;
      default:
        return <Clock className="w-4 h-4 text-material-gray-light" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "downloading":
        return "bg-blue-50 border-blue-200";
      case "completed":
        return "bg-green-50 border-green-200";
      case "failed":
        return "bg-red-50 border-red-200";
      default:
        return "border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="glass-card border-0 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-modern-surface-alt rounded-lg w-1/3"></div>
            <div className="space-y-4">
              <div className="h-24 bg-modern-surface-alt rounded-xl"></div>
              <div className="h-24 bg-modern-surface-alt rounded-xl"></div>
              <div className="h-24 bg-modern-surface-alt rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modern Header with Glass Effect */}
      <div className="glass-card border-0 p-6 animate-slide-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-modern rounded-lg">
              <ListEnd className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-modern-text">Download Queue</h2>
              <p className="text-sm text-modern-muted">
                {downloads.length} items • {downloads.filter(d => d.status === "completed").length} completed
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openFolderMutation.mutate()}
              className="glass-button hover-lift border-modern-border"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Open Folder
            </Button>
            {downloads.some(d => d.status === "completed") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearCompletedMutation.mutate()}
                className="glass-button hover-lift border-modern-border text-modern-error hover:bg-modern-error hover:text-white"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Completed
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Downloads List */}
      <div className="space-y-4">
        {downloads.length === 0 ? (
          <div className="glass-card border-0 p-12 text-center animate-slide-up">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-modern rounded-full flex items-center justify-center">
              <ListEnd className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-modern-text mb-2">No downloads yet</h3>
            <p className="text-modern-muted">Start by adding a video URL above to begin downloading!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {downloads.map((download, index) => (
              <div
                key={download.id}
                className="glass-card border-0 p-6 hover-lift animate-slide-up"
                style={{animationDelay: `${index * 0.1}s`}}
              >
                <div className="flex items-start space-x-4">
                  <div className="w-20 h-16 bg-gradient-surface rounded-xl flex items-center justify-center flex-shrink-0 border border-modern-border">
                    {download.format === 'mp3' ? (
                      <Music className="w-8 h-8 text-modern-accent" />
                    ) : (
                      <Video className="w-8 h-8 text-modern-primary" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-modern-text text-lg truncate">
                      {download.title || "Loading title..."}
                    </h3>
                    <p className="text-sm text-modern-muted truncate mb-2">
                      {download.url}
                    </p>
                    <div className="flex items-center space-x-3">
                      <Badge className={`${download.format === 'mp3' ? 'bg-modern-accent' : 'bg-modern-primary'} text-white px-2 py-1 text-xs`}>
                        {download.format?.toUpperCase()}
                      </Badge>
                      {download.quality && (
                        <Badge variant="outline" className="border-modern-border text-modern-muted text-xs">
                          {download.quality}
                        </Badge>
                      )}
                      <Badge className={`${
                        download.status === 'completed' ? 'bg-modern-accent' : 
                        download.status === 'downloading' ? 'bg-modern-primary' : 
                        download.status === 'failed' ? 'bg-modern-error' : 'bg-modern-warning'
                      } text-white px-2 py-1 text-xs status-pulse`}>
                        {download.status === 'downloading' ? '⚡ Downloading' : 
                         download.status === 'completed' ? '✓ Complete' :
                         download.status === 'failed' ? '✗ Failed' : '⏳ Queued'}
                      </Badge>
                    </div>
                    
                    {download.status === "downloading" && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-modern-text font-medium">
                            Downloading...
                          </span>
                          <span className="text-modern-primary font-bold">
                            {download.progress}%
                          </span>
                        </div>
                        <div className="relative">
                          <Progress value={download.progress || 0} className="h-3 bg-modern-surface-alt" />
                          <div className="absolute inset-0 bg-gradient-modern opacity-80 rounded-full" 
                               style={{width: `${download.progress || 0}%`}}></div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-modern-muted mt-2">
                          <span className="flex items-center">
                            ⚡ {download.downloadSpeed || "Calculating..."}
                          </span>
                          <span className="flex items-center">
                            ⏱️ {download.estimatedTime || "Calculating..."}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {download.status !== "downloading" && (
                      <div className="mt-3">
                        <div className="flex items-center space-x-4 mb-2">
                          <span className="flex items-center text-sm">
                            {getStatusIcon(download.status)}
                            <span className="ml-1 capitalize">{download.status}</span>
                          </span>
                          <span className="text-sm text-material-gray-light">
                            {download.quality} {download.format?.toUpperCase()}
                            {download.fileSize && ` • ${download.fileSize}`}
                          </span>
                        </div>
                        
                        {download.status === "failed" && download.errorMessage && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800 whitespace-pre-line">
                              {download.errorMessage}
                            </p>
                            {download.url.includes('instagram.com') && (
                              <div className="mt-2 text-xs text-blue-600 border-t border-blue-200 pt-2">
                                💡 <strong>Solution:</strong> Copy URL → Visit <a href="https://snapinsta.app" target="_blank" className="underline">snapinsta.app</a> → Paste URL → Download
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    {download.status === "completed" && (
                      <>
                        <Button 
                          size="sm"
                          onClick={() => openFolderMutation.mutate()}
                          disabled={openFolderMutation.isPending}
                          className="glass-button hover-lift p-2 h-auto"
                          title="Open Downloads Folder"
                        >
                          <FolderOpen className="w-4 h-4 text-modern-primary" />
                        </Button>
                        {download.format !== "mp3" && download.filePath && (
                          <>
                            <Button 
                              size="sm"
                              onClick={() => {
                                const fileName = download.filePath?.split('/').pop() || download.title || 'video';
                                setSelectedVideo({
                                  title: download.title || 'Unknown Video',
                                  fileName
                                });
                              }}
                              className="bg-modern-primary hover:bg-modern-primary-dark text-white hover-lift p-2 h-auto animate-pulse-glow"
                              title="Play Video"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => {
                                const fileName = download.filePath?.split('/').pop() || download.title || 'video';
                                const link = document.createElement('a');
                                link.href = `/api/video/${encodeURIComponent(fileName)}`;
                                link.download = fileName;
                                link.click();
                              }}
                              className="bg-modern-accent hover:bg-modern-accent text-white hover-lift p-2 h-auto"
                              title="Download Video File"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {download.format === "mp3" && download.filePath && (
                          <Button 
                            size="sm"
                            onClick={() => {
                              const fileName = download.filePath?.split('/').pop() || download.title || 'audio';
                              const link = document.createElement('a');
                              link.href = `/api/video/${encodeURIComponent(fileName)}`;
                              link.download = fileName;
                              link.click();
                            }}
                            className="bg-modern-accent hover:bg-modern-accent text-white hover-lift p-2 h-auto animate-pulse-glow"
                            title="Download Audio File"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </>
                    )}
                    {download.status === "downloading" && (
                      <Button
                        size="sm"
                        onClick={() => cancelMutation.mutate(download.id)}
                        disabled={cancelMutation.isPending}
                        className="bg-modern-error hover:bg-modern-error text-white hover-lift p-2 h-auto"
                        title="Cancel Download"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                    {(download.status === "completed" || download.status === "failed" || download.status === "cancelled") && (
                      <Button
                        size="sm"
                        onClick={() => deleteMutation.mutate(download.id)}
                        disabled={deleteMutation.isPending}
                        className="glass-button hover-lift p-2 h-auto border-modern-error text-modern-error hover:bg-modern-error hover:text-white"
                        title="Remove from list"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayer
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          videoTitle={selectedVideo.title}
          fileName={selectedVideo.fileName}
        />
      )}
    </div>
  );
}
