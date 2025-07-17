import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Download, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AlternativeMethodsProps {
  url: string;
  onClose: () => void;
}

export function AlternativeMethods({ url, onClose }: AlternativeMethodsProps) {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard",
    });
  };

  return (
    <Card className="glass-card border-0 max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-xl">
          <AlertCircle className="w-5 h-5 text-blue-500" />
          Instagram Download Alternatives
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center text-sm text-modern-muted mb-4">
          Instagram blocks automated downloads. Here are proven alternative methods:
        </div>

        <div className="space-y-3">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Method 1: Browser Extension</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
              Use "Video Downloader" browser extension - works directly in your browser
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://chrome.google.com/webstore/search/video%20downloader', '_blank')}
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Get Browser Extension
            </Button>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Method 2: Online Tools</h3>
            <p className="text-sm text-green-700 dark:text-green-300 mb-3">
              Paste your Instagram URL into online Instagram downloaders
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(url)}
                className="flex-1"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy URL
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://snapinsta.app/', '_blank')}
                className="flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Tool
              </Button>
            </div>
          </div>

          <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">Method 3: Screen Recording</h3>
            <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
              Use built-in screen recording (Windows: Win+G, Mac: Cmd+Shift+5)
            </p>
            <Badge variant="secondary" className="text-xs">
              Works for any video, 100% reliable
            </Badge>
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <p className="text-xs text-modern-muted text-center mb-3">
            Try YouTube, TikTok, or Twitter instead - they work perfectly in our app!
          </p>
          <Button onClick={onClose} className="w-full" variant="outline">
            Try Different Platform
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}