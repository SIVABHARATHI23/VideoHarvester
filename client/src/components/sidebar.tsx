import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Settings, BarChart3, Zap, FolderOpen, Trash, Pause, History,
  Folder, Download, CheckCircle, AlertCircle, Clock, Play,
  Wifi, WifiOff, HardDrive, Gauge, Monitor, Globe, Shield,
  RefreshCw, Activity, Target, Server, Database, Cpu, X, Check
} from "lucide-react";

// Types
interface DownloadItem {
  id: number;
  status: 'queued' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  title?: string;
  format?: string;
  platform?: string;
  progress?: number;
  fileSize?: string;
  url?: string;
}

interface DownloadSettings {
  downloadPath?: string;
  maxConcurrentDownloads?: number;
  downloadQuality?: string;
  audioQuality?: string;
  autoRetry?: boolean;
  notificationsEnabled?: boolean;
  maxRetries?: number;
  downloadTimeout?: number;
}

interface SystemStatus {
  ytdlpAvailable: boolean;
  activeDownloads: number;
  queuedDownloads: number;
  totalDownloads: number;
  maxConcurrent: number;
  version: string;
}

interface ToastMessage {
  id: string;
  title: string;
  description: string;
  variant: 'default' | 'destructive' | 'success';
}

// Custom Toast Hook
function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback(({ title, description, variant = 'default' }: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    const newToast = { id, title, description, variant };

    setToasts(prev => [...prev, newToast]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toast, toasts, removeToast };
}

// API helper
const apiRequest = async (method: string, endpoint: string, data?: any) => {
  try {
    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
};

// Custom Switch Component
function Switch({ checked, onCheckedChange, disabled }: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onCheckedChange(!checked)}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        ${checked ? 'bg-blue-600' : 'bg-gray-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );
}

// Custom Slider Component
function Slider({
  value,
  onValueChange,
  max,
  min,
  step,
  disabled,
  className = ""
}: {
  value: number[];
  onValueChange: (value: number[]) => void;
  max: number;
  min: number;
  step: number;
  disabled?: boolean;
  className?: string;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange([parseInt(e.target.value)]);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={handleChange}
        disabled={disabled}
        className={`
          w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
          ${disabled ? 'opacity-50' : ''}
          slider-thumb:appearance-none slider-thumb:h-4 slider-thumb:w-4 
          slider-thumb:rounded-full slider-thumb:bg-blue-600 slider-thumb:cursor-pointer
        `}
        style={{
          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((value[0] - min) / (max - min)) * 100}%, #e5e7eb ${((value[0] - min) / (max - min)) * 100}%, #e5e7eb 100%)`
        }}
      />
    </div>
  );
}

// Toast Component
function ToastContainer({ toasts, onRemove }: { toasts: ToastMessage[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`
            min-w-80 p-4 rounded-lg shadow-lg border flex items-start justify-between
            ${toast.variant === 'destructive' ? 'bg-red-50 border-red-200' :
              toast.variant === 'success' ? 'bg-green-50 border-green-200' :
                'bg-white border-gray-200'}
          `}
        >
          <div className="flex-1">
            <h4 className={`font-semibold text-sm ${toast.variant === 'destructive' ? 'text-red-800' :
              toast.variant === 'success' ? 'text-green-800' :
                'text-gray-800'
              }`}>
              {toast.title}
            </h4>
            <p className={`text-sm mt-1 ${toast.variant === 'destructive' ? 'text-red-700' :
              toast.variant === 'success' ? 'text-green-700' :
                'text-gray-600'
              }`}>
              {toast.description}
            </p>
          </div>
          <button
            onClick={() => onRemove(toast.id)}
            className="ml-4 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function AdvancedSidebar() {
  // State management
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeTab, setActiveTab] = useState<'settings' | 'stats' | 'actions' | 'advanced'>('settings');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [settings, setSettings] = useState<DownloadSettings>({
    downloadPath: "~/Downloads/Videos",
    maxConcurrentDownloads: 3,
    downloadQuality: "1080p",
    audioQuality: "320kbps",
    autoRetry: true,
    notificationsEnabled: true,
    maxRetries: 2,
    downloadTimeout: 600
  });

  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [supportedPlatforms, setSupportedPlatforms] = useState<any>(null);
  const [cookieStatus, setCookieStatus] = useState<{
    exists: boolean;
    source: string;
    lastUpdated: string | null;
    stats: { lines: number; hasHSID: boolean; hasSID: boolean };
  } | null>(null);
  const [cookieInput, setCookieInput] = useState("");

  // Action loading states
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});

  const { toast, toasts, removeToast } = useToast();

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

  // Data fetching
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all data concurrently
      const [settingsData, downloadsData, statusData, platformsData] = await Promise.allSettled([
        apiRequest('GET', '/api/settings'),
        apiRequest('GET', '/api/downloads'),
        apiRequest('GET', '/api/status'),
        apiRequest('GET', '/api/supported-platforms'),
        apiRequest('GET', '/api/cookie-status')
      ]);

      if (settingsData.status === 'fulfilled') {
        setSettings(prev => ({ ...prev, ...settingsData.value }));
      }

      if (downloadsData.status === 'fulfilled') {
        // Handle the new server response structure
        const downloadsArray = downloadsData.value.downloads || downloadsData.value;

        if (Array.isArray(downloadsArray)) {
          setDownloads(downloadsArray);
        } else {
          console.error('Invalid downloads data structure in sidebar:', downloadsData.value);
          setDownloads([]);
        }
      }

      if (statusData.status === 'fulfilled') {
        setSystemStatus(statusData.value);
      }

      if (platformsData.status === 'fulfilled') {
        setSupportedPlatforms(platformsData.value);
      }

      if (statusData.status === 'fulfilled') {
        // Correctly handle the fifth item which is cookie status
        const cookieData = (await Promise.allSettled([apiRequest('GET', '/api/cookie-status')]))[0];
        if (cookieData.status === 'fulfilled') {
           setCookieStatus(cookieData.value);
        }
      }

    } catch (error: any) {
      setError(error.message || 'Failed to fetch data');
      toast({
        title: "Error",
        description: "Failed to load data from server",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Initial data load and polling
  useEffect(() => {
    fetchData();

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Calculate statistics
  const stats = {
    total: Array.isArray(downloads) ? downloads.length : 0,
    completed: Array.isArray(downloads) ? downloads.filter(d => d.status === 'completed').length : 0,
    downloading: Array.isArray(downloads) ? downloads.filter(d => d.status === 'downloading').length : 0,
    failed: Array.isArray(downloads) ? downloads.filter(d => d.status === 'failed').length : 0,
    queued: Array.isArray(downloads) ? downloads.filter(d => d.status === 'queued').length : 0,
    totalSize: Array.isArray(downloads) ? downloads.reduce((acc, d) => {
      if (d.fileSize) {
        const match = d.fileSize.match(/(\d+(?:\.\d+)?)\s*(MB|GB)/);
        if (match) {
          const size = parseFloat(match[1]);
          const unit = match[2];
          return acc + (unit === 'GB' ? size * 1024 : size);
        }
      }
      return acc;
    }, 0) : 0
  };

  const successRate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : "0.0";

  // Action handlers
  const handleSettingChange = useCallback(async (key: keyof DownloadSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      await apiRequest('POST', '/api/settings', { [key]: value });
      toast({
        title: "Settings Updated",
        description: `${key} has been updated successfully`,
        variant: "success"
      });
    } catch (error: any) {
      // Revert on error
      setSettings(settings);
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive"
      });
    }
  }, [settings, toast]);

  const handleAction = useCallback(async (actionName: string, apiCall: () => Promise<any>) => {
    setActionLoading(prev => ({ ...prev, [actionName]: true }));

    try {
      const result = await apiCall();
      toast({
        title: "Success",
        description: result.message || `${actionName} completed successfully`,
        variant: "success"
      });

      // Refresh data after action
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${actionName}`,
        variant: "destructive"
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [actionName]: false }));
    }
  }, [toast, fetchData]);

  const handleFolderPicker = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        // @ts-ignore - File System Access API
        const dirHandle = await window.showDirectoryPicker();
        const path = dirHandle.name || '';
        if (path) {
          handleSettingChange("downloadPath", path);
        }
      } else {
        // Fallback for unsupported browsers
        const input = document.createElement('input');
        input.type = 'file';
        (input as any).webkitdirectory = true;
        input.onchange = (e: any) => {
          const files = e.target.files;
          if (files.length > 0) {
            const path = files[0].webkitRelativePath.split('/')[0];
            handleSettingChange("downloadPath", path);
          }
        };
        input.click();
      }
    } catch (error) {
      console.log('Folder picker cancelled');
    }
  };

  const handleCookieUpload = async () => {
    if (!cookieInput.trim()) {
      toast({
        title: "Error",
        description: "Please paste your cookies first",
        variant: "destructive"
      });
      return;
    }

    handleAction('uploadCookies', async () => {
      const result = await apiRequest('POST', '/api/upload-cookies', { cookies: cookieInput });
      setCookieInput("");
      return result;
    });
  };

  const quickActions = [
    {
      label: 'Open Downloads Folder',
      icon: FolderOpen,
      action: () => handleAction('openFolder', () => apiRequest('POST', '/api/open-folder')),
      color: 'text-blue-600',
      key: 'openFolder'
    },
    {
      label: 'Clear Completed',
      icon: Trash,
      action: () => handleAction('clearCompleted', () => apiRequest('POST', '/api/downloads/clear-completed')),
      color: 'text-red-600',
      key: 'clearCompleted',
      disabled: !Array.isArray(downloads) || !downloads.some(d => d.status === 'completed')
    },
    {
      label: 'Pause All Downloads',
      icon: Pause,
      action: () => handleAction('pauseAll', async () => {
        if (!Array.isArray(downloads)) return { message: 'No downloads available' };

        const activeDownloads = downloads.filter(d => d.status === 'downloading');
        if (activeDownloads.length === 0) return { message: 'No active downloads to pause' };

        const promises = activeDownloads.map(d =>
          apiRequest('POST', `/api/downloads/${d.id}/cancel`)
        );
        await Promise.all(promises);
        return { message: 'All downloads paused' };
      }),
      color: 'text-yellow-600',
      key: 'pauseAll',
      disabled: !Array.isArray(downloads) || !downloads.some(d => d.status === 'downloading')
    },
    {
      label: 'Refresh Data',
      icon: RefreshCw,
      action: () => {
        fetchData();
        toast({
          title: "Refreshed",
          description: "Data has been refreshed",
          variant: "success"
        });
      },
      color: 'text-indigo-600',
      key: 'refresh'
    }
  ];

  const tabButtons = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'stats', label: 'Statistics', icon: BarChart3 },
    { id: 'actions', label: 'Actions', icon: Zap },
    { id: 'advanced', label: 'Advanced', icon: Target }
  ];

  return (
    <>
      <div className="w-full lg:w-80 h-auto lg:h-screen bg-transparent dark:bg-transparent p-4 space-y-6 mt-4 lg:mt-0">
        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Network Status */}
        {!isOnline && (
          <Card className="border-orange-200 dark:border-orange-800/50 bg-orange-50 dark:bg-orange-900/20">
            <CardContent className="p-4">
              <div className="flex items-center">
                <WifiOff className="w-5 h-5 text-orange-600 dark:text-orange-400 mr-3" />
                <div>
                  <h4 className="font-semibold text-orange-800 dark:text-orange-200">Offline</h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300">Downloads paused</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Status */}
        {systemStatus && (
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Server className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-white">System Status</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">v{systemStatus.version}</p>
                </div>
              </div>
              <Badge className={systemStatus.ytdlpAvailable ? "bg-green-500" : "bg-red-500"}>
                {systemStatus.ytdlpAvailable ? "Ready" : "Error"}
              </Badge>
            </div>
            {systemStatus.activeDownloads > 0 && (
              <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                {systemStatus.activeDownloads} active, {systemStatus.queuedDownloads} queued
              </div>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <div>
          <div className="p-2">
            <div className="grid grid-cols-2 gap-1">
              {tabButtons.map(tab => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(tab.id as any)}
                  className="flex flex-col h-16 text-xs"
                >
                  <tab.icon className="w-4 h-4 mb-1" />
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            <div className="pb-3 text-black dark:text-white">
              <h3 className="text-lg flex items-center font-semibold">
                <Settings className="mr-2 text-blue-600 dark:text-blue-400 w-5 h-5" />
                Download Settings
              </h3>
            </div>
            <div className="space-y-6">
              {/* Download Location */}
              <div>
                <Label className="text-sm font-medium mb-2 block dark:text-gray-300">Save Location</Label>
                <div className="flex gap-2">
                  <Input
                    value={settings.downloadPath || "~/Downloads/Videos"}
                    onChange={(e) => handleSettingChange("downloadPath", e.target.value)}
                    className="flex-1 dark:bg-modern-surface dark:border-white/10 dark:text-white"
                    placeholder="~/Downloads/Videos"
                    disabled={isLoading}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFolderPicker}
                    disabled={isLoading}
                  >
                    <Folder className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Concurrent Downloads */}
              <div>
                <Label className="text-sm font-medium mb-2 block dark:text-gray-300">
                  Concurrent Downloads: {settings.maxConcurrentDownloads || 3}
                </Label>
                <Slider
                  value={[settings.maxConcurrentDownloads || 3]}
                  onValueChange={(value) => handleSettingChange("maxConcurrentDownloads", value[0])}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                  disabled={isLoading}
                />
              </div>

              {/* Quality Settings */}
              <div>
                <Label className="text-sm font-medium mb-2 block dark:text-gray-300">Default Video Quality</Label>
                <Select
                  value={settings.downloadQuality || "1080p"}
                  onValueChange={(value) => handleSettingChange("downloadQuality", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2160p">4K Ultra HD (2160p)</SelectItem>
                    <SelectItem value="1440p">2K Quad HD (1440p)</SelectItem>
                    <SelectItem value="1080p">Full HD (1080p)</SelectItem>
                    <SelectItem value="720p">HD Ready (720p)</SelectItem>
                    <SelectItem value="480p">Standard (480p)</SelectItem>
                    <SelectItem value="best">Best Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Audio Quality */}
              <div>
                <Label className="text-sm font-medium mb-2 block dark:text-gray-300">Audio Quality</Label>
                <Select
                  value={settings.audioQuality || "320kbps"}
                  onValueChange={(value) => handleSettingChange("audioQuality", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="320kbps">High (320 kbps)</SelectItem>
                    <SelectItem value="256kbps">Medium (256 kbps)</SelectItem>
                    <SelectItem value="192kbps">Standard (192 kbps)</SelectItem>
                    <SelectItem value="128kbps">Low (128 kbps)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Switches */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium dark:text-gray-300">Auto Retry Failed Downloads</Label>
                  <Switch
                    checked={settings.autoRetry ?? true}
                    onCheckedChange={(checked) => handleSettingChange("autoRetry", checked)}
                    disabled={isLoading}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium dark:text-gray-300">Enable Notifications</Label>
                  <Switch
                    checked={settings.notificationsEnabled ?? true}
                    onCheckedChange={(checked) => handleSettingChange("notificationsEnabled", checked)}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            {/* Quick Stats */}
            <div>
              <div className="pb-3">
                <h3 className="text-lg flex items-center font-semibold">
                  <BarChart3 className="mr-2 text-green-600 w-5 h-5" />
                  Download Statistics
                </h3>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</div>
                    <div className="text-xs text-blue-800 dark:text-blue-300">Total</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</div>
                    <div className="text-xs text-green-800 dark:text-green-300">Completed</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.downloading}</div>
                    <div className="text-xs text-yellow-800 dark:text-yellow-300">Active</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</div>
                    <div className="text-xs text-red-800 dark:text-red-300">Failed</div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-white/10">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Success Rate</span>
                    <span className="font-medium text-green-600 dark:text-green-400">{successRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Queue Length</span>
                    <span className="font-medium dark:text-white">{stats.queued}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Downloaded</span>
                    <span className="font-medium dark:text-white">{(stats.totalSize / 1024).toFixed(1)} GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Max Concurrent</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">{systemStatus?.maxConcurrent || 3}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* System Info */}
            <div className="mt-4">
              <div className="pb-3 text-black dark:text-white">
                <h3 className="text-lg flex items-center font-semibold">
                  <Monitor className="mr-2 text-purple-600 dark:text-purple-400 w-5 h-5" />
                  System Status
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Database className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm dark:text-gray-300">yt-dlp Status</span>
                  </div>
                  <Badge className={systemStatus?.ytdlpAvailable ? "bg-green-500" : "bg-red-500"}>
                    {systemStatus?.ytdlpAvailable ? "Available" : "Missing"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Activity className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm dark:text-gray-300">Active Downloads</span>
                  </div>
                  <span className="font-medium dark:text-white">{systemStatus?.activeDownloads || 0}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm dark:text-gray-300">Queued Downloads</span>
                  </div>
                  <span className="font-medium dark:text-white">{systemStatus?.queuedDownloads || 0}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {isOnline ? <Wifi className="w-4 h-4 mr-2 text-green-500" /> : <WifiOff className="w-4 h-4 mr-2 text-red-500" />}
                    <span className="text-sm dark:text-gray-300">Network</span>
                  </div>
                  <Badge className={isOnline ? "bg-green-500" : "bg-red-500"}>
                    {isOnline ? "Online" : "Offline"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'actions' && (
          <div>
            <div className="pb-3 text-black dark:text-white">
              <h3 className="text-lg flex items-center font-semibold">
                <Zap className="mr-2 text-orange-600 dark:text-orange-400 w-5 h-5" />
                Quick Actions
              </h3>
            </div>
            <div>
              <div className="space-y-2">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="w-full justify-start h-12 hover:bg-gray-100 dark:hover:bg-white/5 dark:text-gray-300"
                    onClick={action.action}
                    disabled={action.disabled || actionLoading[action.key] || isLoading}
                  >
                    <action.icon className={`mr-3 w-4 h-4 ${action.color} ${actionLoading[action.key] ? 'animate-spin' : ''}`} />
                    <span className="text-sm">{action.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div>
            <div className="pb-3 text-black dark:text-white">
              <h3 className="text-lg flex items-center font-semibold">
                <Target className="mr-2 text-indigo-600 dark:text-indigo-400 w-5 h-5" />
                Advanced Settings
              </h3>
            </div>
            <div className="space-y-6">
              {/* Max Retries */}
              <div>
                <Label className="text-sm font-medium mb-2 block dark:text-gray-300">
                  Max Retry Attempts: {settings.maxRetries || 2}
                </Label>
                <Slider
                  value={[settings.maxRetries || 2]}
                  onValueChange={(value) => handleSettingChange("maxRetries", value[0])}
                  max={10}
                  min={0}
                  step={1}
                  className="w-full"
                  disabled={isLoading}
                />
              </div>

              {/* Cookie Management */}
              <div className="pt-4 border-t border-gray-100 dark:border-white/10">
                <Label className="text-sm font-medium mb-3 block dark:text-gray-300 flex items-center">
                  <Database className="w-4 h-4 mr-2 text-blue-600" />
                  YouTube Cookie Management
                </Label>
                
                {cookieStatus && (
                  <div className="mb-4 p-3 bg-modern-surface dark:bg-white/5 rounded-lg border dark:border-white/10">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-500">Status</span>
                      <Badge className={cookieStatus.exists ? "bg-green-500" : "bg-red-500"}>
                        {cookieStatus.exists ? "Active" : "Missing"}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">Session (HSID)</span>
                        <span className={cookieStatus.stats.hasHSID ? "text-green-600" : "text-red-600 font-bold"}>
                          {cookieStatus.stats.hasHSID ? "VALID ✅" : "MISSING ❌"}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">Session (SID)</span>
                        <span className={cookieStatus.stats.hasSID ? "text-green-600" : "text-red-600 font-bold"}>
                          {cookieStatus.stats.hasSID ? "VALID ✅" : "MISSING ❌"}
                        </span>
                      </div>
                    </div>
                    
                    {cookieStatus.exists && (
                      <div className="mt-2 text-[10px] text-gray-400">
                        Updated: {new Date(cookieStatus.lastUpdated!).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <textarea
                    placeholder="Paste cookies.txt content here..."
                    className="w-full h-24 p-2 text-xs rounded-md bg-white dark:bg-modern-surface border dark:border-white/10 dark:text-white resize-none"
                    value={cookieInput}
                    onChange={(e) => setCookieInput(e.target.value)}
                  />
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                    size="sm"
                    onClick={handleCookieUpload}
                    disabled={actionLoading['uploadCookies']}
                  >
                    {actionLoading['uploadCookies'] ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Database className="w-4 h-4 mr-2" />
                    )}
                    Upload Fresh Cookies
                  </Button>
                  <p className="text-[10px] text-gray-500 italic">
                    Tip: Use "Get cookies.txt" browser extension to export YouTube cookies.
                  </p>
                </div>
              </div>

              {/* Download Timeout */}
              <div>
                <Label className="text-sm font-medium mb-2 block dark:text-gray-300">
                  Download Timeout: {Math.floor((settings.downloadTimeout || 600) / 60)} minutes
                </Label>
                <Slider
                  value={[settings.downloadTimeout || 600]}
                  onValueChange={(value) => handleSettingChange("downloadTimeout", value[0])}
                  max={1800}
                  min={300}
                  step={60}
                  className="w-full"
                  disabled={isLoading}
                />
              </div>

              {/* Debug Info */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm flex items-center dark:text-gray-200">
                  <Cpu className="w-4 h-4 mr-2 text-purple-500" />
                  Debug Information
                </h4>

                <div className="text-xs space-y-1 p-3 text-gray-800 dark:text-gray-300">
                  <div>Version: {systemStatus?.version || 'Unknown'}</div>
                  <div>Max Concurrent: {systemStatus?.maxConcurrent || 'Unknown'}</div>
                  <div>Total Downloads: {systemStatus?.totalDownloads || 0}</div>
                  <div>Network Status: {isOnline ? 'Connected' : 'Disconnected'}</div>
                  <div>Last Updated: {new Date().toLocaleTimeString()}</div>
                </div>
              </div>

              {/* API Endpoints */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm flex items-center">
                  <Globe className="w-4 h-4 mr-2" />
                  API Status
                </h4>

                <div className="space-y-2">
                  {[
                    { name: 'Settings', endpoint: '/api/settings' },
                    { name: 'Downloads', endpoint: '/api/downloads' },
                    { name: 'System Status', endpoint: '/api/status' },
                    { name: 'Platforms', endpoint: '/api/supported-platforms' }
                  ].map((api) => (
                    <div key={api.endpoint} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{api.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {isOnline ? 'Available' : 'Offline'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Platform Support Info */}
        {supportedPlatforms && (
          <div className="p-4">
            <h4 className="font-medium text-sm mb-3 flex items-center text-black dark:text-gray-800">
              <Shield className="w-4 h-4 mr-2 text-blue-600" />
              Supported Platforms ({supportedPlatforms.total})
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {supportedPlatforms.platforms?.slice(0, 6).map((platform: any) => (
                <Badge
                  key={platform.name}
                  variant={platform.drmProtected ? "outline" : "secondary"}
                  className="justify-center"
                >
                  {platform.name}
                  {platform.drmProtected && "*"}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              * Limited to public content only
            </p>
            {supportedPlatforms.disclaimer && (
              <p className="text-xs text-blue-600 mt-1">
                ⚠️ {supportedPlatforms.disclaimer}
              </p>
            )}
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="p-4">
            <div className="flex items-center">
              <RefreshCw className="w-4 h-4 text-blue-600 mr-2 animate-spin" />
              <span className="text-sm text-blue-800">Loading data...</span>
            </div>
          </div>
        )}

        {/* Connection Status */}
        <div className="p-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-gray-600">
                {isOnline ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <span className="text-gray-500">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

export { AdvancedSidebar as Sidebar };