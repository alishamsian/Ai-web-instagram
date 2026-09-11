export interface StoredMedia {
  id: string;
  originalUrl: string;
  storageKey: string;
  publicUrl: string;
  type: "image" | "video";
  width?: number;
  height?: number;
  createdAt: Date;
}

export interface MediaStorage {
  upload(params: {
    key: string;
    body: Buffer | Uint8Array;
    contentType: string;
  }): Promise<StoredMedia>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}
