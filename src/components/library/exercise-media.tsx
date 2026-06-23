"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Dumbbell } from "lucide-react";

export interface ExerciseMediaSource {
  videoUrl?: string;
  youtubeUrl?: string;
  imageUrlStart?: string;
  imageUrlEnd?: string;
  gifUrl?: string;
}

/** Extracts the video id from common YouTube URL formats (watch/short/embed). */
function youtubeEmbedUrl(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([\w-]+)/,
    /youtu\.be\/([\w-]+)/,
    /youtube\.com\/shorts\/([\w-]+)/,
    /youtube\.com\/embed\/([\w-]+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m?.[1]) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

/**
 * Simulates a smooth GIF from two static photos (start/end of the movement)
 * by cross-fading between them every 500ms.
 */
function MotionFadeImage({
  start,
  end,
  alt,
}: {
  start: string;
  end?: string;
  alt: string;
}) {
  const [frame, setFrame] = useState(0);
  const canAnimate = !!end && end !== start;

  useEffect(() => {
    if (!canAnimate) return;
    const id = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 500);
    return () => clearInterval(id);
  }, [canAnimate]);

  return (
    <div className="relative h-full w-full">
      <Image
        src={start}
        alt={alt}
        fill
        sizes="(max-width: 768px) 50vw, 25vw"
        className="object-cover transition-opacity duration-500 ease-in-out"
        style={{ opacity: frame === 0 ? 1 : 0 }}
        unoptimized
      />
      {canAnimate && (
        <Image
          src={end!}
          alt={alt}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-opacity duration-500 ease-in-out"
          style={{ opacity: frame === 1 ? 1 : 0 }}
          unoptimized
        />
      )}
    </div>
  );
}

/**
 * Renders the best available media for an exercise, in priority order:
 * 1) uploaded video  2) YouTube embed  3) start/end photo cross-fade  4) icon.
 */
export function ExerciseMedia({
  media,
  alt,
  className,
  iconClassName,
}: {
  media: ExerciseMediaSource;
  alt: string;
  className?: string;
  iconClassName?: string;
}) {
  if (media.videoUrl) {
    return (
      <div className={className}>
        <video
          src={media.videoUrl}
          className="h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        />
      </div>
    );
  }

  const embed = media.youtubeUrl ? youtubeEmbedUrl(media.youtubeUrl) : null;
  if (embed) {
    return (
      <div className={className}>
        <iframe
          src={embed}
          title={alt}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  const start = media.imageUrlStart || media.gifUrl;
  if (start) {
    return (
      <div className={className}>
        <MotionFadeImage start={start} end={media.imageUrlEnd} alt={alt} />
      </div>
    );
  }

  return (
    <div className={className}>
      <Dumbbell className={iconClassName ?? "h-10 w-10 text-muted-foreground/40"} />
    </div>
  );
}
