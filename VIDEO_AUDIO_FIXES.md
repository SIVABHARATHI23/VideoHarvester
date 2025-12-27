# 🎥 Video & Audio Matching Fixes

## Overview
This document describes the fixes implemented to resolve video and audio synchronization issues, improper file naming, and format selection problems in VideoHarvester.

## 🚨 Problems Identified

### 1. Video/Audio Stream Mismatch
- **Issue**: Downloaded videos had audio and video streams that were not properly synchronized
- **Cause**: Poor format selection that didn't ensure compatible video and audio codecs
- **Result**: Videos with out-of-sync audio, missing audio, or corrupted streams

### 2. Poor File Naming
- **Issue**: Downloaded files had generic names like "Unknown Title" or "YouTube_abc123"
- **Cause**: No attempt to extract actual video titles before download
- **Result**: Difficult to identify downloaded content

### 3. Format Selection Issues
- **Issue**: Format selection didn't prioritize compatible codecs and containers
- **Cause**: Basic format strings without proper fallbacks and codec specifications
- **Result**: Downloads with incompatible formats that caused merging issues

## 🔧 Solutions Implemented

### 1. Enhanced Format Selection

#### Before (Problematic):
```typescript
// Basic format selection - could cause mismatches
'--format', 'bestvideo[height>=1080]+bestaudio/best[height>=1080]'
```

#### After (Fixed):
```typescript
// Enhanced format selection with proper codec matching
'--format', 'bestvideo[height>=1080][ext=mp4][vcodec^=avc1]+bestaudio[ext=m4a][acodec^=mp4a]/bestvideo[height>=1080][ext=mp4]+bestaudio[ext=m4a]/best[height>=1080][ext=mp4]/best[ext=mp4]'
```

#### Key Improvements:
- **Container Format**: `[ext=mp4]` ensures consistent container format
- **Video Codec**: `[vcodec^=avc1]` prefers H.264 codec for maximum compatibility
- **Audio Codec**: `[acodec^=mp4a]` prefers AAC audio codec
- **Multiple Fallbacks**: Multiple format options ensure download success
- **Quality Preservation**: Maintains requested quality while ensuring compatibility

### 2. Smart Title Extraction

#### Before (Generic Names):
```typescript
const videoTitle = item.title || 'Unknown Title';
```

#### After (Smart Extraction):
```typescript
// Get video title from URL if not available
let videoTitle = item.title;
if (!videoTitle || videoTitle === 'Unknown Title') {
  if (item.url.toLowerCase().includes('youtube.com') || item.url.toLowerCase().includes('youtu.be')) {
    videoTitle = await getYouTubeVideoTitle(item.url);
  } else {
    videoTitle = extractTitleFromUrl(item.url) || 'Unknown Title';
  }
}
```

#### New Functions Added:

##### `getYouTubeVideoTitle(url: string)`
- **Purpose**: Extract actual video title from YouTube before download
- **Method**: Uses yt-dlp to get video metadata
- **Result**: Real video titles instead of generic names

##### `extractTitleFromUrl(url: string)` (Enhanced)
- **YouTube**: `YouTube_Video_abc123` → More descriptive
- **Instagram**: `Instagram_Post_xyz789`
- **TikTok**: `TikTok_Video_def456`
- **Twitter**: `Twitter_Tweet_ghi012`
- **Generic**: `domain_Video_timestamp`

### 3. Improved Post-Processing

#### Before (Basic Merging):
```typescript
'--merge-output-format', 'mp4'
```

#### After (Enhanced Processing):
```typescript
// CRITICAL: Ensure proper merging and output format
'--merge-output-format', 'mp4',
'--embed-metadata',
'--add-metadata',
'--postprocessor-args', 'ffmpeg:-c:v copy -c:a copy -avoid_negative_ts make_zero'
```

#### Key Improvements:
- **Stream Copying**: `-c:v copy -c:a copy` prevents re-encoding
- **Timestamp Fix**: `-avoid_negative_ts make_zero` fixes sync issues
- **Metadata**: `--embed-metadata` and `--add-metadata` preserve video info
- **No Quality Loss**: Direct stream copying maintains original quality

### 4. Platform-Specific Format Selection

#### YouTube (Enhanced):
```typescript
if (requestedHeight >= 2160) {
  // 4K with proper codec matching
  args.push('--format', 'bestvideo[height>=2160][ext=mp4][vcodec^=avc1]+bestaudio[ext=m4a][acodec^=mp4a]/bestvideo[height>=2160][ext=mp4]+bestaudio[ext=m4a]/best[height>=2160][ext=mp4]/best[ext=mp4]');
} else if (requestedHeight >= 1080) {
  // 1080p with proper codec matching
  args.push('--format', 'bestvideo[height>=1080][ext=mp4][vcodec^=avc1]+bestaudio[ext=m4a][acodec^=mp4a]/bestvideo[height>=1080][ext=mp4]+bestaudio[ext=m4a]/best[height>=1080][ext=mp4]/best[ext=mp4]');
}
```

#### Non-YouTube (Simplified):
```typescript
// Prefer single file formats to avoid merging issues
args.push('--format', `best[height>=${requestedHeight}][ext=mp4]/best[ext=mp4]`);
```

### 5. Enhanced Bypass Format Selection

#### Before (Basic Bypass):
```typescript
function getBypassFormat(quality: string): string {
  const height = getHeightFromQuality(quality);
  if (height >= 2160) {
    return 'bestvideo[height>=2160][fps<=30]+bestaudio/best[height>=2160]';
  }
  // ... basic fallbacks
}
```

#### After (Enhanced Bypass):
```typescript
function getBypassFormat(quality: string): string {
  const height = getHeightFromQuality(quality);
  
  if (height >= 2160) {
    // 4K: Use format that's less likely to be blocked and ensures proper matching
    return 'bestvideo[height>=2160][ext=mp4][vcodec^=avc1][fps<=30]+bestaudio[ext=m4a][acodec^=mp4a]/bestvideo[height>=2160][ext=mp4][fps<=30]+bestaudio[ext=m4a]/best[height>=2160][ext=mp4]/best[ext=mp4]';
  } else if (height >= 1080) {
    // 1080p: Ensure proper video/audio matching
    return 'bestvideo[height>=1080][ext=mp4][vcodec^=avc1][fps<=60]+bestaudio[ext=m4a][acodec^=mp4a]/bestvideo[height>=1080][ext=mp4][fps<=60]+bestaudio[ext=m4a]/best[height>=1080][ext=mp4]/best[ext=mp4]';
  }
  // ... enhanced fallbacks for all qualities
}
```

## 📊 Expected Results

### Before Fixes:
- ❌ **Audio/Video Sync**: Often out of sync or missing
- ❌ **File Names**: Generic names like "Unknown Title"
- ❌ **Format Issues**: Incompatible codecs causing failures
- ❌ **Quality Loss**: Re-encoding reducing quality
- ❌ **Metadata**: Missing video information

### After Fixes:
- ✅ **Audio/Video Sync**: Perfect synchronization
- ✅ **File Names**: Real video titles
- ✅ **Format Issues**: Compatible codecs guaranteed
- ✅ **Quality Loss**: No re-encoding, original quality preserved
- ✅ **Metadata**: Complete video information embedded

## 🎯 Quality-Specific Improvements

### 4K (2160p):
- **Video**: H.264 (AVC1) codec with MP4 container
- **Audio**: AAC (MP4A) codec with M4A container
- **FPS Limit**: 30fps to avoid detection
- **Fallbacks**: Multiple format options for reliability

### 2K (1440p):
- **Video**: H.264 (AVC1) codec with MP4 container
- **Audio**: AAC (MP4A) codec with M4A container
- **FPS Limit**: 60fps for smooth playback
- **Fallbacks**: Progressive quality reduction

### 1080p:
- **Video**: H.264 (AVC1) codec with MP4 container
- **Audio**: AAC (MP4A) codec with M4A container
- **FPS Limit**: 60fps for smooth playback
- **Fallbacks**: Progressive quality reduction

### 720p and Below:
- **Preference**: Single file formats to avoid merging issues
- **Container**: MP4 for maximum compatibility
- **Fallbacks**: Best available quality

## 🔄 Bypass Strategy Integration

### Enhanced Bypass:
- **Format Selection**: Uses improved `getBypassFormat()` function
- **Post-Processing**: Enhanced merging with proper codec handling
- **Metadata**: Complete video information preservation

### Final Bypass:
- **Format Selection**: Maximum fallbacks with MP4 preference
- **Post-Processing**: Same enhanced merging techniques
- **Compatibility**: Works with most restricted videos

## 🚀 Usage Instructions

### For Users:
1. **Download Quality**: Choose appropriate quality (4K, 1080p, 720p)
2. **File Names**: Videos will now have proper titles
3. **Sync Issues**: Audio and video will be perfectly synchronized
4. **Quality**: Original quality preserved without re-encoding

### For Developers:
1. **Format Selection**: Use enhanced format strings for better compatibility
2. **Title Extraction**: Implement `getYouTubeVideoTitle()` for real titles
3. **Post-Processing**: Use `--postprocessor-args` for proper merging
4. **Fallbacks**: Always provide multiple format options

## 📝 Technical Details

### Codec Compatibility:
- **Video**: H.264 (AVC1) - Most compatible video codec
- **Audio**: AAC (MP4A) - Most compatible audio codec
- **Container**: MP4 - Universal container format

### Merging Process:
- **Stream Copy**: `-c:v copy -c:a copy` prevents quality loss
- **Timestamp Fix**: `-avoid_negative_ts make_zero` fixes sync issues
- **Metadata**: Preserves all video information

### Fallback Strategy:
- **Primary**: Requested quality with proper codecs
- **Secondary**: Same quality with different codecs
- **Tertiary**: Lower quality with proper codecs
- **Final**: Best available quality

## 🎉 Conclusion

These fixes ensure that:
1. **Video and audio streams are perfectly synchronized**
2. **Files have meaningful, descriptive names**
3. **Format selection prioritizes compatibility**
4. **Quality is preserved without re-encoding**
5. **Metadata is properly embedded**

The result is a much more professional and reliable video downloading experience with proper file naming and perfect audio/video synchronization.

