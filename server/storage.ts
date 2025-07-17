import { 
  downloadItems, 
  downloadSettings,
  type DownloadItem, 
  type InsertDownloadItem,
  type DownloadSettings,
  type InsertDownloadSettings
} from "@shared/schema";

export interface IStorage {
  // Download items
  getDownloadItem(id: number): Promise<DownloadItem | undefined>;
  getAllDownloadItems(): Promise<DownloadItem[]>;
  createDownloadItem(item: InsertDownloadItem): Promise<DownloadItem>;
  updateDownloadItem(id: number, updates: Partial<DownloadItem>): Promise<DownloadItem | undefined>;
  deleteDownloadItem(id: number): Promise<boolean>;
  clearCompletedDownloads(): Promise<void>;
  
  // Settings
  getSettings(): Promise<DownloadSettings>;
  updateSettings(settings: Partial<InsertDownloadSettings>): Promise<DownloadSettings>;
}

export class MemStorage implements IStorage {
  private downloadItems: Map<number, DownloadItem>;
  private settings: DownloadSettings;
  private currentId: number;

  constructor() {
    this.downloadItems = new Map();
    this.currentId = 1;
    this.settings = {
      id: 1,
      quality: "720p",
      format: "mp4",
      downloadPath: "~/Downloads/Videos"
    };
  }

  async getDownloadItem(id: number): Promise<DownloadItem | undefined> {
    return this.downloadItems.get(id);
  }

  async getAllDownloadItems(): Promise<DownloadItem[]> {
    return Array.from(this.downloadItems.values()).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async createDownloadItem(insertItem: InsertDownloadItem): Promise<DownloadItem> {
    const id = this.currentId++;
    const item: DownloadItem = { 
      ...insertItem, 
      id, 
      createdAt: new Date()
    };
    this.downloadItems.set(id, item);
    return item;
  }

  async updateDownloadItem(id: number, updates: Partial<DownloadItem>): Promise<DownloadItem | undefined> {
    const existing = this.downloadItems.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.downloadItems.set(id, updated);
    return updated;
  }

  async deleteDownloadItem(id: number): Promise<boolean> {
    return this.downloadItems.delete(id);
  }

  async clearCompletedDownloads(): Promise<void> {
    for (const [id, item] of this.downloadItems.entries()) {
      if (item.status === "completed") {
        this.downloadItems.delete(id);
      }
    }
  }

  async getSettings(): Promise<DownloadSettings> {
    return this.settings;
  }

  async updateSettings(updates: Partial<InsertDownloadSettings>): Promise<DownloadSettings> {
    this.settings = { ...this.settings, ...updates };
    return this.settings;
  }
}

export const storage = new MemStorage();
