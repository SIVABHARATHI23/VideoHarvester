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
    <header className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 dark:from-gray-800 dark:via-gray-900 dark:to-black shadow-2xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-500 dark:bg-yellow-400 dark:border-2 dark:border-white rounded-xl flex items-center justify-center animate-pulse-glow shadow-lg">
              <Download className="text-white dark:text-blue-900 w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-black dark:text-white drop-shadow-lg tracking-tight animate-slide-up">
              YouTube & Video Downloader
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={toggleTheme}
              className="bg-blue-500/20 hover:bg-blue-400 hover-lift p-3 text-white hover:text-white transition-all duration-300 rounded-lg border border-blue-400/30"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <button
                  className="bg-blue-500/20 hover:bg-blue-400 hover-lift p-3 text-white hover:text-white transition-all duration-300 rounded-lg border border-blue-400/30"
                  onClick={() => setSettingsOpen(true)}
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-sm mx-auto text-left space-y-4">
                <h2 className="text-xl font-semibold mb-2">Settings</h2>
                {/* 1. Dark Mode toggle (already handled by header button) */}
                <div className="flex items-center justify-between">
                  <span>Dark Mode</span>
                  <button
                    onClick={toggleTheme}
                    className={`w-12 h-6 flex items-center rounded-full p-1 ${isDark ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <span className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${isDark ? 'translate-x-6' : ''}`}></span>
                  </button>
                </div>
                {/* 2. Default Download Quality */}
                <div className="flex items-center justify-between">
                  <span>Default Quality</span>
                  <select
                    value={defaultQuality}
                    onChange={e => setDefaultQuality(e.target.value)}
                    className="border rounded px-2 py-1 bg-white text-gray-700"
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
                <div className="flex items-center justify-between">
                  <span>Default Format</span>
                  <select
                    value={defaultFormat}
                    onChange={e => setDefaultFormat(e.target.value)}
                    className="border rounded px-2 py-1 bg-white text-gray-700"
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
                  <span>Show Notifications</span>
                  <button
                    onClick={() => setShowNotifications(v => !v)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 ${showNotifications ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <span className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${showNotifications ? 'translate-x-6' : ''}`}></span>
                  </button>
                </div>
                {/* 5. Auto-clear Completed Downloads toggle */}
                <div className="flex items-center justify-between">
                  <span>Auto-clear Completed</span>
                  <button
                    onClick={() => setAutoClear(v => !v)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 ${autoClear ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <span className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${autoClear ? 'translate-x-6' : ''}`}></span>
                  </button>
                </div>
                <button onClick={() => setSettingsOpen(false)} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg w-full">Close</button>
              </DialogContent>
            </Dialog>
            <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
              <DialogContent className="max-w-lg mx-auto text-left space-y-6">
                <h2 className="text-2xl font-bold mb-2">{onboardingSteps[onboardingStep].title}</h2>
                <div className="text-base mb-4">{onboardingSteps[onboardingStep].desc}</div>
                <div className="flex justify-between mt-6">
                  <button
                    onClick={() => setOnboardingStep((s) => Math.max(0, s - 1))}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg"
                    disabled={onboardingStep === 0}
                  >
                    Back
                  </button>
                  {onboardingStep < onboardingSteps.length - 1 ? (
                    <button
                      onClick={() => setOnboardingStep((s) => Math.min(onboardingSteps.length - 1, s + 1))}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowOnboarding(false)}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg"
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
                  className="bg-blue-500/20 hover:bg-blue-400 hover-lift p-3 text-white hover:text-white transition-all duration-300 rounded-lg border border-blue-400/30"
                  onClick={() => setHelpOpen(true)}
                  title="Help"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-sm mx-auto text-center">
                <h2 className="text-xl font-semibold mb-2">Help & Support</h2>
                <p className="text-gray-600 mb-4">Coming soon!</p>
                <button onClick={() => setShowOnboarding(true)} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg w-full">Show How to Use</button>
                <button onClick={() => setHelpOpen(false)} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg">Close</button>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </header>
  );
}
