import type { ExerciseCategory } from "@/lib/constants";

export type ImportSource = "exercisedb" | "wger" | "manual";

/**
 * Normalized exercise shape that all import adapters must produce. The import
 * service validates and persists these as SYSTEM exercises.
 */
export interface NormalizedExercise {
  /** Stable id from the source, used for idempotent upserts. */
  externalId?: string;
  source: ImportSource;
  nameAr: string;
  nameEn: string;
  category: ExerciseCategory;
  targetMuscles: string[];
  description?: { ar?: string; en?: string };
  instructions?: { ar?: string; en?: string };
  gifUrl?: string;
  youtubeUrl?: string;
}

export interface ImportResult {
  source: ImportSource;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  invalid: number;
  errors: { index: number; message: string }[];
  dryRun: boolean;
}

/** Adapter contract: map an array of raw source records → normalized exercises. */
export type ExerciseAdapter<TRaw = unknown> = (raw: TRaw[]) => NormalizedExercise[];
