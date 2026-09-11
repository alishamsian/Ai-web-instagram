"use client";

import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

function isInstagramCdn(src: string) {
  try {
    const host = new URL(src).hostname;
    return (
      host.includes("fbcdn.net") ||
      host.includes("cdninstagram.com") ||
      host.includes("instagram.com")
    );
  } catch {
    return false;
  }
}

type Props = Omit<ImageProps, "src" | "alt"> & {
  src: string;
  alt: string;
};

/**
 * Instagram CDN often blocks Next image optimization / hotlinking with referrer.
 * Use a plain <img> + no-referrer for those hosts.
 */
export function SiteImage({
  src,
  alt,
  className,
  fill,
  width,
  height,
  priority,
  sizes,
  unoptimized,
  ...props
}: Props) {
  const externalCdn = isInstagramCdn(src);
  const classes = cn(
    "bg-muted object-cover",
    fill && "absolute inset-0 h-full w-full",
    className,
  );

  if (externalCdn) {
    return (
      // Native img avoids optimizer failures on Meta CDN hosts.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={classes}
        referrerPolicy="no-referrer"
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        sizes={typeof sizes === "string" ? sizes : undefined}
      />
    );
  }

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      className={cn("bg-muted object-cover", className)}
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      priority={priority}
      sizes={sizes}
      unoptimized={unoptimized ?? true}
    />
  );
}

type MediaAsset = {
  url: string;
  alt: string;
  type: "image" | "video";
  videoUrl?: string | null;
};

/** Renders image or video from website media assets. */
export function SiteMedia({
  media,
  className,
  fill,
  width,
  height,
  priority,
  sizes,
  mode = "content",
}: {
  media: MediaAsset;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
  /** cover = still/poster for heroes; ambient = muted looping video; content = player */
  mode?: "content" | "cover" | "ambient";
}) {
  const poster =
    media.url && !media.url.includes(".mp4") ? media.url : undefined;
  const videoSrc =
    media.type === "video"
      ? media.videoUrl || (media.url.includes(".mp4") ? media.url : null)
      : media.videoUrl;

  // Storefront heroes must never look like a video player.
  if (mode === "cover" && poster) {
    return (
      <SiteImage
        src={poster}
        alt={media.alt}
        className={className}
        fill={fill}
        width={width}
        height={height}
        priority={priority}
        sizes={sizes}
      />
    );
  }

  if (videoSrc && mode === "ambient") {
    return (
      <video
        className={cn(
          "bg-muted object-cover",
          fill && "absolute inset-0 h-full w-full",
          className,
        )}
        src={videoSrc}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
    );
  }

  if (videoSrc && mode === "content") {
    return (
      <video
        className={cn(
          "bg-muted object-cover",
          fill && "absolute inset-0 h-full w-full",
          className,
        )}
        src={videoSrc}
        poster={poster}
        controls
        playsInline
        muted
        loop
        preload="metadata"
      />
    );
  }

  return (
    <SiteImage
      src={media.url}
      alt={media.alt}
      className={className}
      fill={fill}
      width={width}
      height={height}
      priority={priority}
      sizes={sizes}
    />
  );
}
