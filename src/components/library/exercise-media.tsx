"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Dumbbell } from "lucide-react";
import { youtubeVideoId, youtubeMaxResThumbnail, youtubeHqThumbnail } from "@/lib/youtube";

export interface ExerciseMediaSource {
  videoUrl?: string;
  youtubeUrl?: string;
  imageUrlStart?: string;
  imageUrlEnd?: string;
  gifUrl?: string;
}

/** YouTube thumbnail with automatic maxres -> hq fallback (maxres doesn't exist for every video). */
function YoutubeThumbnail({ videoId, alt }: { videoId: string; alt: string }) {
  const [src, setSrc] = useState(youtubeMaxResThumbnail(videoId));
  return (
    <div className="relative h-full w-full">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 50vw, 25vw"
        className="object-cover"
        unoptimized
        onError={() => setSrc(youtubeHqThumbnail(videoId))}
      />
    </div>
  );
}

/** Real, playable YouTube embed (play/pause/replay via the native YouTube controls). */
function YoutubePlayer({ videoId, alt }: { videoId: string; alt: string }) {
  return (
    <iframe
      src={`https://www.youtube.com/embed/${videoId}`}
      title={alt}
      className="h-full w-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
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
 * 1) uploaded video  2) YouTube (thumbnail or real player)  3) start/end photo cross-fade  4) icon.
 *
 * `variant="player"` is reserved for the workout-execution screen, where a YouTube
 * exercise should be a real, playable embed. Everywhere else (libraries, programs,
 * templates, history, reports, PR cards...) stays a lightweight static thumbnail.
 */
export function ExerciseMedia({
  media,
  alt,
  className,
  iconClassName,
  variant = "thumbnail",
}: {
  media: ExerciseMediaSource;
  alt: string;
  className?: string;
  iconClassName?: string;
  variant?: "thumbnail" | "player";
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
          controls={false}
        />
      </div>
    );
  }

  const videoId = media.youtubeUrl ? youtubeVideoId(media.youtubeUrl) : null;
  if (videoId) {
    return (
      <div className={className}>
        {variant === "player" ? <YoutubePlayer videoId={videoId} alt={alt} /> : <YoutubeThumbnail videoId={videoId} alt={alt} />}
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
