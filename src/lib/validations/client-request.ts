import { z } from "zod";
import { EXERCISE_CHANGE_QUICK_REASONS } from "@/lib/constants";

/**
 * Input a client submits to request replacing an exercise during a workout
 * session. `exerciseId` is optional (some program entries are free-typed with
 * no library reference); the week/day/name locate the entry server-side.
 */
export const exerciseChangeRequestSchema = z
  .object({
    programId: z.string().min(1),
    weekNumber: z.number().int().min(1),
    dayNumber: z.number().int().min(1),
    exerciseId: z.string().optional().nullable(),
    exerciseNameAr: z.string().min(1).max(200),
    exerciseNameEn: z.string().min(1).max(200),
    quickReason: z.enum(EXERCISE_CHANGE_QUICK_REASONS).optional(),
    reason: z.string().max(500).optional().default(""),
  })
  // Must give the coach *something* to act on: a preset reason or a written note.
  .refine((v) => Boolean(v.quickReason) || v.reason.trim().length > 0, {
    message: "REASON_REQUIRED",
    path: ["reason"],
  });

export type ExerciseChangeRequestInput = z.input<typeof exerciseChangeRequestSchema>;
export type ExerciseChangeRequestData = z.output<typeof exerciseChangeRequestSchema>;

/** Coach's replacement choice when approving an exercise-change request. */
export const approveExerciseChangeSchema = z.object({
  replacementExerciseId: z.string().min(1),
  replacementExerciseNameAr: z.string().min(1).max(200),
  replacementExerciseNameEn: z.string().min(1).max(200),
  coachNote: z.string().max(500).optional().default(""),
});

export type ApproveExerciseChangeInput = z.input<typeof approveExerciseChangeSchema>;
export type ApproveExerciseChangeData = z.output<typeof approveExerciseChangeSchema>;
