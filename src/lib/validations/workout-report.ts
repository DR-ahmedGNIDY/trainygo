import { z } from "zod";

const reportSetSchema = z.object({
  setNumber: z.number().int().min(1),
  weight: z.number().min(0),
  reps: z.number().min(0),
});

const reportExerciseSchema = z.object({
  exerciseId: z.string().optional(),
  nameAr: z.string().min(1),
  nameEn: z.string().min(1),
  targetSets: z.number().int().min(0),
  targetReps: z.string(),
  sets: z.array(reportSetSchema),
  wasDeferred: z.boolean().default(false),
});

export const workoutReportSchema = z.object({
  programId: z.string().optional(),
  weekNumber: z.number().int().optional(),
  dayNumber: z.number().int().optional(),
  dayNameAr: z.string().optional().default(""),
  dayNameEn: z.string().optional().default(""),
  startedAt: z.string(),
  endedAt: z.string(),
  exercises: z.array(reportExerciseSchema).min(1),
});

export type WorkoutReportInput = z.input<typeof workoutReportSchema>;
export type WorkoutReportData = z.output<typeof workoutReportSchema>;
