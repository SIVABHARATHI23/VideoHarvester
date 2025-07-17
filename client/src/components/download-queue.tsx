import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ListEnd, Play, CheckCircle, Clock, X, FolderOpen, Pause, Download } from "lucide-react";
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
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-medium text-gray-900 flex items-center">
            <ListEnd className="mr-2 text-material-blue" />
            Download ListEnd
          </h2>
          <div className="flex items-center space-x-2">
            <Badge className="bg-material-blue text-white">
              {downloads.length}
            </Badge>
            {downloads.some(d => d.status === "completed") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearCompletedMutation.mutate()}
                disabled={clearCompletedMutation.isPending}
              >
                Clear Completed
              </Button>
            )}
          </div>
        </div>

        {downloads.length === 0 ? (
          <div className="text-center py-8 text-material-gray-light">
            <ListEnd className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No downloads yet. Add a video URL to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {downloads.map((download) => (
              <div
                key={download.id}
                className={`border rounded-lg p-4 ${getStatusColor(download.status)}`}
              >
                <div className="flex items-start space-x-4">
                  <div className="w-20 h-14 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                    <Play className="w-6 h-6 text-gray-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {download.title || "Loading title..."}
                    </h3>
                    <p className="text-sm text-material-gray-light truncate">
                      {download.url}
                    </p>
                    
                    {download.status === "downloading" && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-material-gray-light">
                            Downloading... {download.quality} {download.format?.toUpperCase()}
                          </span>
                          <span className="text-material-gray-light">
                            {download.progress}%
                          </span>
                        </div>
                        <Progress value={download.progress || 0} className="h-2" />
                        <div className="flex items-center justify-between text-xs text-material-gray-light mt-1">
                          <span>{download.downloadSpeed || "Calculating..."}</span>
                          <span>{download.estimatedTime || "Calculating..."}</span>
                        </div>
                      </div>
                    )}
                    
                    {download.status !== "downloading" && (
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="flex items-center text-sm">
                          {getStatusIcon(download.status)}
                          <span className="ml-1 capitalize">{download.status}</span>
                        </span>
                        <span className="text-sm text-material-gray-light">
                          {download.quality} {download.format?.toUpperCase()}
                          {download.fileSize && ` • ${download.fileSize}`}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-1">
                    {download.status === "completed" && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openFolderMutation.mutate()}
                          disabled={openFolderMutation.isPending}
                          title="Open Downloads Folder"
                        >
                          <FolderOpen className="w-4 h-4" />
                        </Button>
                        {download.format !== "mp3" && download.filePath && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              const fileName = download.filePath?.split('/').pop() || download.title || 'video';
                              setSelectedVideo({
                                title: download.title || 'Unknown Video',
                                fileName
                              });
                            }}
                            title="Play Video"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        {download.format === "mp3" && download.filePath && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              const fileName = download.filePath?.split('/').pop() || download.title || 'audio';
                              const link = document.createElement('a');
                              link.href = `/api/video/${encodeURIComponent(fileName)}`;
                              link.download = fileName;
                              link.click();
                            }}
                            title="Download Audio"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </>
                    )}
                    {download.status === "downloading" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelMutation.mutate(download.id)}
                        disabled={cancelMutation.isPending}
                      >
                        <X className="w-4 h-4 text-material-error" />
                      </Button>
                    )}
                    {(download.status === "completed" || download.status === "failed" || download.status === "cancelled") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(download.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <X className="w-4 h-4 text-material-error" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayer
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          videoTitle={selectedVideo.title}
          fileName={selectedVideo.fileName}
        />
      )}
    </Card>
  );
}
