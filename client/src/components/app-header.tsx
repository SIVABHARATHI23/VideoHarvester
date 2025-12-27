import { Settings, HelpCircle, Download, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export function AppHeader() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const [settingsOpen, setSettingsOpen] = useState(false);
  // Settings state
  const [defaultQuality, setDefaultQuality] = useState('720p');
  const [defaultFormat, setDefaultFormat] = useState('mp4');
  const [showNotifications, setShowNotifications] = useState(true);
  const [autoClear, setAutoClear] = useState(false);

  const [helpOpen, setHelpOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return typeof window !== 'undefined' && !localStorage.getItem('vh_onboarding_seen');
  });
  const [onboardingStep, setOnboardingStep] = useState(0);

  useEffect(() => {
    if (showOnboarding) {
      localStorage.setItem('vh_onboarding_seen', '1');
    }
  }, [showOnboarding]);

  const onboardingSteps = [
    {
      title: 'Welcome to VideoHarvester',
      desc: 'Download videos and audio from YouTube, Instagram platforms. This quick tour will show you how to use the app.'
    },
    {
      title: 'Paste the Video URL',
      desc: 'Copy a video link (YouTube, Instagram, etc.) and paste it in the main input box at the top.'
    },
    {
      title: 'Choose Format & Quality',
      desc: 'Select your desired output format (MP4, MP3, etc.) and video quality (4K, 1080p, etc.) from the options.'
    },
    {
      title: 'Advanced Options',
      desc: 'Click "Advanced Options" for trimming, codecs, subtitles, or custom filename.'
    },
    {
      title: 'Analyze & Download',
      desc: 'Click "Analyze" to fetch video info, then "Download" to add the video to the queue and track progress.'
    },
    {
      title: 'Save the File',
      desc: 'When the download is complete, click "Save" to download the file to your device (browser default folder).'
    },
    {
      title: 'Batch Download',
      desc: 'Use "Batch Download Mode" for multiple URLs. Paste URLs (one per line) and click "Download All".'
    },
    {
      title: 'Settings & Tips',
      desc: 'Use the gear icon to set your default preferences. For best YouTube 4K/HD results, provide your cookies (see Settings).'
    },
    {
      title: 'You are ready!',
      desc: 'Enjoy using VideoHarvester! You can re-open this guide anytime from the Help menu.'
    }
  ];

  return (
    <header className="glass-card-premium sticky top-0 z-50 border-b border-white/10 animate-slide-down">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-purple-blue rounded-xl flex items-center justify-center shadow-glow-purple animate-pulse-glow group hover-scale">
              <Download className="text-white w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-gradient-purple-blue drop-shadow-lg tracking-tight">
              <span className="hidden sm:inline">YouTube & Video Downloader</span>
              <span className="sm:hidden">VideoHarvester</span>
            </h1>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-3">
            <button
              onClick={toggleTheme}
              className="glass-button hover-lift hover-glow touch-target p-2 sm:p-3 text-gray-700 dark:text-white transition-all duration-300 rounded-lg"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <button
                  className="glass-button hover-lift hover-glow touch-target p-2 sm:p-3 text-gray-700 dark:text-white transition-all duration-300 rounded-lg"
                  onClick={() => setSettingsOpen(true)}
                  title="Settings"
                >
                  <Settings className="w-4 h-4 sm:w-5 sm:h-5 hover:rotate-90 transition-transform duration-300" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-sm mx-4 sm:mx-auto text-left space-y-4 bg-white/95 dark:bg-modern-surface/95 backdrop-blur-xl border border-white/10 dark:border-white/5 shadow-2xl">
                <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Settings</h2>
                {/* 1. Dark Mode toggle (already handled by header button) */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Dark Mode Appearance</span>
                  <button
                    onClick={toggleTheme}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${isDark ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <span className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-300 ${isDark ? 'translate-x-6' : ''}`}></span>
                  </button>
                </div>
                {/* 2. Default Download Quality */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Default Quality</span>
                  <select
                    value={defaultQuality}
                    onChange={e => setDefaultQuality(e.target.value)}
                    className="border rounded px-2 py-1 bg-white dark:bg-modern-surface-alt border-gray-200 dark:border-white/10 text-gray-700 dark:text-white"
                  >
                    <option value="2160p">2160p (4K)</option>
                    <option value="1440p">1440p (2K)</option>
                    <option value="1080p">1080p (Full HD)</option>
                    <option value="720p">720p (HD)</option>
                    <option value="480p">480p (SD)</option>
                    <option value="360p">360p (Low)</option>
                  </select>
                </div>
                {/* 3. Default Format */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Default Format</span>
                  <select
                    value={defaultFormat}
                    onChange={e => setDefaultFormat(e.target.value)}
                    className="border rounded px-2 py-1 bg-white dark:bg-modern-surface-alt border-gray-200 dark:border-white/10 text-gray-700 dark:text-white"
                  >
                    <option value="mp4">MP4</option>
                    <option value="mp3">MP3</option>
                    <option value="webm">WebM</option>
                    <option value="wav">WAV</option>
                    <option value="gif">GIF</option>
                  </select>
                </div>
                {/* 4. Show Notifications toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Show Notifications</span>
                  <button
                    onClick={() => setShowNotifications(v => !v)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${showNotifications ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <span className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-300 ${showNotifications ? 'translate-x-6' : ''}`}></span>
                  </button>
                </div>
                {/* 5. Auto-clear Completed Downloads toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Auto-clear Completed</span>
                  <button
                    onClick={() => setAutoClear(v => !v)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${autoClear ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <span className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-300 ${autoClear ? 'translate-x-6' : ''}`}></span>
                  </button>
                </div>
                <button onClick={() => setSettingsOpen(false)} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg w-full">Close</button>
              </DialogContent>
            </Dialog>
            <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
              <DialogContent className="max-w-lg mx-4 sm:mx-auto text-left space-y-6 bg-white/95 dark:bg-modern-surface/95 backdrop-blur-xl border border-white/10 dark:border-white/5 shadow-2xl">
                <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{onboardingSteps[onboardingStep].title}</h2>
                <div className="text-base mb-4 text-gray-700 dark:text-gray-300">{onboardingSteps[onboardingStep].desc}</div>
                <div className="flex justify-between mt-6">
                  <button
                    onClick={() => setOnboardingStep((s) => Math.max(0, s - 1))}
                    className="px-4 py-2 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                    disabled={onboardingStep === 0}
                  >
                    Back
                  </button>
                  {onboardingStep < onboardingSteps.length - 1 ? (
                    <button
                      onClick={() => setOnboardingStep((s) => Math.min(onboardingSteps.length - 1, s + 1))}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow-lg shadow-blue-500/20 transition-all"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowOnboarding(false)}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 shadow-lg shadow-green-500/20 transition-all"
                    >
                      Done
                    </button>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
              <DialogTrigger asChild>
                <button
                  className="bg-blue-500/20 hover:bg-blue-400 hover-lift touch-target p-2 sm:p-3 text-white hover:text-white transition-all duration-300 rounded-lg border border-blue-400/30"
                  onClick={() => setHelpOpen(true)}
                  title="Help"
                >
                  <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-sm mx-4 sm:mx-auto text-center bg-white/95 dark:bg-modern-surface/95 backdrop-blur-xl border border-white/10 dark:border-white/5 shadow-2xl">
                <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Help & Support</h2>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-4 border border-blue-100 dark:border-blue-800/50">
                  <p className="text-blue-800 dark:text-blue-300 text-sm">Need help or found a bug? We're here to help!</p>
                </div>
                <button onClick={() => setShowOnboarding(true)} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg w-full hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20">Show How to Use</button>
                <button onClick={() => setHelpOpen(false)} className="mt-2 px-4 py-2 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors w-full">Close</button>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </header>
  );
}
