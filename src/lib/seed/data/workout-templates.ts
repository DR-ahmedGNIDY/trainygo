import type { IWorkoutWeek } from "@/models/WorkoutTemplate";
import type { ClientGoal } from "@/lib/constants";

interface SeedWorkoutTemplate {
  nameAr: string;
  nameEn: string;
  goal: ClientGoal;
  weeks: IWorkoutWeek[];
}

const ex = (nameAr: string, nameEn: string, sets: number, reps: string, order: number) => ({
  exercise: null,
  nameAr,
  nameEn,
  sets,
  reps,
  restSeconds: 75,
  order,
});

export const SYSTEM_WORKOUT_TEMPLATES: SeedWorkoutTemplate[] = [
  {
    nameAr: "بوش بول ليجز",
    nameEn: "Push Pull Legs",
    goal: "muscle_gain",
    weeks: [
      {
        weekNumber: 1,
        name: { ar: "الأسبوع 1", en: "Week 1" },
        days: [
          {
            dayNumber: 1,
            name: { ar: "دفع — صدر وكتف وترايسبس", en: "Push — Chest, Shoulders, Triceps" },
            exercises: [
              ex("ضغط بنش بالبار", "Barbell Bench Press", 4, "6-8", 1),
              ex("ضغط كتف بالدمبل", "Dumbbell Shoulder Press", 3, "8-10", 2),
              ex("تفتيح كابل", "Cable Fly", 3, "12-15", 3),
              ex("ترايسبس بالحبل", "Triceps Rope Pushdown", 3, "12-15", 4),
            ],
          },
          {
            dayNumber: 2,
            name: { ar: "سحب — ظهر وبايسبس", en: "Pull — Back, Biceps" },
            exercises: [
              ex("سحب أرضي", "Deadlift", 3, "5", 1),
              ex("تمرين العقلة", "Pull-up", 3, "8-10", 2),
              ex("تجديف بالبار", "Barbell Row", 3, "8-10", 3),
              ex("مرجحة بايسبس بالبار", "Barbell Curl", 3, "10-12", 4),
            ],
          },
          {
            dayNumber: 3,
            name: { ar: "أرجل", en: "Legs" },
            exercises: [
              ex("سكوات خلفي", "Back Squat", 4, "6-8", 1),
              ex("رفعة رومانية", "Romanian Deadlift", 3, "8-10", 2),
              ex("دفع الأرجل", "Leg Press", 3, "10-12", 3),
              ex("رفع السمانة", "Calf Raise", 4, "15-20", 4),
            ],
          },
        ],
      },
    ],
  },
  {
    nameAr: "فول بودي للمبتدئين",
    nameEn: "Beginner Full Body",
    goal: "general_fitness",
    weeks: [
      {
        weekNumber: 1,
        name: { ar: "الأسبوع 1", en: "Week 1" },
        days: [
          {
            dayNumber: 1,
            name: { ar: "اليوم الأول", en: "Day 1" },
            exercises: [
              ex("سكوات خلفي", "Back Squat", 3, "8-10", 1),
              ex("ضغط بنش بالبار", "Barbell Bench Press", 3, "8-10", 2),
              ex("تجديف بالبار", "Barbell Row", 3, "8-10", 3),
              ex("بلانك", "Plank", 3, "45s", 4),
            ],
          },
        ],
      },
    ],
  },
];
