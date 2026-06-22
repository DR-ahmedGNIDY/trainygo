import type { ExerciseCategory } from "@/lib/constants";
import type { NormalizedExercise } from "../types";

/** Raw record shape from the WGER API (simplified). */
export interface WgerRaw {
  uuid?: string;
  id?: number;
  name: string;
  category?: { name?: string } | string;
  muscles?: ({ name?: string } | string)[];
  description?: string;
}

const CATEGORY_MAP: Record<string, ExerciseCategory> = {
  chest: "chest",
  back: "back",
  shoulders: "shoulders",
  arms: "biceps",
  legs: "legs",
  abs: "abs",
  calves: "legs",
  cardio: "cardio",
};

function stripHtml(html?: string) {
  return (html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function categoryName(c: WgerRaw["category"]): string {
  if (!c) return "";
  return typeof c === "string" ? c : (c.name ?? "");
}

function muscleName(m: { name?: string } | string): string {
  return typeof m === "string" ? m : (m.name ?? "");
}

/** Map WGER records → normalized exercises (no network calls). */
export function fromWger(raw: WgerRaw[]): NormalizedExercise[] {
  return raw.map((r) => ({
    externalId: r.uuid ?? (r.id != null ? String(r.id) : undefined),
    source: "wger",
    nameEn: r.name,
    nameAr: r.name, // placeholder until translated (Phase 6)
    category: CATEGORY_MAP[categoryName(r.category).toLowerCase()] ?? "full_body",
    targetMuscles: (r.muscles ?? []).map(muscleName).filter(Boolean),
    instructions: { en: stripHtml(r.description) },
  }));
}
