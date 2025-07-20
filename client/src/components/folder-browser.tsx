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

export function FolderBrowser({ isOpen, onClose, onSelectPath, currentPath = "/home/runner" }: FolderBrowserProps) {
  const [browsePath, setBrowsePath] = useState(currentPath === "~" ? "/home/runner" : currentPath);
  const [selectedPath, setSelectedPath] = useState(currentPath === "~" ? "/home/runner" : currentPath);

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
    const pathToSelect = browseData?.currentPath || browsePath;
    setSelectedPath(pathToSelect);
    onSelectPath(pathToSelect);
    onClose();
  };

  const handleConfirm = () => {
    onSelectPath(selectedPath);
    onClose();
  };

  const goHome = () => {
    setBrowsePath("/home/runner");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[600px]"
        aria-describedby="folder-browser-description"
      >
        <DialogHeader>
          <DialogTitle>Select Download Folder</DialogTitle>
        </DialogHeader>
        
        {/* Hidden description for accessibility */}
        <div id="folder-browser-description" className="sr-only">
          Browse and select a folder for downloading files. Navigate through directories and choose your preferred location.
        </div>

        <div className="space-y-4">
          {/* Navigation and Path Input */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goHome}
                className="flex-shrink-0 bg-gray-50 hover:bg-gray-100"
                title="Go to Home Directory"
              >
                <Home className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBrowsePath("/home/runner/Downloads")}
                className="flex-shrink-0 bg-green-50 hover:bg-green-100 border-green-200"
                title="Go to Downloads"
              >
                <Folder className="w-4 h-4 text-green-600" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBrowsePath("/home/runner/workspace")}
                className="flex-shrink-0 bg-purple-50 hover:bg-purple-100 border-purple-200"
                title="Go to Workspace"
              >
                <Folder className="w-4 h-4 text-purple-600" />
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Input
                value={selectedPath}
                onChange={(e) => setSelectedPath(e.target.value)}
                placeholder="Enter folder path or select from below..."
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectFolder}
                disabled={!browseData?.currentPath}
                className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                title="Use current folder"
              >
                <Check className="w-4 h-4 text-blue-600" />
              </Button>
            </div>
          </div>

          {/* Folder Browser */}
          <div className="border rounded-lg h-80 bg-white dark:bg-gray-800">
            <div className="p-3 border-b bg-blue-50 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
              <div className="flex items-center">
                <Folder className="w-4 h-4 mr-2 text-blue-600" />
                Current: {browseData?.currentPath || browsePath}
              </div>
            </div>
            
            <ScrollArea className="h-64">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  <Folder className="w-6 h-6 mx-auto mb-2 animate-pulse" />
                  Loading folders...
                </div>
              ) : (
                <div className="p-2">
                  {browseData?.folders.map((folder) => (
                    <div
                      key={folder.path}
                      className="flex items-center p-3 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors border-l-2 border-transparent hover:border-blue-500"
                      onClick={() => {
                        handleFolderClick(folder.path);
                        setSelectedPath(folder.path);
                      }}
                    >
                      {folder.name === ".." ? (
                        <FolderOpen className="w-4 h-4 mr-3 text-gray-500" />
                      ) : (
                        <Folder className="w-4 h-4 mr-3 text-blue-500" />
                      )}
                      <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {folder.name}
                      </span>
                      {folder.name !== ".." && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPath(folder.path);
                            onSelectPath(folder.path);
                            onClose();
                          }}
                        >
                          <Check className="w-3 h-3 text-green-600" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {browseData?.folders.length === 0 && (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                      <Folder className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      No folders found in this directory
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Click on a folder to navigate, or click the folder icon to select
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleConfirm}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Check className="w-4 h-4 mr-2" />
                Select This Folder
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}