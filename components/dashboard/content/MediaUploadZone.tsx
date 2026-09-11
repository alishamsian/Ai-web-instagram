"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UploadedMediaItem = {
  id: string;
  url: string;
  type: "image" | "video";
  alt: string;
};

export function MediaUploadZone({
  websiteId,
  locale,
  productIndex,
  compact,
  disabled,
  onUploaded,
}: {
  websiteId: string;
  locale: "fa" | "en";
  productIndex?: number | null;
  compact?: boolean;
  disabled?: boolean;
  onUploaded: (items: UploadedMediaItem[]) => void;
}) {
  const isFa = locale === "fa";
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function uploadFiles(fileList: FileList | File[]) {
    const files = [...fileList].filter((f) => f.size > 0);
    if (!files.length) return;
    setPending(true);
    setError("");
    try {
      const form = new FormData();
      for (const file of files.slice(0, 12)) {
        form.append("files", file);
      }
      if (productIndex != null) {
        form.append("productIndex", String(productIndex));
      }
      const response = await fetch(`/api/websites/${websiteId}/media`, {
        method: "POST",
        body: form,
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        media?: UploadedMediaItem[];
      } | null;
      if (!response.ok || !payload?.media?.length) {
        const code = payload?.error;
        setError(
          code === "FILE_TOO_LARGE"
            ? isFa
              ? "فایل خیلی بزرگ است (عکس ۱۲مگ / فیلم ۵۰مگ)."
              : "File too large (12MB image / 50MB video)."
            : code === "UNSUPPORTED_TYPE"
              ? isFa
                ? "فرمت پشتیبانی نمی‌شود."
                : "Unsupported file type."
              : isFa
                ? "آپلود ناموفق بود."
                : "Upload failed.",
        );
        return;
      }
      onUploaded(payload.media);
    } catch {
      setError(isFa ? "آپلود ناموفق بود." : "Upload failed.");
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (compact) {
    return (
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void uploadFiles(e.target.files);
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Upload className="size-3.5" aria-hidden />
          )}
          {isFa ? "آپلود" : "Upload"}
        </Button>
        {error ? (
          <p className="mt-1.5 text-[11px] text-amber-800">{error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void uploadFiles(e.target.files);
        }}
      />
      <button
        type="button"
        disabled={disabled || pending}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) {
            void uploadFiles(e.dataTransfer.files);
          }
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-[1.35rem] border border-dashed px-6 py-10 text-center transition-colors",
          dragging
            ? "border-ink bg-white"
            : "border-border/80 bg-white/60 hover:border-ink/40 hover:bg-white",
          (disabled || pending) && "opacity-60",
        )}
      >
        <div className="flex size-11 items-center justify-center rounded-2xl bg-[#f4f4f2] ring-1 ring-border/60">
          {pending ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (
            <ImagePlus className="size-5 text-muted-foreground" aria-hidden />
          )}
        </div>
        <p className="text-sm font-medium text-ink">
          {pending
            ? isFa
              ? "در حال آپلود…"
              : "Uploading…"
            : isFa
              ? "عکس یا فیلم آپلود کن"
              : "Upload photos or video"}
        </p>
        <p className="max-w-sm text-[12px] text-muted-foreground">
          {isFa
            ? "بکش و رها کن، یا کلیک کن. JPG/PNG/WebP/GIF و MP4/WebM — تا ۱۲ فایل."
            : "Drag & drop or click. JPG/PNG/WebP/GIF and MP4/WebM — up to 12 files."}
        </p>
      </button>
      {error ? (
        <p className="mt-2 text-[12px] text-amber-800">{error}</p>
      ) : null}
    </div>
  );
}
