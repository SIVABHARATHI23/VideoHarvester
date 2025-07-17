import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, FolderOpen, Home, Check, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface FolderBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPath: (path: string) => void;
  currentPath?: string;
}

interface FolderItem {
  name: string;
  path: string;
  type: 'folder';
}

interface BrowseResponse {
  currentPath: string;
  folders: FolderItem[];
}

export function FolderBrowser({ isOpen, onClose, onSelectPath, currentPath = "~" }: FolderBrowserProps) {
  const [browsePath, setBrowsePath] = useState(currentPath);
  const [selectedPath, setSelectedPath] = useState(currentPath);

  const { data: browseData, isLoading } = useQuery<BrowseResponse>({
    queryKey: ["/api/browse", browsePath],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/browse?path=${encodeURIComponent(browsePath)}`);
      return response.json();
    },
    enabled: isOpen,
  });

  const handleFolderClick = (folderPath: string) => {
    setBrowsePath(folderPath);
  };

  const handleSelectFolder = () => {
    setSelectedPath(browseData?.currentPath || browsePath);
  };

  const handleConfirm = () => {
    onSelectPath(selectedPath);
    onClose();
  };

  const goHome = () => {
    setBrowsePath("~");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[600px]">
        <DialogHeader>
          <DialogTitle>Select Download Folder</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Path Input */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goHome}
              className="flex-shrink-0"
            >
              <Home className="w-4 h-4" />
            </Button>
            <Input
              value={selectedPath}
              onChange={(e) => setSelectedPath(e.target.value)}
              placeholder="Enter folder path..."
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectFolder}
              disabled={!browseData?.currentPath}
            >
              <FolderOpen className="w-4 h-4" />
            </Button>
          </div>

          {/* Folder Browser */}
          <div className="border rounded-lg h-80">
            <div className="p-3 border-b bg-gray-50 text-sm font-medium">
              Current: {browseData?.currentPath || browsePath}
            </div>
            
            <ScrollArea className="h-64">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  Loading folders...
                </div>
              ) : (
                <div className="p-2">
                  {browseData?.folders.map((folder) => (
                    <div
                      key={folder.path}
                      className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer"
                      onClick={() => handleFolderClick(folder.path)}
                    >
                      <Folder className="w-4 h-4 mr-3 text-blue-500" />
                      <span className="flex-1 text-sm">{folder.name}</span>
                    </div>
                  ))}
                  {browseData?.folders.length === 0 && (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No folders found
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleConfirm}>
              <Check className="w-4 h-4 mr-2" />
              Select Folder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}