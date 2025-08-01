# VideoHarvester

A modern, full-stack video downloader app for YouTube, Instagram, and 1000+ platforms. VideoHarvester supports high-quality downloads (up to 4K), batch downloads, advanced options, and a beautiful, responsive UI for desktop, mobile, and TV.

---

## 👀 Quick Start Preview

**How to use VideoHarvester to download a video (first-time user guide):**

1. **Paste the Video URL**
   - Copy the link of the video you want to download (e.g., from YouTube, Instagram, etc.).
   - Paste it into the main input box at the top of the app.

2. **Choose Format & Quality**
   - Select your desired output format (e.g., MP4, MP3) and video quality (e.g., 4K, 1080p) from the options below the input.

3. **(Optional) Advanced Options**
   - Click "Advanced Options" to trim the video, select codecs, download subtitles, or set a custom filename.

4. **Analyze the Video**
   - Click the "Analyze" button. The app will fetch video info and show a preview (title, duration, platform, etc.).

5. **Start the Download**
   - Click the "Download" button. The video will be added to the download queue.
   - You can track progress in the Download Queue section.

6. **Save the File**
   - Once the download is complete, click the "Save" button to download the file to your device (browser default folder).

7. **Batch Download**
   - For multiple videos, open "Batch Download Mode", paste URLs (one per line), and click "Download All".

**Tips for First-Time Users:**
- For best results with YouTube 4K/HD, provide your cookies (see Configuration section).
- The app works on mobile, desktop, and TV screens.
- Use the Settings panel (gear icon) to set your default preferences.
- If you see an error, check the Troubleshooting and FAQ sections below.

---

## 🚀 Introduction
VideoHarvester is your all-in-one solution for downloading videos and audio from popular platforms. It is designed for power users and beginners alike, with a focus on speed, reliability, and a modern user experience.

---

## ✨ Features
- **Multi-Platform Support:** Download from YouTube, Instagram, TikTok, Twitter, Facebook, Vimeo, and more.
- **High-Quality Downloads:** Choose from 4K, 2K, 1080p, 720p, and other resolutions.
- **Audio & Video Formats:** Download as MP4, WebM, MP3, WAV, GIF, and more.
- **Batch Download Mode:** Paste multiple URLs and download all at once.
- **Download Queue:** Track progress, pause, retry, and remove downloads.
- **Advanced Options:**
  - Select audio/video codecs
  - Trim start/end time
  - Download subtitles
  - Save thumbnails
  - Custom filename
  - Preserve metadata
- **Responsive UI:** Works on mobile, tablets, TV, and big screens.
- **Dark/Light Mode:** Toggle between beautiful themes.
- **Settings Panel:** Set default quality, format, notifications, and more.
- **Live Progress:** Real-time updates via WebSocket.
- **Error Handling:** Clear messages for DRM, unavailable qualities, and network issues.

---

## 🛠️ Installation

1. **Clone the repository:**
   ```sh
   git clone <your-repo-url>
   cd VideoHarvester
   ```
2. **Install backend dependencies:**
   ```sh
   npm install
   ```
3. **Start the backend:**
   ```sh
   npm run dev
   ```
4. **Install frontend dependencies:**
   ```sh
   cd client
   npm install
   ```
5. **Start the frontend:**
   ```sh
   npm run dev
   ```
6. **Open your browser:**
   - Go to [http://localhost:5000](http://localhost:5000)

---

## ⚙️ Configuration

### **Settings**
- Access the settings panel from the header.
- Set default download quality, format, notifications, and more.
- Change the download save location (server-side).

### **YouTube Cookies for 4K/HD**
- Some YouTube videos require login/cookies for 4K/HD.
- Export your cookies using a browser extension (e.g., EditThisCookie).
- Save as `www.youtube.com_cookies.txt` in the project root.
- The app will use these cookies for higher quality downloads.

### **Advanced Options**
- Click "Advanced Options" in the download form to:
  - Select audio/video codecs
  - Trim video (start/end time)
  - Download subtitles
  - Save thumbnail
  - Set custom filename
  - Preserve or remove metadata

---

## 📱 Platform Support
- **YouTube:** Full support, including playlists and 4K (with cookies)
- **Instagram:** Reels, posts, stories (public content)
- **TikTok:** Videos (no watermark)
- **Twitter/X:** Videos, GIFs
- **Facebook:** Public videos
- **Vimeo:** All videos
- **Hotstar, JioCinema, SonyLiv, Zee5:** Free/public content only (DRM-protected content not supported)

---

## 🖥️ Usage

1. **Paste a video URL** into the main input.
2. **Choose format and quality** (e.g., MP4, 4K).
3. **(Optional) Open Advanced Options** for more control.
4. **Click "Analyze"** to fetch video info.
5. **Click "Download"** to start downloading.
6. **Track progress** in the Download Queue.
7. **Click "Save"** to download the file to your device (browser default folder).
8. **Batch Download:** Paste multiple URLs in Batch Mode.

---

## ❓ FAQ

**Q: Why do I only get 360p when I select 4K?**
- The video may not have a 4K stream, or you may need to provide YouTube cookies.
- Some videos require login or are region/age restricted.
- Check the actual file resolution after download.

**Q: Where are my downloads saved?**
- The browser always saves to your default download folder. The server save path is for reference only.

**Q: Why do I get a WebSocket error?**
- Make sure your dev server is running and you are not running multiple Vite servers.
- Hard refresh your browser (Ctrl+Shift+R) if you see `ws://localhost:undefined` errors.

**Q: Can I download DRM-protected content?**
- No. DRM-protected content (e.g., Netflix, premium Hotstar) is not supported for legal reasons.

**Q: How do I update yt-dlp?**
- Run `pip install -U yt-dlp` or download the latest binary from the [yt-dlp GitHub](https://github.com/yt-dlp/yt-dlp).

---

## 🧰 Troubleshooting
- **WebSocket errors:**
  - Restart your dev server and hard refresh your browser.
- **4K downloads only get 360p:**
  - Provide YouTube cookies, or try another video.
- **Downloads not saving to the expected folder:**
  - The browser always saves to your default download folder.
- **DRM errors:**
  - Only public/free content is supported.
- **ffprobe not found:**
  - Make sure ffprobe is installed and in your PATH for resolution detection.

---

## 🤝 Contributing

1. Fork the repo and create your branch: `git checkout -b feature/your-feature`
2. Commit your changes: `git commit -am 'Add new feature'`
3. Push to the branch: `git push origin feature/your-feature`
4. Open a pull request

---

## 📬 Contact
- **Issues:** Use the GitHub Issues tab for bug reports and feature requests.
- **Email:** [your-email@example.com]
- **Maintainer:** [Your Name]

---

## 📝 License
MIT 

