import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const downloadItems = pgTable("download_items", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  title: text("title"),
  platform: text("platform"),
  status: text("status").notNull().default("queued"), // queued, downloading, completed, failed, cancelled
  progress: integer("progress").default(0),
  quality: text("quality").default("720p"),
  format: text("format").default("mp4"),
  formatId: text("format_id"),
  fileSize: text("file_size"),
  downloadSpeed: text("download_speed"),
  estimatedTime: text("estimated_time"),
  filePath: text("file_path"),
  errorMessage: text("error_message"),
  downloadLocation: text("download_location"),
  thumbnailUrl: text("thumbnail_url"),
  audioCodec: text("audio_codec"),
  videoCodec: text("video_codec"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  subtitles: boolean("subtitles").default(false),
  metadata: boolean("metadata").default(true),
  saveThumbnail: boolean("save_thumbnail").default(false),
  customFilename: text("custom_filename"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const downloadSettings = pgTable("download_settings", {
  id: serial("id").primaryKey(),
  quality: text("quality").default("720p"),
  format: text("format").default("mp4"),
  downloadPath: text("download_path").default("~/Downloads/Videos"),
  autoPlay: boolean("auto_play").default(false),
  theme: text("theme").default("light"),
  notifications: boolean("notifications").default(true),
  maxConcurrentDownloads: integer("max_concurrent_downloads").default(6),
});

export const insertDownloadItemSchema = createInsertSchema(downloadItems).omit({
  id: true,
  createdAt: true,
});

export const insertDownloadSettingsSchema = createInsertSchema(downloadSettings).omit({
  id: true,
});

export type InsertDownloadItem = z.infer<typeof insertDownloadItemSchema>;
export type DownloadItem = typeof downloadItems.$inferSelect;
export type InsertDownloadSettings = z.infer<typeof insertDownloadSettingsSchema>;
export type DownloadSettings = typeof downloadSettings.$inferSelect;

// WebSocket message types
export type WebSocketMessage =
  | { type: "download_progress"; id: number; progress: number; speed?: string; eta?: string }
  | { type: "download_complete"; id: number; filePath: string; fileSize: string; quality?: string }
  | { type: "download_error"; id: number; error: string }
  | { type: "download_started"; id: number }
  | { type: "download_warning"; id: number; message: string }
  | { type: "download_info"; id: number; message: string }
  | { type: "queue_status"; activeDownloads: number; queuedDownloads: number };
