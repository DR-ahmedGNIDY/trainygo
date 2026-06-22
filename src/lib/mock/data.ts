/**
 * Demo data for the Phase 4 dashboards. This makes the UI feel real before the
 * data layer lands in Phase 5. Replace these with live MongoDB queries later —
 * the shapes intentionally mirror the Mongoose models.
 */
import type { Locale } from "@/lib/constants";

export type L = { ar: string; en: string };
export const tl = (v: L, locale: Locale) => v[locale];

/* ----------------------------- Super Admin ----------------------------- */

export const adminKpis = {
  totalCoaches: 248,
  activeCoaches: 176,
  trialCoaches: 41,
  expiredCoaches: 31,
  totalClients: 5820,
  revenue: 148600, // EGP this month
  deltas: {
    coaches: { value: 12, positive: true },
    clients: { value: 8, positive: true },
    revenue: { value: 5, positive: true },
    expired: { value: 3, positive: false },
  },
};

export const revenueSeries = [
  { label: "Jan", value: 84000 },
  { label: "Feb", value: 96500 },
  { label: "Mar", value: 105000 },
  { label: "Apr", value: 118200 },
  { label: "May", value: 134000 },
  { label: "Jun", value: 148600 },
];

export const coachGrowthSeries = [
  { label: "Jan", value: 142 },
  { label: "Feb", value: 168 },
  { label: "Mar", value: 189 },
  { label: "Apr", value: 207 },
  { label: "May", value: 228 },
  { label: "Jun", value: 248 },
];

export type CoachRow = {
  id: string;
  name: string;
  brand: L;
  email: string;
  plan: L;
  clients: number;
  status: "active" | "trial" | "expired" | "suspended";
  joined: string;
};

export const coachesRows: CoachRow[] = [
  { id: "c1", name: "Ahmed Hassan", brand: { ar: "أحمد فيتنس", en: "Ahmed Fitness" }, email: "ahmed@fit.com", plan: { ar: "الاحترافي", en: "Pro" }, clients: 42, status: "active", joined: "2025-02-14" },
  { id: "c2", name: "Mona Adel", brand: { ar: "مونا كوتش", en: "Mona Coach" }, email: "mona@coach.com", plan: { ar: "المتقدم", en: "Enterprise" }, clients: 88, status: "active", joined: "2024-11-03" },
  { id: "c3", name: "Karim Saeed", brand: { ar: "كريم تيم", en: "Karim Team" }, email: "karim@team.com", plan: { ar: "المبتدئ", en: "Starter" }, clients: 9, status: "trial", joined: "2026-06-18" },
  { id: "c4", name: "Salma Tarek", brand: { ar: "سلمى ستديو", en: "Salma Studio" }, email: "salma@studio.com", plan: { ar: "الاحترافي", en: "Pro" }, clients: 35, status: "active", joined: "2025-05-21" },
  { id: "c5", name: "Omar Nabil", brand: { ar: "أوميغا جيم", en: "Omega Gym" }, email: "omar@omega.com", plan: { ar: "المبتدئ", en: "Starter" }, clients: 0, status: "expired", joined: "2025-01-09" },
  { id: "c6", name: "Yara Fouad", brand: { ar: "يارا هيلث", en: "Yara Health" }, email: "yara@health.com", plan: { ar: "الاحترافي", en: "Pro" }, clients: 27, status: "active", joined: "2025-08-30" },
];

/* -------------------------------- Coach -------------------------------- */

export const coachKpis = {
  myClients: 42,
  activeClients: 36,
  pendingCheckins: 7,
  unreadMessages: 3,
  deltas: {
    clients: { value: 9, positive: true },
    adherence: { value: 4, positive: true },
  },
};

export const clientGrowthSeries = [
  { label: "W1", value: 31 },
  { label: "W2", value: 34 },
  { label: "W3", value: 37 },
  { label: "W4", value: 39 },
  { label: "W5", value: 41 },
  { label: "W6", value: 42 },
];

export const adherenceSeries = [
  { label: "Sat", value: 78 },
  { label: "Sun", value: 84 },
  { label: "Mon", value: 90 },
  { label: "Tue", value: 72 },
  { label: "Wed", value: 88 },
  { label: "Thu", value: 95 },
  { label: "Fri", value: 81 },
];

export type ClientRow = {
  id: string;
  name: string;
  code: string;
  goal: L;
  status: "active" | "expired";
  progress: number;
  lastActive: L;
};

export const clientRows: ClientRow[] = [
  { id: "cl1", name: "Sara Mohamed", code: "TRG00001", goal: { ar: "خسارة دهون", en: "Fat loss" }, status: "active", progress: 72, lastActive: { ar: "اليوم", en: "Today" } },
  { id: "cl2", name: "Ahmed Ali", code: "TRG00002", goal: { ar: "بناء عضل", en: "Muscle gain" }, status: "active", progress: 54, lastActive: { ar: "أمس", en: "Yesterday" } },
  { id: "cl3", name: "Khaled Samir", code: "TRG00003", goal: { ar: "تحسين لياقة", en: "General fitness" }, status: "active", progress: 38, lastActive: { ar: "منذ يومين", en: "2 days ago" } },
  { id: "cl4", name: "Nour Hany", code: "TRG00004", goal: { ar: "خسارة دهون", en: "Fat loss" }, status: "active", progress: 81, lastActive: { ar: "اليوم", en: "Today" } },
  { id: "cl5", name: "Hassan Reda", code: "TRG00005", goal: { ar: "قوة", en: "Strength" }, status: "expired", progress: 20, lastActive: { ar: "منذ أسبوع", en: "1 week ago" } },
  { id: "cl6", name: "Layla Adel", code: "TRG00006", goal: { ar: "صيانة", en: "Maintenance" }, status: "active", progress: 63, lastActive: { ar: "منذ ٣ أيام", en: "3 days ago" } },
];

export const recentActivity: { id: string; text: L; time: L; kind: "client" | "checkin" | "message" | "program" }[] = [
  { id: "a1", text: { ar: "سجّلت سارة وزناً جديداً: ٦٨ كجم", en: "Sara logged a new weight: 68 kg" }, time: { ar: "منذ ٢٠ دقيقة", en: "20m ago" }, kind: "checkin" },
  { id: "a2", text: { ar: "أكمل أحمد تمرين الصدر", en: "Ahmed completed Chest day" }, time: { ar: "منذ ساعة", en: "1h ago" }, kind: "program" },
  { id: "a3", text: { ar: "رسالة جديدة من خالد", en: "New message from Khaled" }, time: { ar: "منذ ٣ ساعات", en: "3h ago" }, kind: "message" },
  { id: "a4", text: { ar: "انضمت ليلى كعميلة جديدة", en: "Layla joined as a new client" }, time: { ar: "أمس", en: "Yesterday" }, kind: "client" },
];

export type ExerciseRow = {
  id: string;
  name: L;
  category: L;
  muscles: L;
  system: boolean;
};

export const exerciseRows: ExerciseRow[] = [
  { id: "e1", name: { ar: "ضغط البنش بالبار", en: "Barbell Bench Press" }, category: { ar: "صدر", en: "Chest" }, muscles: { ar: "صدر، ترايسبس", en: "Chest, Triceps" }, system: true },
  { id: "e2", name: { ar: "سحب أرضي", en: "Deadlift" }, category: { ar: "ظهر", en: "Back" }, muscles: { ar: "ظهر، أرجل", en: "Back, Legs" }, system: true },
  { id: "e3", name: { ar: "سكوات خلفي", en: "Back Squat" }, category: { ar: "أرجل", en: "Legs" }, muscles: { ar: "فخذ، جلوتس", en: "Quads, Glutes" }, system: true },
  { id: "e4", name: { ar: "ضغط كتف بالدمبل", en: "Dumbbell Shoulder Press" }, category: { ar: "أكتاف", en: "Shoulders" }, muscles: { ar: "أكتاف", en: "Shoulders" }, system: true },
  { id: "e5", name: { ar: "تمرين العقلة", en: "Pull-up" }, category: { ar: "ظهر", en: "Back" }, muscles: { ar: "ظهر، بايسبس", en: "Back, Biceps" }, system: true },
  { id: "e6", name: { ar: "بلانك جانبي خاص بي", en: "My Side Plank Variation" }, category: { ar: "بطن", en: "Abs" }, muscles: { ar: "core", en: "Core" }, system: false },
];

export type FoodRow = {
  id: string;
  name: L;
  category: L;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export const foodRows: FoodRow[] = [
  { id: "f1", name: { ar: "صدر دجاج مشوي", en: "Grilled Chicken Breast" }, category: { ar: "بروتين", en: "Protein" }, kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
  { id: "f2", name: { ar: "أرز أبيض مطبوخ", en: "Cooked White Rice" }, category: { ar: "كارب", en: "Carbs" }, kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { id: "f3", name: { ar: "بيض مسلوق", en: "Boiled Egg" }, category: { ar: "بروتين", en: "Protein" }, kcal: 78, protein: 6.3, carbs: 0.6, fat: 5.3 },
  { id: "f4", name: { ar: "شوفان", en: "Oats" }, category: { ar: "كارب", en: "Carbs" }, kcal: 389, protein: 17, carbs: 66, fat: 7 },
  { id: "f5", name: { ar: "زبدة فول سوداني", en: "Peanut Butter" }, category: { ar: "دهون صحية", en: "Healthy Fats" }, kcal: 588, protein: 25, carbs: 20, fat: 50 },
  { id: "f6", name: { ar: "موز", en: "Banana" }, category: { ar: "فواكه", en: "Fruits" }, kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 },
];

export const workoutTemplateRows: { id: string; name: L; goal: L; days: number; weeks: number }[] = [
  { id: "wt1", name: { ar: "بوش بول ليجز", en: "Push Pull Legs" }, goal: { ar: "بناء عضل", en: "Muscle gain" }, days: 6, weeks: 4 },
  { id: "wt2", name: { ar: "تقسيمة علوي/سفلي", en: "Upper / Lower Split" }, goal: { ar: "قوة", en: "Strength" }, days: 4, weeks: 6 },
  { id: "wt3", name: { ar: "فول بودي للمبتدئين", en: "Beginner Full Body" }, goal: { ar: "لياقة عامة", en: "General fitness" }, days: 3, weeks: 8 },
];

export const clientProgramRows: { id: string; client: string; program: L; week: string; adherence: number; status: "active" | "archived" }[] = [
  { id: "p1", client: "Sara Mohamed", program: { ar: "بوش بول ليجز", en: "Push Pull Legs" }, week: "3/4", adherence: 92, status: "active" },
  { id: "p2", client: "Ahmed Ali", program: { ar: "تقسيمة علوي/سفلي", en: "Upper / Lower" }, week: "2/6", adherence: 78, status: "active" },
  { id: "p3", client: "Nour Hany", program: { ar: "فول بودي", en: "Full Body" }, week: "5/8", adherence: 88, status: "active" },
];

export const nutritionTemplateRows: { id: string; name: L; kcal: number; protein: number; meals: number }[] = [
  { id: "nt1", name: { ar: "خسارة دهون ١٨٠٠ سعرة", en: "1800 kcal Fat Loss" }, kcal: 1800, protein: 150, meals: 4 },
  { id: "nt2", name: { ar: "صيانة ٢٢٠٠ سعرة", en: "2200 kcal Maintenance" }, kcal: 2200, protein: 165, meals: 4 },
  { id: "nt3", name: { ar: "تضخيم ٣٠٠٠ سعرة", en: "3000 kcal Bulk" }, kcal: 3000, protein: 200, meals: 5 },
];

export const nutritionPlanRows: { id: string; client: string; plan: L; kcal: number; status: "active" | "archived" }[] = [
  { id: "np1", client: "Sara Mohamed", plan: { ar: "خسارة دهون ١٨٠٠", en: "1800 Fat Loss" }, kcal: 1800, status: "active" },
  { id: "np2", client: "Khaled Samir", plan: { ar: "صيانة ٢٢٠٠", en: "2200 Maintenance" }, kcal: 2200, status: "active" },
];

export const checkinRows: { id: string; client: string; date: string; status: "pending" | "reviewed"; sleep: number; water: number; energy: number }[] = [
  { id: "ch1", client: "Sara Mohamed", date: "2026-06-21", status: "pending", sleep: 7, water: 2.5, energy: 8 },
  { id: "ch2", client: "Ahmed Ali", date: "2026-06-20", status: "pending", sleep: 6, water: 3, energy: 6 },
  { id: "ch3", client: "Nour Hany", date: "2026-06-19", status: "reviewed", sleep: 8, water: 3.2, energy: 9 },
];

export const measurementRows: { id: string; client: string; weight: number; change: number; bodyFat: number; date: string }[] = [
  { id: "m1", client: "Sara Mohamed", weight: 68, change: -1.2, bodyFat: 24, date: "2026-06-21" },
  { id: "m2", client: "Ahmed Ali", weight: 82, change: 0.5, bodyFat: 16, date: "2026-06-20" },
  { id: "m3", client: "Nour Hany", weight: 71, change: -0.8, bodyFat: 22, date: "2026-06-19" },
];

export const messageThreads: { id: string; name: string; last: L; time: L; unread: number }[] = [
  { id: "t1", name: "Sara Mohamed", last: { ar: "تمام يا كابتن، هبدأ النهاردة", en: "Okay coach, starting today" }, time: { ar: "١٠:٤٢ ص", en: "10:42 AM" }, unread: 2 },
  { id: "t2", name: "Khaled Samir", last: { ar: "ممكن أبدّل تمرين الجمعة؟", en: "Can I swap Friday's workout?" }, time: { ar: "٩:١٥ ص", en: "9:15 AM" }, unread: 1 },
  { id: "t3", name: "Ahmed Ali", last: { ar: "شكراً على المتابعة 🙏", en: "Thanks for the check-in 🙏" }, time: { ar: "أمس", en: "Yesterday" }, unread: 0 },
];

/* -------------------------------- Client ------------------------------- */

export const clientToday = {
  workoutName: { ar: "اليوم الأول — صدر وترايسبس", en: "Day 1 — Chest & Triceps" } as L,
  exercises: [
    { id: "x1", name: { ar: "ضغط بنش بالبار", en: "Barbell Bench Press" } as L, sets: 4, reps: "8-10", rest: 90, done: true },
    { id: "x2", name: { ar: "ضغط مائل بالدمبل", en: "Incline DB Press" } as L, sets: 3, reps: "10-12", rest: 75, done: true },
    { id: "x3", name: { ar: "تفتيح كابل", en: "Cable Fly" } as L, sets: 3, reps: "12-15", rest: 60, done: false },
    { id: "x4", name: { ar: "ترايسبس بالحبل", en: "Triceps Rope Pushdown" } as L, sets: 3, reps: "12-15", rest: 60, done: false },
  ],
  meals: [
    { id: "me1", name: { ar: "الفطار", en: "Breakfast" } as L, kcal: 520, done: true },
    { id: "me2", name: { ar: "الغداء", en: "Lunch" } as L, kcal: 680, done: false },
    { id: "me3", name: { ar: "وجبة خفيفة", en: "Snack" } as L, kcal: 250, done: false },
    { id: "me4", name: { ar: "العشاء", en: "Dinner" } as L, kcal: 550, done: false },
  ],
  macros: { calories: { consumed: 770, target: 2000 }, protein: { consumed: 62, target: 150 }, carbs: { consumed: 78, target: 200 }, fat: { consumed: 22, target: 60 } },
  streak: 12,
  currentWeight: 68,
  goalWeight: 62,
  startWeight: 74,
};

export const clientWeightSeries = [
  { label: "Wk1", value: 74 },
  { label: "Wk2", value: 73.1 },
  { label: "Wk3", value: 72.4 },
  { label: "Wk4", value: 71.5 },
  { label: "Wk5", value: 70.2 },
  { label: "Wk6", value: 69.1 },
  { label: "Wk7", value: 68 },
];

export const clientMeasurements: { id: string; label: L; value: number; unit: string; change: number }[] = [
  { id: "ms1", label: { ar: "الوزن", en: "Weight" }, value: 68, unit: "kg", change: -6 },
  { id: "ms2", label: { ar: "الصدر", en: "Chest" }, value: 98, unit: "cm", change: -2 },
  { id: "ms3", label: { ar: "الخصر", en: "Waist" }, value: 82, unit: "cm", change: -7 },
  { id: "ms4", label: { ar: "الذراع", en: "Arms" }, value: 33, unit: "cm", change: 1 },
  { id: "ms5", label: { ar: "الفخذ", en: "Thighs" }, value: 56, unit: "cm", change: -3 },
  { id: "ms6", label: { ar: "نسبة الدهون", en: "Body Fat" }, value: 24, unit: "%", change: -5 },
];
