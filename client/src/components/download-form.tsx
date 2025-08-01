import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { 
  Download, Video, Music, Settings, Zap, Crown, Star, 
  Camera, Play, Globe, Clock, FileText, Image, 
  ChevronDown, ChevronUp, Loader2, CheckCircle, 
  AlertCircle, Info, Copy, Link2, Scissors,
  Volume2, Palette, Filter, Target, BarChart3, FolderOpen
} from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";

interface VideoInfo {
  title: string;
  duration: string;
  views: string;
  uploader: string;
  thumbnail: string;
  availableFormats: string[];
  availableQualities: string[];
  fileSize: string;
  platform: string;
}

interface DownloadHistoryItem {
  id: number;
  title: string;
  format: string;
  quality: string;
  timestamp: string;
  platform: string;
}

export default function AdvancedDownloadForm() {
  const { toast } = useToast();
  const [url, setUrl] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<string>("mp4");
  const [selectedQuality, setSelectedQuality] = useState<string>("best");
  const [isAdvancedMode, setIsAdvancedMode] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistoryItem[]>([]);
  const [batchUrls, setBatchUrls] = useState<string>("");
  const [showBatchMode, setShowBatchMode] = useState<boolean>(false);
  
  // Advanced options
  const [audioCodec, setAudioCodec] = useState<string>("mp3");
  const [videoCodec, setVideoCodec] = useState<string>("h264");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [subtitles, setSubtitles] = useState<boolean>(false);
  const [thumbnail, setThumbnail] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<boolean>(true);
  const [customFilename, setCustomFilename] = useState<string>("");
  const [downloadLocation, setDownloadLocation] = useState<string>("Downloads/Videos");
  
  const progressRef = useRef<HTMLDivElement | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);

  // WebSocket: update download history on relevant events
  const fetchHistory = useCallback(() => {
    fetch('/api/downloads')
      .then(res => res.json())
      .then((data: DownloadHistoryItem[]) => {
        setDownloadHistory(data);
      })
      .catch(() => {
        setDownloadHistory([]);
      });
  }, []);

  const onWebSocketMessage = useCallback((message: any) => {
    if ([
      'download_started',
      'download_progress',
      'download_complete',
      'download_error',
      'download_cancelled',
      'download_removed'
    ].includes(message.type)) {
      fetchHistory();
    }
  }, [fetchHistory]);
  useWebSocket(onWebSocketMessage);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Detect platform from URL
  const detectPlatform = (url: string): string => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube";
    if (url.includes("instagram.com")) return "Instagram";
    if (url.includes("tiktok.com")) return "TikTok";
    if (url.includes("twitter.com") || url.includes("x.com")) return "Twitter/X";
    if (url.includes("facebook.com")) return "Facebook";
    // if (url.includes("vimeo.com")) return "Vimeo";
    return "Unknown Platform";
  };

  const fetchVideoInfo = async (videoUrl: string) => {
    setIsAnalyzing(true);
    setInfoError(null);
    setVideoInfo(null);
    try {
      const res = await fetch("/api/video-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl }),
      });
      if (!res.ok) throw new Error("Failed to fetch video info");
      const info = await res.json();
      setVideoInfo(info);
    } catch (err: any) {
      setInfoError("Could not fetch video info");
    }
    setIsAnalyzing(false);
  };

  const handleSubmit = async () => {
    if (!url.trim()) return;
    await fetchVideoInfo(url);
  };

  const handleDownload = async () => {
    if (!url.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          format: selectedFormat,
          quality: selectedQuality,
          downloadLocation,
          // Advanced options
          audioCodec,
          videoCodec,
          startTime,
          endTime,
          subtitles,
          thumbnail,
          metadata,
          customFilename,
        }),
      });
      if (!res.ok) throw new Error("Failed to start download");
      toast({
        title: "Download started!",
        description: `Your download has been initiated. Files will be saved to: ${downloadLocation}`,
      });
      setUrl("");
      setVideoInfo(null);
    } catch (err) {
      toast({
        title: "Failed to start download",
        description: "Could not initiate download. Please try again.",
        variant: "destructive",
      });
    }
    setIsAnalyzing(false);
  };

  const handleBatchDownload = async (): Promise<void> => {
    const urls: string[] = batchUrls.split('\n').filter((u: string) => u.trim());
    for (const u of urls) {
      try {
        await fetch("/api/downloads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: u,
            format: selectedFormat,
            quality: selectedQuality,
            downloadLocation,
            // Advanced options
            audioCodec,
            videoCodec,
            startTime,
            endTime,
            subtitles,
            thumbnail,
            metadata,
            customFilename,
          }),
        });
      } catch {}
    }
    toast({
      title: "Batch download(s) started!",
      description: `Batch download(s) initiated for ${urls.length} URLs. Files will be saved to: ${downloadLocation}`,
    });
    setBatchUrls("");
  };

  const copyToClipboard = (text: string): void => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
    });
  };

  const handleSelectDownloadLocation = async () => {
    try {
      // Try to use the File System Access API (modern browsers)
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        // Get the full path from the directory handle
        const path = dirHandle.name;
        setDownloadLocation(path);
        toast({
          title: "Location selected!",
          description: `Files will be saved to: ${path}`,
        });
      } else {
        // Fallback for older browsers - show input dialog with common paths
        const commonPaths = [
          "Downloads",
          "Downloads/Videos", 
          "Documents/Videos",
          "Desktop/Videos",
          "Music",
          "Videos"
        ];
        const customPath = prompt(
          "Enter download path (e.g., Downloads, Downloads/Videos, Desktop/Videos):\n\nCommon options:\n" + 
          commonPaths.join("\n"), 
          downloadLocation
        );
        if (customPath) {
          setDownloadLocation(customPath);
          toast({
            title: "Location set!",
            description: `Files will be saved to: ${customPath}`,
          });
        }
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
      toast({
        title: "Error",
        description: "Could not select directory. Using default location.",
        variant: "destructive",
      });
    }
  };

  const formatOptions = [
    { value: "mp4", label: "MP4 Video", icon: Video, color: "bg-blue-500" },
    { value: "mp3", label: "MP3 Audio", icon: Music, color: "bg-green-500" },
    { value: "webm", label: "WebM Video", icon: Video, color: "bg-purple-500" },
    { value: "wav", label: "WAV Audio", icon: Volume2, color: "bg-orange-500" },
    { value: "gif", label: "Animated GIF", icon: Image, color: "bg-pink-500" }
  ];

  const qualityOptions = [
    { value: "best", label: "Best Available", icon: Crown, gradient: "from-purple-500 to-pink-500" },
    { value: "2160p", label: "4K Ultra HD", icon: Star, gradient: "from-blue-500 to-purple-500" },
    { value: "1440p", label: "2K Quad HD", icon: Zap, gradient: "from-green-500 to-blue-500" },
    { value: "1080p", label: "Full HD", icon: Target, gradient: "from-red-500 to-orange-500" },
    { value: "720p", label: "HD Ready", icon: BarChart3, gradient: "from-yellow-500 to-red-500" },
    { value: "480p", label: "Standard", icon: Filter, gradient: "from-gray-400 to-gray-600" }
  ];

  const handleRemoveDownload = async (id: number) => {
    try {
      const res = await fetch(`/api/downloads/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove download');
      toast({ title: 'Removed', description: 'Download removed from history.' });
      fetchHistory();
    } catch (err) {
      toast({ title: 'Failed to remove', description: 'Could not remove download.', variant: 'destructive' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Main Download Interface */}
      <Card className="bg-gradient-to-br from-white via-blue-50 to-purple-50 border-0 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-black text-transparent">
             Video Downloader
          </CardTitle>
          <p className="text-gray-600 text-lg">Professional-grade downloading with advanced features</p>
          
          {/* Platform Support Badges */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {["YouTube", "Instagram", "TikTok", "Twitter", "Facebook", "Hotstar", "+1000 more"].map((platform, idx) => (
              <Badge key={platform} variant="secondary" className="animate-pulse" style={{animationDelay: `${idx * 0.2}s`}}>
                {platform}
              </Badge>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* URL Input Section */}
          <div className="space-y-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative bg-white rounded-2xl p-1 border-2 border-gray-200">
                <div className="flex">
                  <Input
                    type="url"
                    placeholder="🔗 Paste any video URL here..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1 h-16 text-lg border-0 bg-transparent focus:ring-0 px-6"
                  />
                  <Button
                    onClick={handleSubmit}
                    disabled={isAnalyzing || !url.trim()}
                    className="h-14 px-8 m-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5 mr-2" />
                        Analyze
                      </>
                    )}
                  </Button>
                  {videoInfo && (
                    <Button
                      onClick={handleDownload}
                      disabled={isAnalyzing}
                      className="h-14 px-8 m-1 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Download Location Selection */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center text-black">
                <FolderOpen className="w-5 h-5 mr-2" />
                Download Location
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-600">Current location:</span>
                  <div className="font-medium text-gray-800">{downloadLocation}</div>
                </div>
                <Button
                  onClick={handleSelectDownloadLocation}
                  variant="outline"
                  className="px-4 py-2"
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Change Location
                </Button>
              </div>
            </div>

            {/* Format Selection */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center text-black">
                <Palette className="w-5 h-5 mr-2" />
                Output Format
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {formatOptions.map((format) => (
                  <button
                    key={format.value}
                    type="button"
                    onClick={() => setSelectedFormat(format.value)}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                      selectedFormat === format.value
                        ? `${format.color} text-white border-transparent shadow-lg`
                        : "bg-white border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600"
                    }`}
                  >
                    <format.icon className="w-6 h-6 mx-auto mb-2" />
                    <div className="text-sm font-medium">{format.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Selection - Direct Download on Click */}
            {(selectedFormat === "mp4" || selectedFormat === "webm") && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center text-black">
                  <Target className="w-5 h-5 mr-2" />
                  Video Quality
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {qualityOptions.map((quality) => (
                    <button
                      key={quality.value}
                      type="button"
                      onClick={() => {
                        setSelectedQuality(quality.value);
                      }}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                        selectedQuality === quality.value
                          ? `bg-gradient-to-r ${quality.gradient} text-white border-transparent shadow-lg`
                          : "bg-white border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600"
                      }`}
                    >
                      <quality.icon className="w-5 h-5 mx-auto mb-2" />
                      <div className="text-sm font-medium">{quality.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Advanced Options Toggle */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                className="flex items-center px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors duration-300"
              >
                <Settings className="w-5 h-5 mr-2" />
                Advanced Options
                {isAdvancedMode ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
              </button>
            </div>

            {/* Advanced Options Panel */}
            {isAdvancedMode && (
              <div className="bg-gray-50 rounded-2xl p-6 space-y-6 border-2 border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 text-black">Advanced Configuration</h3>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Time Range */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center text-black">
                      <Scissors className="w-4 h-4 mr-2" />
                      Trim Video
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="time"
                        step="1"
                        placeholder="Start"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        type="time"
                        step="1"
                        placeholder="End"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {/* Custom Filename */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center text-black">
                      <FileText className="w-4 h-4 mr-2" />
                      Custom Filename
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter custom filename..."
                      value={customFilename}
                      onChange={(e) => setCustomFilename(e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  {/* Audio/Video Codecs */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 text-black">Codec Settings</label>
                    <div className="space-y-2">
                      <select 
                        value={audioCodec} 
                        onChange={(e) => setAudioCodec(e.target.value)}
                        className="w-full p-2 border rounded-lg text-sm"
                      >
                        <option value="mp3">MP3 Audio</option>
                        <option value="aac">AAC Audio</option>
                        <option value="flac">FLAC Audio</option>
                        <option value="opus">Opus Audio</option>
                      </select>
                      <select 
                        value={videoCodec} 
                        onChange={(e) => setVideoCodec(e.target.value)}
                        className="w-full p-2 border rounded-lg text-sm"
                      >
                        <option value="h264">H.264</option>
                        <option value="h265">H.265/HEVC</option>
                        <option value="vp9">VP9</option>
                        <option value="av1">AV1</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Additional Options */}
                <div className="flex flex-wrap gap-4">
                  {[
                    { key: 'subtitles', label: 'Download Subtitles', state: subtitles, setState: setSubtitles },
                    { key: 'thumbnail', label: 'Save Thumbnail', state: thumbnail, setState: setThumbnail },
                    { key: 'metadata', label: 'Preserve Metadata', state: metadata, setState: setMetadata }
                  ].map((option) => (
                    <label key={option.key} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={option.state}
                        onChange={(e) => option.setState(e.target.checked)}
                        className="mr-2 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Batch Download Section */}
          <div className="border-t pt-6">
            <button
              onClick={() => setShowBatchMode(!showBatchMode)}
              className="flex items-center text-lg font-semibold text-gray-800 hover:text-blue-600 transition-colors"
            >
              <Link2 className="w-5 h-5 mr-2" />
              Batch Download Mode
              {showBatchMode ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
            </button>
            
            {showBatchMode && (
              <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <textarea
                  placeholder="Paste multiple URLs (one per line)..."
                  value={batchUrls}
                  onChange={(e) => setBatchUrls(e.target.value)}
                  rows={6}
                  className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Button 
                  onClick={handleBatchDownload}
                  className="mt-3 bg-blue-500 hover:bg-blue-600 text-white"
                  disabled={!batchUrls.trim()}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download All ({batchUrls.split('\n').filter((u: string) => u.trim()).length} URLs)
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Video Information Card */}
      {videoInfo !== null && (
        <Card className="bg-white shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex items-start space-x-6">
              <img 
                src={(videoInfo as VideoInfo).thumbnail} 
                alt="Video thumbnail" 
                className="w-32 h-24 object-cover rounded-lg shadow-md"
              />
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-800 mb-2 text-black">{(videoInfo as VideoInfo).title}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Duration: {(videoInfo as VideoInfo).duration}
                  </div>
                  <div className="flex items-center">
                    <Globe className="w-4 h-4 mr-1" />
                    Platform: {(videoInfo as VideoInfo).platform}
                  </div>
                  <div className="flex items-center">
                    <Download className="w-4 h-4 mr-1" />
                    Size: {(videoInfo as VideoInfo).fileSize}
                  </div>
                  <div className="flex items-center">
                    <Play className="w-4 h-4 mr-1" />
                    Views: {(videoInfo as VideoInfo).views}
                  </div>
                </div>
              </div>
              <button
                onClick={() => copyToClipboard((videoInfo as VideoInfo).title)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Copy title"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {infoError && (
        <Card className="bg-red-50 border-0 shadow-lg">
          <CardContent className="p-6 text-red-700">{infoError}</CardContent>
        </Card>
      )}

      {/* Feature Highlights */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-0">
          <Zap className="w-12 h-12 mx-auto mb-4 text-blue-600" />
          <h3 className="text-lg font-semibold mb-2 text-black">Lightning Fast</h3>
          <p className="text-gray-600 text-sm">Advanced multi-threaded downloading for maximum speed</p>
        </Card>

        <Card className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-0">
          <Crown className="w-12 h-12 mx-auto mb-4 text-purple-600" />
          <h3 className="text-lg font-semibold mb-2 text-black">Premium Quality</h3>
          <p className="text-gray-600 text-sm">Support for 4K, HDR, and lossless audio formats</p>
        </Card>

        <Card className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 border-0">
          <Globe className="w-12 h-12 mx-auto mb-4 text-green-600" />
          <h3 className="text-lg font-semibold mb-2 text-black">Universal Support</h3>
          <p className="text-gray-600 text-sm">Works with 1000+ platforms and video streaming sites</p>
        </Card>
      </div>
    </div>
  );
}