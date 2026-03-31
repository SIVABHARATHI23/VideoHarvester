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
import { API_URL } from "@/lib/api";


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
  const [showAllFormats, setShowAllFormats] = useState<boolean>(false);

  // Advanced options
  const [audioCodec, setAudioCodec] = useState<string>("mp3");
  const [videoCodec, setVideoCodec] = useState<string>("h264");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [subtitles, setSubtitles] = useState<boolean>(false);
  const [saveThumbnail, setSaveThumbnail] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<boolean>(true);
  const [customFilename, setCustomFilename] = useState<string>("");
  const [downloadLocation, setDownloadLocation] = useState<string>("Downloads/Videos");

  const progressRef = useRef<HTMLDivElement | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);

  // WebSocket: update download history on relevant events
  const fetchHistory = useCallback(() => {
    fetch(`${API_URL}/api/downloads`)
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
    if (message.type === 'download_complete') {
      // Trigger the native browser download dialog using a more robust anchor injection approach
      if (message.id) {
        const downloadUrl = `${API_URL}/api/download/${message.id}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.target = '_blank';
        link.setAttribute('download', ''); // Force browser download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: "Download complete!",
          description: "Your file is ready and has been handed off to the browser's download section.",
        });
      }
    }

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
  }, [fetchHistory, toast]);
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
    if (url.includes("pinterest.com") || url.includes("pin.it")) return "Pinterest";
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
    } else if (!url.trim()) {
      setVideoInfo(null);
      setInfoError(null);
    }
  }, [url]);

  const fetchVideoInfo = async (videoUrl: string) => {
    setIsAnalyzing(true);
    setInfoError(null);
    setVideoInfo(null);
    setThumbnailError(false);
    try {
      console.log('Fetching video info for URL:', videoUrl);
      const res = await fetch(`${API_URL}/api/video-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl }),
      });

      console.log('Response status:', res.status);
      console.log('Response headers:', res.headers);

      if (!res.ok) {
        let errorData;
        try {
          errorData = await res.json();
        } catch (e) {
          errorData = { message: `Failed to fetch video info: ${res.status} ${res.statusText}` };
        }
        
        console.error('API Error Response:', errorData);
        setInfoError(errorData.error || errorData.message || "Could not fetch video info");
        
        if (errorData.tip) {
          toast({
            title: "Access Restricted",
            description: errorData.tip,
            variant: "destructive",
          });
        }
        setIsAnalyzing(false);
        return;
      }

      const info = await res.json();
      setVideoInfo(info);
      setInfoError(null);

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

  const handleDownload = async (overrideFormat?: string, overrideQuality?: string, overrideFormatId?: string, overrideFileSize?: string) => {
    const finalFormat = overrideFormat || selectedFormat;
    const finalQuality = overrideQuality || selectedQuality;
    const finalFormatId = overrideFormatId || selectedFormatId;
    const finalFileSize = overrideFileSize;

    if (!url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a valid video URL",
        variant: "destructive",
      });
      return;
    }

    // Proceed with download logic directly

    setIsAnalyzing(true);
    try {
      console.log('🎵 Starting download request:', { url, format: finalFormat, quality: finalQuality, formatId: finalFormatId });

      const requestBody = {
        url,
        format: finalFormat,
        quality: finalQuality,
        formatId: finalFormatId,
        fileSize: finalFileSize,
        title: videoInfo?.title || 'Unknown Title',
        downloadLocation,
        // Advanced options
        audioCodec,
        videoCodec,
        startTime,
        endTime,
        subtitles,
        thumbnailUrl: videoInfo?.thumbnail,
        saveThumbnail,
        metadata,
        customFilename,
      };

      const res = await fetch(`${API_URL}/api/downloads`, {
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

      const formatMessage = finalFormat === 'mp3'
        ? `MP3 audio download started! Quality: ${finalQuality}`
        : `Download started! Format: ${finalFormat}, Quality: ${finalQuality}`;

      toast({
        title: "Download started!",
        description: `${formatMessage} Files will be saved to: ${downloadLocation}`,
      });

      setUrl("");
      setVideoInfo(null);
      setInfoError(null);

    } catch (err: any) {
      console.error('Download request failed:', err);
      let errorMessage = err.message || "Could not initiate download. Please try again.";
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
        await fetch(`${API_URL}/api/downloads`, {
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
            saveThumbnail,
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
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        const path = dirHandle.name;
        setDownloadLocation(path);
        toast({
          title: "Location selected!",
          description: `Files will be saved to: ${path}`,
        });
      } else {
        const commonPaths = ["Downloads", "Downloads/Videos", "Documents/Videos", "Desktop/Videos"];
        const customPath = prompt("Enter download path:", downloadLocation);
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

  const handleRemoveDownload = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/api/downloads/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove download');
      toast({ title: 'Removed', description: 'Download removed from history.' });
      fetchHistory();
    } catch (err) {
      toast({ title: 'Failed to remove', description: 'Could not remove download.', variant: 'destructive' });
    }
  };

  return (
    <div className="max-w-full mx-auto p-4 sm:p-8 space-y-12 animate-scale-up">
      {/* Main Download Interface */}
      <div className="relative w-full space-y-8">
        <div className="space-y-10">
          {/* Modern URL Input Hero - Sivabharathi Signature Edition */}
          <div className="max-w-[1000px] mx-auto animate-in slide-in-from-top duration-700">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-black text-gray-900 tracking-tighter sm:text-5xl mb-2">
                VIDEO<span className="text-[#00b44b]">HARVESTER</span>
              </h2>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em]">
                Engineered by Sivabharathi 2026
              </p>
            </div>

            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#00b44b] to-emerald-400 rounded-3xl blur opacity-25 group-focus-within:opacity-50 transition duration-500"></div>
              
              <div className="relative flex flex-col sm:flex-row bg-white/90 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-2xl border border-white/50 focus-within:ring-4 focus-within:ring-[#00b44b]/20 transition-all duration-300">
                <div className="flex-1 flex items-center relative">
                  <div className="absolute left-5 text-[#00b44b]">
                    <Zap className="w-6 h-6 fill-current animate-pulse" />
                  </div>
                  <Input
                    placeholder="Enter URL to Harvest Content..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1 h-16 text-xl border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-6 transition-all duration-300 text-gray-900 placeholder:text-gray-400 font-bold pl-14"
                  />
                  {url && (
                    <button
                      onClick={() => setUrl("")}
                      className="p-1 mx-3 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <AlertCircle className="w-6 h-6 rotate-45" />
                    </button>
                  )}
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={isAnalyzing || !url.trim()}
                  className="h-auto px-12 bg-[#00b44b] hover:bg-[#009a3f] text-white rounded-none font-black text-2xl transition-all duration-500 flex items-center gap-3 py-6 sm:py-0 shadow-lg"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-7 h-7 animate-spin" />
                  ) : (
                    "HARVEST"
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* VideoHarvester Style Result Card - Premium Overlay */}
          {videoInfo && !infoError && (() => {
            const info = videoInfo as VideoInfo;
            const hasThumbnail = info.thumbnail && info.thumbnail.trim() !== '' && info.thumbnail !== 'NA' && !thumbnailError;

            return (
              <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-glow animate-in fade-in zoom-in duration-700 flex flex-col lg:flex-row gap-0 max-w-6xl mx-auto w-full border border-white/40 backdrop-blur-3xl bg-white/60 dark:bg-black/40 hover-lift relative group/card">
                {/* Visual Flair */}
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#00b44b]/10 rounded-full blur-3xl"></div>

                {/* Left: Content Intelligence Section */}
                <div className="w-full lg:w-96 p-8 flex flex-col gap-6 relative z-10 border-r border-white/20 bg-gradient-to-br from-white/40 to-transparent">
                  <div className="relative group/thumb shadow-2xl rounded-3xl overflow-hidden aspect-video lg:aspect-square border-4 border-white">
                    {hasThumbnail ? (
                      <img
                        src={`${API_URL}/api/proxy-image?url=${encodeURIComponent(info.thumbnail)}`}
                        alt={info.title}
                        className="w-full h-full object-cover transform group-hover/thumb:scale-105 transition-transform duration-1000"
                        onError={() => setThumbnailError(true)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100/50">
                        <Video className="w-16 h-16 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-black/60 backdrop-blur-md text-white border-0 px-3 py-1 font-black text-[10px] uppercase">
                        {info.platform || 'DETECTED'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-2xl font-black text-gray-900 leading-tight tracking-tighter">
                      {info.title || 'Unknown Asset'}
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm font-black text-gray-500 uppercase tracking-widest">
                        <Clock className="w-4 h-4" />
                        {info.duration || '00:00'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Master Download Matrix */}
                <div className="flex-1 p-4 sm:p-10 relative z-10">
                  <div className="space-y-8">
                    {/* Audio Module */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-8 bg-[#ffdd00] rounded-full"></div>
                        <h4 className="text-lg font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                          <Music className="w-5 h-5 text-[#ffdd00]" /> High Fidelity Audio
                        </h4>
                      </div>

                      <div className="grid gap-3">
                        {(info.formats?.filter(f => f.format === 'MP3') || []).map((f) => (
                          <div key={f.formatId} className="flex items-center justify-between p-5 bg-white/40 hover:bg-white/80 rounded-2xl border border-white/60 transition-all group/row shadow-sm hover:shadow-md">
                            <div className="flex items-center gap-4">
                              <span className="bg-[#ffdd00] text-gray-900 w-12 h-12 flex items-center justify-center rounded-xl font-black text-xs">MP3</span>
                              <div>
                                <div className="font-black text-gray-900">{f.resolution}</div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{f.fileSize || 'BEST QUALITY'}</div>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleDownload('mp3', f.quality || 'best', f.formatId)}
                              className="bg-black hover:bg-gray-800 text-white font-black h-12 px-8 rounded-xl transition-all hover:scale-105 active:scale-95"
                            >
                              GRAB
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Video Module */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-8 bg-[#00b44b] rounded-full"></div>
                        <h4 className="text-lg font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                          <Play className="w-5 h-5 text-[#00b44b]" /> Premium Video
                        </h4>
                      </div>

                      <div className="grid gap-3">
                        {(showAllFormats
                            ? (info.formats?.filter(f => f.format !== 'MP3' && f.format !== 'IMAGE') || [])
                            : (info.formats?.filter(f => f.format !== 'MP3' && f.format !== 'IMAGE').slice(0, 5) || [])
                          ).map((f) => (
                          <div key={f.formatId} className="flex items-center justify-between p-5 bg-white/40 hover:bg-white/80 rounded-2xl border border-white/60 transition-all group/row shadow-sm hover:shadow-md">
                            <div className="flex items-center gap-4">
                              <span className="bg-[#00b44b] text-white w-12 h-12 flex items-center justify-center rounded-xl font-black text-xs uppercase">{f.format}</span>
                              <div>
                                <div className="font-black text-gray-900">{f.resolution}</div>
                                <div className="text-[10px] font-bold text-[#00b44b] uppercase tracking-widest">{f.quality} • {f.fileSize || 'RAW'}</div>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleDownload(f.format, f.quality, f.formatId, f.fileSize)}
                              className="bg-[#00b44b] hover:bg-[#009a3f] text-white font-black h-12 px-8 rounded-xl transition-all hover:scale-105 active:scale-95"
                            >
                              GET VIDEO
                            </Button>
                          </div>
                        ))}
                      </div>
                      
                      {info.formats && info.formats.filter(f => f.format !== 'MP3').length > 5 && (
                        <div className="pt-2">
                          <Button 
                            variant="ghost" 
                            onClick={() => setShowAllFormats(!showAllFormats)}
                            className="w-full h-12 rounded-2xl font-black text-gray-500 uppercase tracking-widest hover:bg-white/50"
                          >
                            {showAllFormats ? "Collapse Views" : `Explore All (${info.formats.filter(f => f.format !== 'MP3').length})`}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Support Modules Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto w-full">
            {/* Download Path & Target */}
            <div className="bg-white/40 backdrop-blur-xl rounded-[2rem] p-8 border border-white/60 shadow-xl space-y-6">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest flex items-center gap-3">
                <FolderOpen className="w-6 h-6 text-[#00b44b]" /> Intelligence Matrix
              </h3>
              
              <div className="space-y-4">
                <div className="p-5 bg-white/60 rounded-2xl border border-white/80 group">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Target Directory</div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-700 truncate mr-4">{downloadLocation}</span>
                    <Button
                      onClick={handleSelectDownloadLocation}
                      size="sm"
                      className="bg-black hover:bg-gray-800 text-white rounded-lg font-bold"
                    >
                      SWITCH
                    </Button>
                  </div>
                </div>

                <div className="p-5 bg-white/60 rounded-2xl border border-white/80">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Advanced Harvest Mode</div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-500">Enable surgical precision mode</span>
                    <button
                      onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                      className={`w-12 h-6 rounded-full transition-all duration-300 relative ${isAdvancedMode ? 'bg-[#00b44b]' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isAdvancedMode ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Focal Point */}
            <div className="bg-gradient-to-br from-[#00b44b] to-emerald-600 rounded-[2rem] p-8 text-white shadow-2xl shadow-green-500/20 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">Direct Browser Integration</h3>
                <p className="text-white/80 font-bold leading-relaxed mb-6">
                  Experience seamless harvests with native browser handoff. No more annoying players, just direct file access.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 bg-white/20 backdrop-blur-md rounded-2xl p-4 text-center">
                  <div className="text-xs font-black uppercase tracking-widest opacity-60 mb-1">Status</div>
                  <div className="font-black">OPERATIONAL</div>
                </div>
                <div className="flex-1 bg-white/20 backdrop-blur-md rounded-2xl p-4 text-center">
                  <div className="text-xs font-black uppercase tracking-widest opacity-60 mb-1">Version</div>
                  <div className="font-black">V4.0 GOLD</div>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Surgery Panel */}
          {isAdvancedMode && (
            <div className="max-w-6xl mx-auto w-full animate-in slide-in-from-bottom duration-500">
              <div className="bg-gray-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10">
                  <Settings className="w-32 h-32 animate-spin-slow" />
                </div>
                
                <h3 className="text-2xl font-black uppercase tracking-[0.3em] mb-10 text-emerald-400">Parameter Configuration</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                      <Scissors className="w-4 h-4" /> Temporal Trimming
                    </label>
                    <div className="flex gap-4">
                      <Input type="time" step="1" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-white/10 border-white/20 text-white font-black rounded-xl h-12" />
                      <Input type="time" step="1" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-white/10 border-white/20 text-white font-black rounded-xl h-12" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Identity Override
                    </label>
                    <Input placeholder="Custom Filename..." value={customFilename} onChange={(e) => setCustomFilename(e.target.value)} className="bg-white/10 border-white/20 text-white font-black rounded-xl h-12" />
                  </div>

                  <div className="flex flex-wrap gap-8 pt-8">
                    {[
                      { key: 'metadata', label: 'Embed Metadata', state: metadata, setState: setMetadata },
                      { key: 'subtitles', label: 'Harvest Subs', state: subtitles, setState: setSubtitles }
                    ].map((option) => (
                      <label key={option.key} className="flex items-center gap-3 cursor-pointer group">
                        <div 
                          className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${option.state ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'}`}
                          onClick={() => option.setState(!option.state)}
                        >
                          {option.state && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>
                        <span className="text-sm font-black uppercase tracking-widest group-hover:text-emerald-400 transition-colors">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Batch Infiltration */}
          <div className="max-w-6xl mx-auto w-full border-t border-gray-100 pt-10">
            <button
              onClick={() => setShowBatchMode(!showBatchMode)}
              className="flex items-center gap-4 text-xl font-black text-gray-900 group"
            >
              <div className="w-12 h-12 bg-white shadow-xl rounded-2xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                {showBatchMode ? <ChevronUp /> : <Link2 />}
              </div>
              <span className="uppercase tracking-[0.2em]">Batch Infiltration</span>
            </button>
            
            {showBatchMode && (
                <div className="mt-8 p-10 bg-white shadow-2xl rounded-[2.5rem] border border-gray-100 animate-in slide-in-from-top duration-500">
                  <textarea
                    placeholder="Drop targets here (One URL per line)..."
                    value={batchUrls}
                    onChange={(e) => setBatchUrls(e.target.value)}
                    rows={6}
                    className="w-full p-6 bg-gray-50 rounded-3xl border-2 border-transparent focus:border-[#00b44b] focus:bg-white transition-all resize-none font-bold text-gray-700"
                  />
                  <div className="flex justify-between items-center mt-6">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Targets Detected: {batchUrls.split('\n').filter((u: string) => u.trim()).length}</span>
                    <Button 
                      onClick={handleBatchDownload} 
                      className="bg-black hover:bg-gray-800 text-white font-black px-10 h-14 rounded-2xl"
                      disabled={!batchUrls.trim()}
                    >
                      BEGIN BATCH HARVEST
                    </Button>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      {infoError && (
        <div className="max-w-6xl mx-auto w-full bg-rose-50 border-2 border-rose-100 p-8 rounded-[2rem] animate-pulse">
          <div className="flex items-center gap-4 text-rose-600">
            <AlertCircle className="w-8 h-8" />
            <div className="font-black uppercase tracking-widest">{infoError}</div>
          </div>
        </div>
      )}
    </div>
  );
}