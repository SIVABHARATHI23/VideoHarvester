import { Card } from "@/components/ui/card";
import { Zap, Crown, Globe } from "lucide-react";

export function FeatureHighlights() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Card className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/10 dark:to-blue-900/20 border-0 hover-lift group bg-white/5 dark:bg-black/20 backdrop-blur-md">
                <Zap className="w-12 h-12 mx-auto mb-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-lg font-semibold mb-2 text-black dark:text-white">Lightning Fast</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Advanced multi-threaded downloading for maximum speed</p>
            </Card>

            <Card className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/10 dark:to-purple-900/20 border-0 hover-lift group bg-white/5 dark:bg-black/20 backdrop-blur-md">
                <Crown className="w-12 h-12 mx-auto mb-4 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-lg font-semibold mb-2 text-black dark:text-white">Premium Quality</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Support for 4K, HDR, and lossless audio formats</p>
            </Card>

            <Card className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/10 dark:to-green-900/20 border-0 hover-lift group bg-white/5 dark:bg-black/20 backdrop-blur-md">
                <Globe className="w-12 h-12 mx-auto mb-4 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-lg font-semibold mb-2 text-black dark:text-white">Universal Support</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Works with 1000+ platforms and video streaming sites</p>
            </Card>
        </div>
    );
}
