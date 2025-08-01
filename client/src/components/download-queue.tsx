import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Download, Music, Video, CheckCircle, Clock, X, FolderOpen, 
  Pause, AlertCircle, Search, Filter, SortAsc, SortDesc, 
  RefreshCw, Trash2, Archive, Eye, EyeOff, MoreVertical,
  FileText, Calendar, Zap, Globe, HardDrive, Star,
  TrendingUp, BarChart3, Activity, Users, Wifi, WifiOff
} from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";
import type { WebSocketMessage } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface Download {
  id: number;
  title: string;
  url: string;
  status: string;
  progress: number;
  format: string;
  quality: string;
  fileSize: string;
  downloadSpeed?: string;
  estimatedTime?: string;
  platform: string;
  thumbnail: string;
  addedAt: Date;
  duration: string;
  views: string;
  errorMessage?: string;
}

export default function AdvancedDownloadQueue() {
  // State management
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState("detailed");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retryAttempts, setRetryAttempts] = useState<{ [key: number]: number }>({});
  
  // Statistics
  const [stats, setStats] = useState({
    totalDownloads: 0,
    completedDownloads: 0,
    activeDownloads: 0,
    failedDownloads: 0,
    totalSize: "0 MB",
    avgSpeed: "0 MB/s"
  });

  const { toast } = useToast();

  // Mock data with advanced features
  useEffect(() => {
    setIsLoading(true);
    fetch('/api/downloads')
      .then(res => res.json())
      .then((data: Download[]) => {
        // Convert string dates to Date objects if needed
        const downloads = data.map(d => ({
          ...d,
          addedAt: d.addedAt ? new Date(d.addedAt) : new Date(),
        }));
        setDownloads(downloads);
        setIsLoading(false);
        // Calculate stats
        const stats = {
          totalDownloads: downloads.length,
          completedDownloads: downloads.filter(d => d.status === "completed").length,
          activeDownloads: downloads.filter(d => d.status === "downloading").length,
          failedDownloads: downloads.filter(d => d.status === "failed").length,
          totalSize: downloads.reduce((acc, d) => {
            const size = parseFloat((d.fileSize || '').replace(/[^\d.]/g, ''));
            return acc + (isNaN(size) ? 0 : size);
          }, 0) + ' MB',
          avgSpeed: 'N/A'
        };
        setStats(stats);
      })
      .catch(() => setIsLoading(false));
  }, []);

  // WebSocket live updates
  useWebSocket((message: WebSocketMessage) => {
    if (["download_progress", "download_complete", "download_error", "download_started"].includes(message.type)) {
      // Refetch downloads from backend
      fetch('/api/downloads')
        .then(res => res.json())
        .then((data: Download[]) => {
          const downloads = data.map(d => ({
            ...d,
            addedAt: d.addedAt ? new Date(d.addedAt) : new Date(),
          }));
          setDownloads(downloads);
      });
    }
  });

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Filter and sort downloads
  const filteredDownloads = downloads
    .filter((download: Download) => {
      const matchesSearch = download.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           download.platform.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === "all" || (download.status && download.status === filterStatus);
      return matchesSearch && matchesFilter;
    })
    .sort((a: Download, b: Download) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        case "oldest":
          return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
        case "size":
          return parseFloat(b.fileSize) - parseFloat(a.fileSize);
        case "status":
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

  // Action handlers
  const handleSelectItem = (id: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredDownloads.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredDownloads.map((d: Download) => d.id)));
    }
  };

  const handleBulkAction = async (action: string) => {
    if (action === "delete") {
      const ids = Array.from(selectedItems);
      let successCount = 0;
      for (const id of ids) {
        try {
          const res = await fetch(`/api/downloads/${id}`, { method: 'DELETE' });
          if (res.ok) successCount++;
        } catch {}
      }
      if (successCount > 0) {
        toast({ title: 'Deleted', description: `Deleted ${successCount} download(s).` });
      } else {
        toast({ title: 'Delete failed', description: 'Could not delete selected downloads.', variant: 'destructive' });
      }
      // Refetch downloads
      fetch('/api/downloads')
        .then(res => res.json())
        .then((data: Download[]) => {
          const downloads = data.map(d => ({
            ...d,
            addedAt: d.addedAt ? new Date(d.addedAt) : new Date(),
          }));
          setDownloads(downloads);
        });
    }
    setSelectedItems(new Set());
  };

  const handleRetry = (id: number) => {
    setRetryAttempts(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    console.log(`Retrying download ${id}`);
  };

  const handleRemoveDownload = async (id: number) => {
    try {
      const res = await fetch(`/api/downloads/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove download');
      toast({ title: 'Removed', description: 'Download removed from queue.' });
      // Refetch downloads
      fetch('/api/downloads')
        .then(res => res.json())
        .then((data: Download[]) => {
          const downloads = data.map(d => ({
            ...d,
            addedAt: d.addedAt ? new Date(d.addedAt) : new Date(),
          }));
          setDownloads(downloads);
        });
    } catch (err) {
      toast({ title: 'Failed to remove', description: 'Could not remove download.', variant: 'destructive' });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "downloading":
        return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "queued":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "downloading":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      case "queued":
        return "bg-yellow-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "youtube":
        return "🎥";
      case "instagram":
        return "📸";
      case "tiktok":
        return "🎵";
      case "twitter":
        return "🐦";
      default:
        return "🌐";
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Network Status Alert */}
      {!isOnline && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <WifiOff className="w-5 h-5 text-orange-600 mr-3" />
              <div>
                <h4 className="font-semibold text-orange-800">You're offline</h4>
                <p className="text-sm text-orange-700">Downloads will resume when connection is restored.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Downloads</p>
                <p className="text-3xl font-bold text-blue-900">{stats.totalDownloads}</p>
              </div>
              <Download className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Completed</p>
                <p className="text-3xl font-bold text-green-900">{stats.completedDownloads}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">Active</p>
                <p className="text-3xl font-bold text-yellow-900">{stats.activeDownloads}</p>
              </div>
              <Activity className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
        <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Total Size</p>
                <p className="text-3xl font-bold text-purple-900">{stats.totalSize}</p>
              </div>
              <HardDrive className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Controls */}
      <Card className="bg-white shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold text-black flex items-center">
                <Archive className="w-6 h-6 mr-3 text-blue-600" />
                Download Queue
                <Badge variant="secondary" className="ml-3">
                  {filteredDownloads.length} items
                </Badge>
              </CardTitle>
              <p className="text-gray-600 mt-1">Manage your downloads with advanced controls</p>
            </div>
            <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
                onClick={() => console.log("Opening folder")}
                className="flex items-center"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Open Folder
            </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => console.log("Refreshing")}
                className="flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Search and Filter Controls */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search downloads by title or platform..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
      </div>

            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-white text-sm text-black dark:bg-gray-800 dark:text-white"
              >
                <option value="all" className="text-black dark:text-white">All Status</option>
                <option value="downloading" className="text-black dark:text-white">Downloading</option>
                <option value="completed" className="text-black dark:text-white">Completed</option>
                <option value="failed" className="text-black dark:text-white">Failed</option>
                <option value="queued" className="text-black dark:text-white">Queued</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-white text-sm text-black dark:bg-gray-800 dark:text-white"
              >
                <option value="newest" className="text-black dark:text-white">Newest First</option>
                <option value="oldest" className="text-black dark:text-white">Oldest First</option>
                <option value="size" className="text-black dark:text-white">By Size</option>
                <option value="status" className="text-black dark:text-white">By Status</option>
              </select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === "detailed" ? "compact" : "detailed")}
              >
                {viewMode === "detailed" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedItems.size > 0 && (
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <span className="text-sm font-medium text-blue-900">
                  {selectedItems.size} item(s) selected
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleBulkAction("download")}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction("retry")}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleBulkAction("delete")}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}

          {/* Select All Checkbox */}
          {filteredDownloads.length > 0 && (
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedItems.size === filteredDownloads.length}
                onChange={handleSelectAll}
                className="mr-3 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label className="text-sm text-gray-700">Select all visible items</label>
            </div>
          )}

          {/* Downloads List */}
          <div className="space-y-4">
            {filteredDownloads.length === 0 ? (
              <div className="text-center py-12">
                <Archive className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No downloads found</h3>
                <p className="text-gray-500">
                  {searchTerm || filterStatus !== "all" 
                    ? "Try adjusting your search or filter criteria" 
                    : "Start downloading videos to see them here"
                  }
                </p>
              </div>
            ) : (
              filteredDownloads.map((download: Download) => (
                <Card key={download.id} className="hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Selection Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedItems.has(download.id)}
                        onChange={() => handleSelectItem(download.id)}
                        className="mt-2 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />

                      {/* Thumbnail or Icon */}
                      <div className="relative w-24 h-16 flex items-center justify-center bg-gray-100 rounded-lg">
                        {download.thumbnail && download.thumbnail.trim() !== '' ? (
                          <img
                            src={download.thumbnail}
                            alt="Thumbnail"
                            className="w-24 h-16 object-cover rounded-lg"
                          />
                        ) : (
                          download.format && ["mp3", "wav", "flac", "aac", "opus"].includes(download.format.toLowerCase()) ? (
                            <Music className="w-10 h-10 text-green-500" />
                          ) : (
                            <Video className="w-10 h-10 text-blue-500" />
                          )
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                          <span className="text-white text-xs font-medium">{download.duration}</span>
                        </div>
                        <div className="absolute -top-2 -right-2">
                          <span className="text-lg">{getPlatformIcon(download.platform)}</span>
                        </div>
                  </div>
                  
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">
                              {download.title}
                    </h3>
                            <p className="text-sm text-gray-500 truncate mb-2">
                      {download.url}
                    </p>
                            
                            {/* Metadata */}
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                              <Badge className={`${getStatusColor(download.status)} text-white text-xs`}>
                                {download.status.charAt(0).toUpperCase() + download.status.slice(1)}
                      </Badge>
                              <Badge variant="outline" className="text-xs">
                                {download.format?.toUpperCase()} • {download.quality}
                        </Badge>
                              <Badge variant="outline" className="text-xs">
                                {download.fileSize}
                      </Badge>
                              <span className="text-xs text-gray-500 flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {download.addedAt.toLocaleTimeString()}
                              </span>
                              <span className="text-xs text-gray-500 flex items-center">
                                <Users className="w-3 h-3 mr-1" />
                                {download.views} views
                              </span>
                    </div>
                    
                            {/* Progress Bar for Downloading */}
                    {download.status === "downloading" && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-medium text-gray-700">
                                    Downloading... {download.progress}%
                          </span>
                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center">
                                      <TrendingUp className="w-3 h-3 mr-1" />
                                      {download.downloadSpeed}
                          </span>
                          <span className="flex items-center">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {download.estimatedTime}
                          </span>
                        </div>
                                </div>
                                <Progress 
                                  value={download.progress} 
                                  className="h-2 bg-gray-200"
                                />
                      </div>
                    )}
                    
                            {/* Error Message */}
                        {download.status === "failed" && download.errorMessage && (
                              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-800 mb-2">
                                  <AlertCircle className="w-4 h-4 inline mr-2" />
                              {download.errorMessage}
                            </p>
                                {retryAttempts[download.id] && (
                                  <p className="text-xs text-red-600">
                                    Retry attempts: {retryAttempts[download.id]}
                                  </p>
                                )}
                      </div>
                    )}
                  </div>
                  
                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 ml-4">
                    {download.status === "completed" && (
                      <>
                        <Button 
                          size="sm"
                                  onClick={async () => {
                                    try {
                                      const response = await fetch('/api/open-folder');
                                      const data = await response.json();
                                      if (data.success) {
                                        // Try to open the folder using the File System Access API
                                        if ('showDirectoryPicker' in window) {
                                          try {
                                            await (window as any).showDirectoryPicker();
                                          } catch (error) {
                                            console.log('Could not open folder picker, showing path instead');
                                            alert(`Download folder: ${data.path}`);
                                          }
                                        } else {
                                          alert(`Download folder: ${data.path}`);
                                        }
                                      } else {
                                        alert('Could not open downloads folder');
                                      }
                                    } catch (error) {
                                      console.error('Error opening folder:', error);
                                      alert('Could not open downloads folder');
                                    }
                                  }}
                                  className="bg-blue-500 hover:bg-blue-600 text-white"
                                >
                                  <FolderOpen className="w-4 h-4 mr-2" />
                                  Folder
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a');
                                    link.href = `/api/download/${download.id}`;
                                    link.download = `${download.title}.${download.format}`;
                                link.click();
                              }}
                                  className="bg-green-500 hover:bg-green-600 text-white"
                            >
                              <Download className="w-4 h-4 mr-2" />
                                  Save
                            </Button>
                          </>
                        )}
                            
                            {download.status === "failed" && (
                          <Button 
                            size="sm"
                                onClick={() => handleRetry(download.id)}
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Retry
                          </Button>
                        )}
                            
                    {download.status === "downloading" && (
                      null
                    )}
                            
                      <Button
                        size="sm"
                              variant="outline"
                              onClick={() => handleRemoveDownload(download.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                  </div>
                </div>
              </div>
          </div>
                  </CardContent>
                </Card>
              ))
        )}
      </div>
        </CardContent>
      </Card>
    </div>
  );
}