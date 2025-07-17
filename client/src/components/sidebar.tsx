import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Settings, BarChart3, Zap, FolderOpen, Trash, Pause, History, Folder } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DownloadSettings } from "@shared/schema";

export function Sidebar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery<DownloadSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: downloads = [] } = useQuery({
    queryKey: ["/api/downloads"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<DownloadSettings>) => {
      const response = await apiRequest("POST", "/api/settings", updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Updated",
        description: "Your download settings have been saved.",
      });
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

  const handleSettingChange = (key: keyof DownloadSettings, value: string) => {
    updateSettingsMutation.mutate({ [key]: value });
  };

  const stats = {
    total: downloads.length,
    completed: downloads.filter(d => d.status === "completed").length,
    downloading: downloads.filter(d => d.status === "downloading").length,
    failed: downloads.filter(d => d.status === "failed").length,
  };

  const successRate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      {/* Download Options */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Settings className="mr-2 text-material-blue" />
            Download Options
          </h3>
          
          <div className="space-y-4">
            {/* Quality Selection */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Video Quality
              </Label>
              <Select
                value={settings?.quality || "720p"}
                onValueChange={(value) => handleSettingChange("quality", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="best">Best Available</SelectItem>
                  <SelectItem value="1080p">1080p</SelectItem>
                  <SelectItem value="720p">720p</SelectItem>
                  <SelectItem value="480p">480p</SelectItem>
                  <SelectItem value="360p">360p</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Format Selection */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Format
              </Label>
              <Select
                value={settings?.format || "mp4"}
                onValueChange={(value) => handleSettingChange("format", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp4">MP4 (Video)</SelectItem>
                  <SelectItem value="webm">WebM (Video)</SelectItem>
                  <SelectItem value="mp3">MP3 (Audio Only)</SelectItem>
                  <SelectItem value="wav">WAV (Audio Only)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Download Location */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Save Location
              </Label>
              <div className="flex">
                <Input
                  value={settings?.downloadPath || "~/Downloads/Videos"}
                  onChange={(e) => handleSettingChange("downloadPath", e.target.value)}
                  className="rounded-r-none"
                />
                <Button 
                  variant="outline" 
                  className="rounded-l-none border-l-0"
                >
                  <Folder className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <BarChart3 className="mr-2 text-material-blue" />
            Statistics
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-material-gray-light">Total Downloads</span>
              <span className="font-medium">{stats.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-material-gray-light">Completed</span>
              <span className="font-medium">{stats.completed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-material-gray-light">Downloading</span>
              <span className="font-medium">{stats.downloading}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-material-gray-light">Success Rate</span>
              <span className="font-medium text-material-success">{successRate}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Zap className="mr-2 text-material-blue" />
            Quick Actions
          </h3>
          
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start">
              <FolderOpen className="mr-3 w-4 h-4 text-material-gray-light" />
              Open Downloads Folder
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => clearCompletedMutation.mutate()}
              disabled={clearCompletedMutation.isPending}
            >
              <Trash className="mr-3 w-4 h-4 text-material-gray-light" />
              Clear Completed
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Pause className="mr-3 w-4 h-4 text-material-gray-light" />
              Pause All Downloads
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <History className="mr-3 w-4 h-4 text-material-gray-light" />
              Download History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
