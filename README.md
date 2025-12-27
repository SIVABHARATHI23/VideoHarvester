# VideoHarvester

A modern, full-stack video downloader app for YouTube, Instagram, and 1000+ platforms. VideoHarvester supports high-quality downloads (up to 4K), batch downloads, advanced options, and a beautiful, responsive UI for desktop, mobile, and TV.

VideoHarvester is a tool designed to help users efficiently harvest and manage video content from various sources.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue.svg)](https://www.typescriptlang.org/)

---

## 📋 Table of Contents

- [👀 Quick Start Preview](#-quick-start-preview)
- [🚀 Introduction](#-introduction)
- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🛠️ Installation](#️-installation)
- [⚙️ Configuration](#️-configuration)
- [📱 Platform Support](#-platform-support)
- [🖥️ Usage](#️-usage)
- [🔌 API Documentation](#-api-documentation)
- [❓ FAQ](#-faq)
- [🧰 Troubleshooting](#-troubleshooting)
- [🤝 Contributing](#-contributing)
- [📬 Contact](#-contact)
- [📝 License](#-license)

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

VideoHarvester is a tool designed to help users efficiently harvest and manage video content from various sources.

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

## 🏗️ Architecture

### **Frontend (React + TypeScript)**
- **Framework:** React 18.3.1 with TypeScript 5.6.3
- **UI Library:** Radix UI components with custom styling
- **Styling:** Tailwind CSS with custom design system
- **State Management:** React Query (TanStack Query) for server state
- **Routing:** Wouter for lightweight routing
- **Build Tool:** Vite for fast development and building
- **Icons:** Lucide React for consistent iconography

**Key Components:**
- `App.tsx` - Main application wrapper with providers
- `Home.tsx` - Main page with download form and queue
- `DownloadForm.tsx` - Video URL input and format selection
- `DownloadQueue.tsx` - Real-time download progress tracking
- `Sidebar.tsx` - Settings and additional features
- `VideoPlayer.tsx` - Built-in video preview player

### **Backend (Node.js + Express)**
- **Runtime:** Node.js with ES modules
- **Framework:** Express.js for REST API
- **Language:** TypeScript for type safety
- **WebSocket:** Native WebSocket support for real-time updates
- **Process Management:** Child process spawning for yt-dlp execution
- **File System:** Async file operations with streaming support
- **Database:** Drizzle ORM with PostgreSQL/Neon (optional)

**Key Modules:**
- `routes.ts` - Main API endpoints and WebSocket handling
- `storage.ts` - File storage and management
- `instagram-*.ts` - Instagram-specific extraction logic
- `vite.ts` - Vite integration for development

### **Core Technologies**
- **yt-dlp:** Primary video extraction engine
- **ffmpeg:** Audio/video processing and format conversion
- **WebSocket:** Real-time communication between frontend and backend
- **Express Sessions:** User session management
- **Passport.js:** Authentication system (if implemented)

---

## 🛠️ Installation

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- yt-dlp installed globally: `pip install yt-dlp`
- ffmpeg installed and in PATH (for audio/video processing)

### **Step-by-Step Setup**

1. **Clone the repository:**
   ```sh
   git clone https://github.com/SIVABHARATHI23/VideoHarvester.git
   cd VideoHarvester
   ```

2. **Install backend dependencies:**
   ```sh
   npm install
   ```

3. **Install frontend dependencies:**
   ```sh
   cd client
   npm install
   cd ..
   ```

4. **Start the backend server:**
   ```sh
   npm run dev
   ```

5. **Start the frontend (in a new terminal):**
   ```sh
   cd client
   npm run dev
   ```

6. **Open your browser:**
   - Frontend: [http://localhost:5173](http://localhost:5173) (Vite default)
   - Backend: [http://localhost:5000](http://localhost:5000)

### **Production Build**
```sh
# Build frontend
cd client && npm run build

# Build backend
npm run build

# Start production server
npm start
```

---

## ⚙️ Configuration

### **Environment Variables**
Create a `.env` file in the root directory:
```env
NODE_ENV=development
PORT=5000
DOWNLOAD_PATH=./downloads
MAX_CONCURRENT_DOWNLOADS=3
DOWNLOAD_TIMEOUT=900000
```

### **Settings Panel**
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

## 🔌 API Documentation

### **Base URL**
```
http://localhost:5000
```

### **REST API Endpoints**

#### **Video Analysis**
```http
POST /api/analyze
Content-Type: application/json

{
  "url": "https://youtube.com/watch?v=...",
  "platform": "youtube"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "Video Title",
    "platform": "youtube",
    "duration": "10:30",
    "thumbnail": "https://...",
    "formats": [
      {
        "formatId": "137",
        "height": 1080,
        "width": 1920,
        "fps": 30,
        "ext": "mp4"
      }
    ]
  }
}
```

#### **Start Download**
```http
POST /api/download
Content-Type: application/json

{
  "url": "https://youtube.com/watch?v=...",
  "format": "mp4",
  "quality": "1080p",
  "filename": "custom_name"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "status": "queued",
    "message": "Download added to queue"
  }
}
```

#### **Get Download Status**
```http
GET /api/downloads/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "status": "downloading",
    "progress": 45,
    "speed": "2.5 MB/s",
    "eta": "00:30"
  }
}
```

#### **Get All Downloads**
```http
GET /api/downloads
```

#### **Cancel Download**
```http
DELETE /api/downloads/:id
```

#### **Get Available Formats**
```http
GET /api/formats?url=https://youtube.com/watch?v=...
```

### **WebSocket API**

#### **Connection**
```javascript
const ws = new WebSocket('ws://localhost:5000');
```

#### **Message Types**

**Download Progress:**
```json
{
  "type": "download_progress",
  "data": {
    "id": 123,
    "progress": 75,
    "speed": "3.2 MB/s",
    "eta": "00:15"
  }
}
```

**Download Complete:**
```json
{
  "type": "download_complete",
  "data": {
    "id": 123,
    "filename": "video.mp4",
    "filepath": "/downloads/video.mp4",
    "filesize": "125MB"
  }
}
```

**Download Error:**
```json
{
  "type": "download_error",
  "data": {
    "id": 123,
    "error": "Video unavailable in selected quality"
  }
}
```

### **Error Responses**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Common Error Codes:**
- `INVALID_URL` - Malformed or unsupported URL
- `PLATFORM_NOT_SUPPORTED` - Platform not supported
- `QUALITY_NOT_AVAILABLE` - Requested quality not available
- `DOWNLOAD_FAILED` - Download process failed
- `FILE_TOO_LARGE` - File exceeds size limit

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

**Q: How does the WebSocket connection work?**
- The frontend establishes a WebSocket connection to the backend for real-time updates.
- All download progress, completion, and error messages are sent via WebSocket.
- The connection automatically reconnects if disconnected.

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
- **Port conflicts:**
  - Check if ports 5000 (backend) and 5173 (frontend) are available.
  - Modify the port in your configuration if needed.

---

## 🤝 Contributing

1. Fork the repo and create your branch: `git checkout -b feature/your-feature`
2. Install dependencies: `npm install && cd client && npm install`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -am 'Add new feature'`
5. Push to the branch: `git push origin feature/your-feature`
6. Open a pull request

**Development Guidelines:**
- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write tests for new features
- Update documentation for API changes
- Test on multiple platforms

---

## 📬 Contact
- **Issues:** Use the GitHub Issues tab for bug reports and feature requests.
- **Email:** [support@videoharvester.com](mailto:support@videoharvester.com)
- **Maintainer:** [SIVABHARATHI23](https://github.com/SIVABHARATHI23)

---

## 📝 License
MIT 

---

## 🙏 Acknowledgments
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - Video extraction engine
- [Radix UI](https://www.radix-ui.com/) - Accessible UI components
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [React Query](https://tanstack.com/query) - Server state management 


_Last updated: August 26, 2025_
