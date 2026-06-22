import type { ExerciseCategory } from "@/lib/constants";
import type { NormalizedExercise } from "../types";

/** Raw record shape from the ExerciseDB API. */
export interface ExerciseDbRaw {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  equipment?: string;
  gifUrl?: string;
  secondaryMuscles?: string[];
  instructions?: string[];
}

const BODYPART_TO_CATEGORY: Record<string, ExerciseCategory> = {
  chest: "chest",
  back: "back",
  shoulders: "shoulders",
  "upper arms": "biceps",
  "lower arms": "triceps",
  "upper legs": "legs",
  "lower legs": "legs",
  waist: "abs",
  cardio: "cardio",
  neck: "full_body",
};

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Map ExerciseDB records → normalized exercises (no network calls). */
export function fromExerciseDb(raw: ExerciseDbRaw[]): NormalizedExercise[] {
  return raw.map((r) => ({
    externalId: r.id,
    source: "exercisedb",
    nameEn: titleCase(r.name),
    nameAr: titleCase(r.name), // placeholder until translated (Phase 6)
    category: BODYPART_TO_CATEGORY[r.bodyPart?.toLowerCase()] ?? "full_body",
    targetMuscles: [r.target, ...(r.secondaryMuscles ?? [])].filter(Boolean),
    instructions: { en: (r.instructions ?? []).join(" ") },
    gifUrl: r.gifUrl,
  }));
}
