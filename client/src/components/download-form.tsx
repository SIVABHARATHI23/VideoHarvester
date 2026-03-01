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
import { FeatureHighlights } from "@/components/feature-highlights";

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
  maxQuality?: string;
  qualityRecommendation?: string;
  supports4K?: boolean;
  supports1080p?: boolean;
  supports720p?: boolean;
  // New fields for detailed format information
  formats?: Array<{
    formatId: string;
    resolution: string;
    quality: string;
    fileSize: string;
    format: string;
    codec: string;
    fps?: string;
  }>;
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
  const [thumbnailError, setThumbnailError] = useState(false);
  const [batchUrls, setBatchUrls] = useState<string>("");
  const [showBatchMode, setShowBatchMode] = useState<boolean>(false);

  // New state for format selection dropdown
  const [showFormatDropdown, setShowFormatDropdown] = useState<boolean>(false);
  const [selectedFormatId, setSelectedFormatId] = useState<string>("");

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
      .then((data: any) => {
        // Handle the new server response structure
        const downloadsArray = data.downloads || data;

        if (!Array.isArray(downloadsArray)) {
          console.error('Invalid downloads data structure in download form:', data);
          setDownloadHistory([]);
          return;
        }

        // Convert to the expected format
        const history = downloadsArray.map((d: any) => ({
          id: d.id,
          title: d.title || 'Unknown Title',
          format: d.format || 'mp4',
          quality: d.quality || 'best',
          timestamp: d.createdAt || new Date().toISOString(),
          platform: d.platform || 'Unknown'
        }));

        setDownloadHistory(history);
      })
      .catch((error) => {
        console.error('Failed to fetch download history:', error);
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

  useEffect(() => {
    const isValidUrl = (urlString: string) => {
      try {
        const u = new URL(urlString);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        return false;
      }
    };

    if (url.trim() && isValidUrl(url) && !isAnalyzing && (!videoInfo || infoError)) {
      const timer = setTimeout(() => {
        setIsAnalyzing(true);
        fetchVideoInfo(url).catch(() => { });
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [url]);

  const fetchVideoInfo = async (videoUrl: string) => {
    setIsAnalyzing(true);
    setInfoError(null);
    setVideoInfo(null);
    setThumbnailError(false);
    try {
      console.log('Fetching video info for URL:', videoUrl);
      const res = await fetch("/api/video-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl }),
      });

      console.log('Response status:', res.status);
      console.log('Response headers:', res.headers);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to fetch video info: ${res.status} ${res.statusText}`);
      }

      const responseText = await res.text();
      console.log('Response text:', responseText);

      let info;
      try {
        info = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Response was not valid JSON:', responseText);
        throw new Error('Invalid JSON response from server');
      }

      setVideoInfo(info);

      // Auto-select recommended quality if available
      if (info.qualityRecommendation && info.qualityRecommendation !== selectedQuality) {
        setSelectedQuality(info.qualityRecommendation);
        toast({
          title: "Quality Auto-Selected",
          description: `Best available quality (${info.qualityRecommendation}) has been selected for this video.`,
        });
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setInfoError("Could not fetch video info");
    }
    setIsAnalyzing(false);
  };

  const handleSubmit = async () => {
    if (!url.trim()) return;
    await fetchVideoInfo(url);
  };

  const handleDownload = async () => {
    if (!url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a valid video URL",
        variant: "destructive",
      });
      return;
    }

    // Additional validation for MP3 format
    if (selectedFormat === 'mp3') {
      if (!selectedQuality || selectedQuality === '') {
        setSelectedQuality('best');
        console.log('🎵 Set default quality to best for MP3');
      }

      // Validate MP3 configuration
      console.log('🎵 MP3 download validation:', {
        format: selectedFormat,
        quality: selectedQuality,
        formatId: selectedFormatId
      });

      if (selectedFormatId !== 'audio-mp3') {
        toast({
          title: "MP3 Format Not Selected",
          description: "Please select MP3 format from the audio formats section",
          variant: "destructive",
        });
        return;
      }
    }

    setIsAnalyzing(true);
    try {
      console.log('🎵 Starting download request:', { url, format: selectedFormat, quality: selectedQuality, selectedFormatId });
      console.log('🎵 selectedFormat type:', typeof selectedFormat, 'value:', selectedFormat);

      const requestBody = {
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
      };

      console.log('🎵 Full request body:', requestBody);

      const res = await fetch("/api/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.message || `HTTP ${res.status}: ${res.statusText}`);
      }

      const result = await res.json();
      console.log('Download started successfully:', result);

      const formatMessage = selectedFormat === 'mp3'
        ? `MP3 audio download started! Quality: ${selectedQuality}`
        : `Download started! Format: ${selectedFormat}, Quality: ${selectedQuality}`;

      toast({
        title: "Download started!",
        description: `${formatMessage} Files will be saved to: ${downloadLocation}`,
      });

      setUrl("");
      setVideoInfo(null);
      setInfoError(null);

    } catch (err: any) {
      console.error('Download request failed:', err);

      let errorMessage = "Could not initiate download. Please try again.";
      if (err.message) {
        errorMessage = err.message;
      }

      // Special handling for MP3 format errors
      if (selectedFormat === 'mp3') {
        errorMessage = `MP3 download failed: ${errorMessage}. Please check the URL and try again.`;
      }

      toast({
        title: "Failed to start download",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
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
      } catch { }
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

  const allQualityOptions = [
    { value: "best", label: "Best Available", icon: Crown, gradient: "from-purple-500 to-pink-500" },
    { value: "2160p", label: "4K Ultra HD (2160p)", icon: Star, gradient: "from-blue-500 to-purple-500" },
    { value: "1440p", label: "2K Quad HD (1440p)", icon: Star, gradient: "from-indigo-500 to-blue-500" },
    { value: "1080p", label: "Full HD (1080p)", icon: Target, gradient: "from-red-500 to-orange-500" },
    { value: "720p", label: "HD Ready (720p)", icon: BarChart3, gradient: "from-yellow-500 to-red-500" },
    { value: "480p", label: "Standard (480p)", icon: Filter, gradient: "from-slate-400 to-slate-600" },
    { value: "360p", label: "Low (360p)", icon: Filter, gradient: "from-slate-300 to-slate-500" },
    { value: "240p", label: "Very Low (240p)", icon: Filter, gradient: "from-slate-200 to-slate-400" },
    { value: "144p", label: "Minimum (144p)", icon: Filter, gradient: "from-slate-100 to-slate-300" }
  ];

  const audioQualityOptions = [
    { value: "best", label: "Best Quality (320kbps)", icon: Crown, gradient: "from-purple-500 to-pink-500" },
    { value: "high", label: "High Quality (256kbps)", icon: Star, gradient: "from-blue-500 to-purple-500" },
    { value: "medium", label: "Medium Quality (192kbps)", icon: Target, gradient: "from-red-500 to-orange-500" },
    { value: "low", label: "Low Quality (128kbps)", icon: BarChart3, gradient: "from-yellow-500 to-red-500" }
  ];

  // Filter quality options based on available qualities from video info
  const qualityOptions = selectedFormat === 'mp3'
    ? audioQualityOptions
    : videoInfo?.availableQualities
      ? allQualityOptions.filter(option =>
        videoInfo.availableQualities.includes(option.value) || option.value === 'best'
      )
      : allQualityOptions;

  // Add logging to see what qualities are available
  useEffect(() => {
    if (videoInfo?.availableQualities) {
      console.log('🎯 Available qualities from server:', videoInfo.availableQualities);
      console.log('🎯 Filtered quality options:', qualityOptions);
      console.log('🎯 Max quality supported:', videoInfo.maxQuality);
      console.log('🎯 Quality recommendation:', videoInfo.qualityRecommendation);
    }
  }, [videoInfo, qualityOptions]);

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
    <div className="max-w-full mx-auto p-4 sm:p-8 space-y-10 animate-scale-up">
      {/* Main Download Interface */}
      <div className="relative group">
        {/* Animated Gradient Border */}
        <div className="absolute -inset-0.5 bg-gradient-purple-blue rounded-3xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-500 animate-pulse-glow"></div>

        <Card className="relative glass-card-premium border-0 shadow-floating rounded-3xl bg-white/80 dark:bg-modern-surface/80 backdrop-blur-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-5xl font-black text-gradient-purple-blue drop-shadow-lg animate-slide-down">
              Video Downloader
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-300 text-lg mt-2 animate-fade-in">Professional-grade downloading with advanced features</p>

            {/* Platform Support Badges */}
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {["YouTube", "Instagram", "TikTok", "Twitter", "Facebook", "Hotstar", "+1000 more"].map((platform, idx) => (
                <Badge
                  key={platform}
                  variant="secondary"
                  className="glass-button hover-scale shadow-sm animate-fade-in"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  {platform}
                </Badge>
              ))}
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* URL Input Section */}
            <div className="space-y-10">
              <div className="relative group max-w-5xl mx-auto w-full">
                <div className="absolute inset-0 bg-gradient-purple-blue rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 animate-pulse"></div>
                <div className="relative flex flex-col sm:flex-row items-center bg-white dark:bg-modern-surface border-4 border-white dark:border-white/10 rounded-3xl sm:rounded-full shadow-2xl p-2 overflow-hidden transition-all duration-300 focus-within:ring-4 focus-within:ring-purple-500/30">
                  <Input
                    type="url"
                    placeholder="🔗 Paste YouTube, Instagram, or TikTok URL here..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1 h-16 sm:h-20 text-lg sm:text-xl border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-6 sm:px-8 transition-all duration-300 text-gray-900 dark:text-white placeholder:text-gray-400 font-medium"
                  />
                  <Button
                    onClick={handleSubmit}
                    disabled={isAnalyzing || !url.trim()}
                    className="h-14 sm:h-16 px-10 bg-gradient-purple-blue hover:shadow-glow-purple text-white rounded-2xl sm:rounded-full font-bold text-lg sm:text-lg transition-all duration-300 hover-scale w-full sm:w-auto mt-2 sm:mt-0 shadow-lg"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <span className="flex items-center">
                        <Download className="w-6 h-6 mr-2" />
                        Download
                      </span>
                    )}
                  </Button>
                </div>
              </div>

              {/* Premium Result Card (SaveFrom style) */}
              {videoInfo && !infoError && (() => {
                const info = videoInfo as VideoInfo;
                const hasThumbnail = info.thumbnail && info.thumbnail.trim() !== '' && info.thumbnail !== 'NA' && !thumbnailError;

                return (
                  <div className="bg-white/90 dark:bg-modern-surface/90 rounded-3xl p-6 md:p-8 border border-white/40 dark:border-white/10 shadow-2xl backdrop-blur-xl animate-fade-in flex flex-col md:flex-row gap-8 items-start max-w-5xl mx-auto w-full">
                    {/* Thumbnail */}
                    <div className="w-full md:w-80 aspect-video rounded-2xl overflow-hidden shadow-lg bg-gray-200 dark:bg-gray-800 flex-shrink-0 relative group">
                      {hasThumbnail ? (
                        <img
                          src={info.thumbnail}
                          alt={info.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={() => setThumbnailError(true)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white px-3 py-1 rounded-lg text-sm font-semibold flex items-center backdrop-blur-md">
                        <Clock className="w-4 h-4 mr-1.5" /> {info.duration || 'N/A'}
                      </div>
                    </div>

                    {/* Info & Fast Download Controls */}
                    <div className="flex-1 w-full flex flex-col h-full justify-between space-y-4 md:space-y-0">
                      <div>
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight pr-8 relative">
                          {info.title || 'Unknown Title'}
                          <button onClick={() => copyToClipboard(info.title || '')} className="absolute top-0 right-0 p-2 text-gray-400 hover:text-blue-500 transition-colors"><Copy className="w-4 h-4" /></button>
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400 font-medium mt-4">
                          <span className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800/50">{info.platform || 'Unknown'}</span>
                          {info.views && <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full flex items-center border border-gray-200 dark:border-gray-700"><Play className="w-3 h-3 mr-1.5" /> {info.views} Views</span>}
                        </div>
                      </div>

                      <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center w-full">
                        <Button
                          onClick={handleDownload}
                          disabled={isAnalyzing}
                          className="w-full sm:w-auto h-14 sm:h-16 px-10 bg-gradient-teal-green hover:shadow-glow text-white rounded-2xl font-black text-lg sm:text-xl transition-all duration-300 hover-scale hover-lift shadow-xl"
                        >
                          <Download className="w-6 h-6 mr-2" />
                          Download Now
                        </Button>
                        <div className="flex flex-col text-sm text-gray-600 dark:text-gray-400 w-full sm:w-auto">
                          <div className="bg-gray-50 dark:bg-modern-surface-alt p-3 rounded-xl border border-gray-100 dark:border-white/5">
                            <div className="flex justify-between gap-4 py-1 border-b border-gray-200 dark:border-gray-700">
                              <span>Format:</span>
                              <span className="text-gray-900 dark:text-white font-bold uppercase">{selectedFormat}</span>
                            </div>
                            <div className="flex justify-between gap-4 py-1">
                              <span>Quality:</span>
                              <span className="text-gray-900 dark:text-white font-bold">{selectedQuality}</span>
                            </div>
                          </div>
                          <span className="text-xs text-blue-500 mt-2 text-center sm:text-left">(Check options below for more formats)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

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

                {/* MP3 Format Indicator */}
                {selectedFormat === "mp3" && (
                  <div className="bg-green-100 border-2 border-green-300 rounded-xl p-4">
                    <div className="flex items-center">
                      <Music className="w-6 h-6 mr-3 text-green-600" />
                      <div>
                        <div className="font-semibold text-green-800">MP3 Audio Format Selected</div>
                        <div className="text-sm text-green-600">Audio-only download with best quality</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {formatOptions.map((format) => (
                    <button
                      key={format.value}
                      type="button"
                      onClick={() => setSelectedFormat(format.value)}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 hover-scale hover-lift ${selectedFormat === format.value
                        ? `${format.color} text-white border-transparent shadow-glow`
                        : "glass-button hover:border-purple-300 dark:hover:border-purple-500"
                        }`}
                    >
                      <format.icon className="w-6 h-6 mx-auto mb-2 transition-transform duration-300 group-hover:scale-110" />
                      <div className="text-sm font-medium">{format.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality Selection - New Dropdown Style */}
              {(selectedFormat === "mp4" || selectedFormat === "webm") && videoInfo && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center text-black">
                    <Target className="w-5 h-5 mr-2" />
                    Select Download Quality
                  </h3>

                  {/* Format Selection Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowFormatDropdown(!showFormatDropdown)}
                      className="w-full p-4 bg-white/80 dark:bg-modern-surface-alt/80 border-2 border-gray-200 dark:border-white/10 rounded-xl flex items-center justify-between hover:border-gray-300 dark:hover:border-white/20 transition-colors backdrop-blur-md"
                    >
                      <div className="flex items-center">
                        <Download className="w-5 h-5 mr-3 text-green-600" />
                        <div className="text-left">
                          <div className="font-medium text-gray-900">
                            {selectedFormatId ? `Selected: ${selectedFormatId}` : "Choose download quality..."}
                          </div>
                          <div className="text-sm text-gray-500">
                            {videoInfo.maxQuality ? `Available up to ${videoInfo.maxQuality}` : "Loading formats..."}
                          </div>
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showFormatDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {showFormatDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-modern-surface border-2 border-gray-200 dark:border-white/10 rounded-xl shadow-2xl z-50 max-h-96 sm:max-h-[500px] overflow-y-auto backdrop-blur-xl animate-scale-up">
                        {/* Video Formats Section */}
                        <div className="p-4 border-b border-gray-100">
                          <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                            <Video className="w-4 h-4 mr-2 text-blue-600" />
                            Video Formats (MP4)
                          </h4>
                          <div className="space-y-2">
                            {videoInfo.formats?.filter(f => f.format === 'mp4' && f.resolution).map((format) => (
                              <button
                                key={format.formatId}
                                onClick={() => {
                                  setSelectedFormatId(format.formatId);
                                  setSelectedQuality(format.quality);
                                  setShowFormatDropdown(false);
                                }}
                                className="w-full p-3 flex items-center justify-between hover:bg-gray-50 rounded-lg transition-colors"
                              >
                                <div className="flex items-center">
                                  <Download className="w-4 h-4 mr-3 text-green-600" />
                                  <span className="font-medium text-gray-900">MP4</span>
                                  <span className="ml-2 text-gray-500">{format.resolution}</span>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-gray-700">{format.quality}</div>
                                  {format.fileSize && (
                                    <div className="text-xs text-gray-500">{format.fileSize}</div>
                                  )}
                                </div>
                              </button>
                            ))}
                            {/* Fallback to available qualities if formats not available */}
                            {(!videoInfo.formats || videoInfo.formats.length === 0) && videoInfo.availableQualities?.map((quality) => (
                              <button
                                key={quality}
                                onClick={() => {
                                  setSelectedFormatId(quality);
                                  setSelectedQuality(quality);
                                  setShowFormatDropdown(false);
                                }}
                                className="w-full p-3 flex items-center justify-between hover:bg-gray-50 rounded-lg transition-colors"
                              >
                                <div className="flex items-center">
                                  <Download className="w-4 h-4 mr-3 text-green-600" />
                                  <span className="font-medium text-gray-900">MP4</span>
                                  <span className="ml-2 text-gray-500">{quality}</span>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-gray-700">{quality}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Audio Formats Section */}
                        <div className="p-4">
                          <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                            <Music className="w-4 h-4 mr-2 text-green-600" />
                            Audio Formats
                          </h4>
                          <div className="space-y-2">
                            <button
                              onClick={() => {
                                console.log('🎵 MP3 button clicked - setting format to mp3');
                                setSelectedFormatId("audio-mp3");
                                setSelectedQuality("best");
                                setSelectedFormat("mp3");
                                setShowFormatDropdown(false);
                                console.log('🎵 After setting - selectedFormat:', "mp3", 'selectedQuality:', "best");

                                // Show success toast
                                toast({
                                  title: "MP3 Format Selected",
                                  description: "Audio-only MP3 download configured. Quality set to best available.",
                                });

                                // Additional debugging
                                console.log('🎵 MP3 Selection Debug:', {
                                  selectedFormat: "mp3",
                                  selectedQuality: "best",
                                  selectedFormatId: "audio-mp3",
                                  timestamp: new Date().toISOString()
                                });
                              }}
                              className="w-full p-3 flex items-center justify-between hover:bg-gray-50 rounded-lg transition-colors"
                            >
                              <div className="flex items-center">
                                <Download className="w-4 h-4 mr-3 text-green-600" />
                                <span className="font-medium text-gray-900">MP3</span>
                                <span className="ml-2 text-gray-500">Audio</span>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-gray-700">Audio Only</div>
                                <div className="text-xs text-gray-500">Best Quality</div>
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MP3 Quality Selection */}
              {selectedFormat === "mp3" && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center text-black">
                    <Music className="w-5 h-5 mr-2" />
                    MP3 Audio Quality
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {audioQualityOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSelectedQuality(option.value);
                          toast({
                            title: "Quality Updated",
                            description: `MP3 quality set to ${option.label}`,
                          });
                        }}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${selectedQuality === option.value
                          ? "bg-green-500 text-white border-transparent shadow-lg"
                          : "bg-white border-gray-200 hover:border-gray-300"
                          }`}
                      >
                        <option.icon className="w-6 h-6 mx-auto mb-2" />
                        <div className="text-sm font-medium">{option.label}</div>
                        <div className="text-xs opacity-80">
                          {option.value === 'best' ? '320kbps' :
                            option.value === 'high' ? '256kbps' :
                              option.value === 'medium' ? '192kbps' : '128kbps'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Format Info */}
              {selectedFormatId && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-green-800 dark:text-green-400">
                      <span className="font-medium">Selected:</span> {selectedFormatId}
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300 font-medium">
                      Quality: {selectedQuality}
                    </div>
                  </div>
                  {selectedFormat === "mp3" && (
                    <div className="text-xs text-green-600 dark:text-green-500 mt-1">
                      🎵 Audio-only MP3 download configured
                    </div>
                  )}
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
                <div className="bg-gray-50/50 dark:bg-black/20 rounded-2xl p-6 space-y-6 border-2 border-gray-200 dark:border-white/10 backdrop-blur-md">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Advanced Configuration</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                          className="text-sm dark:bg-modern-surface dark:border-white/10 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Custom Filename */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-white/80 flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        Custom Filename
                      </label>
                      <Input
                        type="text"
                        placeholder="Enter custom filename..."
                        value={customFilename}
                        onChange={(e) => setCustomFilename(e.target.value)}
                        className="text-sm dark:bg-modern-surface dark:border-white/10 dark:text-white"
                      />
                    </div>

                    {/* Audio/Video Codecs */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-white/80">Codec Settings</label>
                      <div className="space-y-2">
                        <select
                          value={audioCodec}
                          onChange={(e) => setAudioCodec(e.target.value)}
                          className="w-full p-2 border rounded-lg text-sm dark:bg-modern-surface dark:border-white/10 dark:text-white"
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

            {/* Feature Highlights Cards */}
            <div className="mt-8">
              <FeatureHighlights />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom video card removed in favor of top card */}

      {
        infoError && (
          <Card className="bg-red-50 border-0 shadow-lg">
            <CardContent className="p-6 text-red-700">{infoError}</CardContent>
          </Card>
        )
      }
    </div >
  );
}