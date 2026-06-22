/**
 * English → Arabic translator for real WGER exercise names.
 *
 * Slot-based: classifies each word of a real exercise name as a movement
 * head, equipment, or stance/grip modifier using a curated fitness-vocabulary
 * dictionary, then re-assembles in natural Arabic word order
 * (movement → equipment → modifiers). Falls back gracefully (keeps the
 * original term) for the handful of words the dictionary doesn't cover,
 * rather than fabricating a translation.
 */

type Tagged = { ar: string; type: "head" | "equip" | "bodypart" | "mod" };

const DICT: Record<string, Tagged> = {
  // movements / exercise heads
  press: { ar: "ضغط", type: "head" }, bench: { ar: "بنش", type: "equip" },
  squat: { ar: "سكوات", type: "head" }, "squats": { ar: "سكوات", type: "head" },
  deadlift: { ar: "رفعة ميتة", type: "head" }, deadlifts: { ar: "رفعة ميتة", type: "head" }, row: { ar: "تجديف", type: "head" }, rows: { ar: "تجديف", type: "head" },
  curl: { ar: "مرجحة", type: "head" }, curls: { ar: "مرجحة", type: "head" },
  extension: { ar: "تمديد", type: "head" }, pulldown: { ar: "سحب أمامي", type: "head" },
  pullup: { ar: "عقلة", type: "head" }, "pull-up": { ar: "عقلة", type: "head" }, "pull-ups": { ar: "عقلة", type: "head" }, "pullups": { ar: "عقلة", type: "head" },
  pushup: { ar: "ضغط", type: "head" }, "push-up": { ar: "ضغط", type: "head" }, "push-ups": { ar: "ضغط", type: "head" }, "pushups": { ar: "ضغط", type: "head" },
  raise: { ar: "رفرفة", type: "head" }, raises: { ar: "رفرفة", type: "head" },
  fly: { ar: "تفتيح", type: "head" }, flye: { ar: "تفتيح", type: "head" }, flyes: { ar: "تفتيح", type: "head" },
  dip: { ar: "متوازي", type: "head" }, dips: { ar: "متوازي", type: "head" },
  shrug: { ar: "رفرفة كتف", type: "head" }, shrugs: { ar: "رفرفة كتف", type: "head" },
  crunch: { ar: "كرنش", type: "head" }, crunches: { ar: "كرنش", type: "head" },
  plank: { ar: "بلانك", type: "head" }, lunge: { ar: "لانج", type: "head" }, lunges: { ar: "لانج", type: "head" },
  bridge: { ar: "جسر", type: "head" }, thrust: { ar: "دفع", type: "head" }, thrusts: { ar: "دفع", type: "head" },
  swing: { ar: "سوينج", type: "head" }, swings: { ar: "سوينج", type: "head" },
  carry: { ar: "حمل", type: "head" }, walk: { ar: "مشي", type: "head" }, march: { ar: "مشي", type: "head" }, marching: { ar: "مشي", type: "head" },
  twist: { ar: "تطويح", type: "head" }, twists: { ar: "تطويح", type: "head" },
  kickback: { ar: "كيك باك", type: "head" }, kickbacks: { ar: "كيك باك", type: "head" },
  jump: { ar: "وثب", type: "head" }, jumps: { ar: "وثب", type: "head" }, jumping: { ar: "وثب", type: "head" },
  climb: { ar: "تسلق", type: "head" }, climbers: { ar: "متسلق", type: "head" }, climber: { ar: "متسلق", type: "head" },
  sprint: { ar: "عدو سريع", type: "head" }, sprints: { ar: "عدو سريع", type: "head" }, run: { ar: "جري", type: "head" }, running: { ar: "جري", type: "head" },
  rotation: { ar: "دوران", type: "head" }, rotations: { ar: "دوران", type: "head" },
  hold: { ar: "ثبات", type: "head" }, holds: { ar: "ثبات", type: "head" },
  pushdown: { ar: "ضغط لأسفل", type: "head" }, pushdowns: { ar: "ضغط لأسفل", type: "head" },
  pullover: { ar: "بل أوفر", type: "head" }, "step-up": { ar: "ستيب أب", type: "head" }, "step-ups": { ar: "ستيب أب", type: "head" }, stepup: { ar: "ستيب أب", type: "head" }, stepups: { ar: "ستيب أب", type: "head" },
  situp: { ar: "تمرين بطن", type: "head" }, "sit-up": { ar: "تمرين بطن", type: "head" }, "sit-ups": { ar: "تمرين بطن", type: "head" }, situps: { ar: "تمرين بطن", type: "head" },
  burpee: { ar: "بيربي", type: "head" }, burpees: { ar: "بيربي", type: "head" },
  stretch: { ar: "إطالة", type: "head" }, stretches: { ar: "إطالة", type: "head" }, stretching: { ar: "إطالة", type: "head" },
  rollout: { ar: "عجلة البطن", type: "head" }, rollouts: { ar: "عجلة البطن", type: "head" },
  clean: { ar: "كلين", type: "head" }, snatch: { ar: "سناتش", type: "head" }, jerk: { ar: "جيرك", type: "head" },
  "get-up": { ar: "جيت أب", type: "head" }, getup: { ar: "جيت أب", type: "head" },
  slam: { ar: "ضرب", type: "head" }, slams: { ar: "ضرب", type: "head" },

  // equipment
  barbell: { ar: "بالبار", type: "equip" }, dumbbell: { ar: "بالدمبل", type: "equip" }, dumbbells: { ar: "بالدمبل", type: "equip" },
  kettlebell: { ar: "بالكيتل بيل", type: "equip" }, kettlebells: { ar: "بالكيتل بيل", type: "equip" },
  cable: { ar: "بالكابل", type: "equip" }, machine: { ar: "بالماكينة", type: "equip" }, smith: { ar: "سميث مشين", type: "equip" },
  band: { ar: "بالحبل المطاطي", type: "equip" }, resistance: { ar: "", type: "mod" }, bodyweight: { ar: "بوزن الجسم", type: "equip" },
  "ez-bar": { ar: "بار EZ", type: "equip" }, ezbar: { ar: "بار EZ", type: "equip" }, "sz-bar": { ar: "بار EZ", type: "equip" },
  plate: { ar: "بالوزن", type: "equip" }, ball: { ar: "بكرة طبية", type: "equip" }, swiss: { ar: "", type: "mod" },
  mat: { ar: "", type: "mod" }, trx: { ar: "بحبال TRX", type: "equip" },
  rope: { ar: "بالحبل", type: "equip" },

  // modifiers
  incline: { ar: "مائل للأعلى", type: "mod" }, decline: { ar: "مائل للأسفل", type: "mod" },
  seated: { ar: "بوضع الجلوس", type: "mod" }, standing: { ar: "بوضع الوقوف", type: "mod" }, lying: { ar: "بوضع الاستلقاء", type: "mod" },
  single: { ar: "بيد واحدة", type: "mod" }, unilateral: { ar: "بيد واحدة", type: "mod" }, alternating: { ar: "بالتبادل", type: "mod" },
  wide: { ar: "بمسافة واسعة", type: "mod" }, close: { ar: "بمسافة ضيقة", type: "mod" }, narrow: { ar: "بمسافة ضيقة", type: "mod" },
  reverse: { ar: "عكسي", type: "mod" }, weighted: { ar: "بأوزان إضافية", type: "mod" }, assisted: { ar: "بمساعدة", type: "mod" },
  front: { ar: "أمامي", type: "mod" }, back: { ar: "خلفي", type: "mod" }, side: { ar: "جانبي", type: "mod" }, lateral: { ar: "جانبي", type: "mod" },
  rear: { ar: "خلفي", type: "mod" }, behind: { ar: "خلف", type: "mod" }, neck: { ar: "الرقبة", type: "mod" },
  high: { ar: "مرتفع", type: "mod" }, low: { ar: "منخفض", type: "mod" }, sumo: { ar: "سومو", type: "mod" }, romanian: { ar: "روماني", type: "mod" },
  bulgarian: { ar: "بلغاري", type: "mod" }, goblet: { ar: "جوبليت", type: "mod" }, hack: { ar: "هاك", type: "mod" },
  arm: { ar: "", type: "bodypart" }, leg: { ar: "ساق", type: "bodypart" }, legs: { ar: "أرجل", type: "bodypart" },
  knee: { ar: "ركبة", type: "bodypart" }, hip: { ar: "حوض", type: "bodypart" }, wrist: { ar: "معصم", type: "bodypart" }, forearm: { ar: "ساعد", type: "bodypart" },
  overhead: { ar: "فوق الرأس", type: "mod" }, hanging: { ar: "معلقاً", type: "mod" }, banded: { ar: "بحبل مطاطي", type: "mod" },
  glute: { ar: "جلوتس", type: "bodypart" }, glutes: { ar: "جلوتس", type: "bodypart" }, chest: { ar: "صدر", type: "bodypart" }, shoulder: { ar: "كتف", type: "bodypart" },
  thoracic: { ar: "الظهر العلوي", type: "mod" }, hamstring: { ar: "أوتار الركبة", type: "bodypart" }, calf: { ar: "السمانة", type: "bodypart" },
  walking: { ar: "متحرك", type: "mod" },
  // body-part qualifiers frequently used as adjectives
  bicep: { ar: "بايسبس", type: "bodypart" }, biceps: { ar: "بايسبس", type: "bodypart" },
  tricep: { ar: "ترايسبس", type: "bodypart" },
  lat: { ar: "ظهر عريض", type: "bodypart" }, lats: { ar: "ظهر عريض", type: "bodypart" },
  split: { ar: "", type: "mod" },
  face: { ar: "للوجه", type: "mod" }, russian: { ar: "روسي", type: "mod" },
  mountain: { ar: "", type: "mod" }, mountains: { ar: "", type: "mod" },
  db: { ar: "بالدمبل", type: "equip" }, bb: { ar: "بالبار", type: "equip" },
  handstand: { ar: "هاندستاند", type: "head" }, hinge: { ar: "انحناء", type: "head" },
  dislocate: { ar: "تمديد دوراني", type: "head" }, dislocates: { ar: "تمديد دوراني", type: "head" },
  circles: { ar: "دوران", type: "head" }, circle: { ar: "دوران", type: "head" },
  flexion: { ar: "ثني", type: "head" }, hyperextension: { ar: "تمديد ظهر", type: "head" },
};

/** Common multi-word names that don't translate cleanly word-by-word. */
const EXACT_PHRASES: Record<string, string> = {
  "mountain climbers": "متسلق الجبل",
  "russian twist": "روسيان تويست",
  "russian twists": "روسيان تويست",
  "jumping jacks": "تمرين جامبينج جاك",
  "high knees": "رفع الركبتين العالي",
  "battle ropes": "حبال المعركة",
  "wall ball": "وول بول",
  "wall balls": "وول بول",
  "turkish get-up": "تركش جيت أب",
  "turkish get up": "تركش جيت أب",
  "good morning": "جود مورنينج",
  "good mornings": "جود مورنينج",
  "farmer's carry": "حمل المزارع",
  "farmers carry": "حمل المزارع",
  "ab wheel": "عجلة البطن",
  "ab wheel rollout": "عجلة البطن",
  "wood chopper": "وود تشوبر",
  "wood choppers": "وود تشوبر",
  "face pull": "سحب للوجه",
  "face pulls": "سحب للوجه",
  "box jump": "وثب الصندوق",
  "box jumps": "وثب الصندوق",
  "jump rope": "نطّ الحبل",
  "battle rope": "حبال المعركة",
  "bear crawl": "زحف الدب",
  "hip hinge": "انحناء الحوض",
  "cable pull through": "بُل ثرو بالكابل",
  "reverse hyperextension": "تمديد ظهر عكسي",
  "torso rotation": "دوران الجذع",
  "ankle roll": "دوران الكاحل",
  "bent over row": "تجديف بالانحناء",
  "bent over rowing": "تجديف بالانحناء",
  superman: "سوبرمان",
  "trx roll out": "عجلة البطن بحبال TRX",
  "cat-cow": "تمرين القطة والبقرة",
  "cat cow": "تمرين القطة والبقرة",
};

const SKIP = new Set(["the", "a", "an", "of", "with", "on", "to", "and", "for", "in", "at", "your", "-", "/", "ss"]);

function cleanToken(w: string): string {
  return w.toLowerCase().replace(/[.,!?]/g, "").trim();
}

/** Translate a real exercise name into Arabic using slot-based assembly. */
export function translateToArabic(nameEn: string): string {
  const cleaned = nameEn
    .replace(/\([^)]*\)/g, "")
    .replace(/,/g, " ")
    .replace(/\b(push|pull|sit|step)[\s-]?ups?\b/gi, "$1-up")
    .trim();
  const exact = EXACT_PHRASES[cleaned.toLowerCase()] ?? EXACT_PHRASES[nameEn.trim().toLowerCase()];
  if (exact) return exact;

  const rawTokens = cleaned.split(/[\s/]+/).filter(Boolean);
  const heads: string[] = [];
  const equips: string[] = [];
  const bodyparts: string[] = [];
  const mods: string[] = [];
  const leftover: string[] = [];

  for (const raw of rawTokens) {
    const w = cleanToken(raw);
    if (!w || SKIP.has(w)) continue;
    const hit = DICT[w];
    if (!hit) {
      leftover.push(raw);
      continue;
    }
    if (!hit.ar) continue; // filler word, drop silently
    if (hit.type === "head") heads.push(hit.ar);
    else if (hit.type === "equip") equips.push(hit.ar);
    else if (hit.type === "bodypart") bodyparts.push(hit.ar);
    else mods.push(hit.ar);
  }

  const parts = [...new Set(heads)];
  if (parts.length === 0) {
    // No recognized movement head — keep the real English name rather than
    // inventing a translation. The exercise is still imported with its
    // correct English name; only the Arabic label falls back.
    return nameEn;
  }
  parts.push(...new Set(equips));
  parts.push(...new Set(bodyparts));
  parts.push(...new Set(mods));
  if (leftover.length) parts.push(leftover.join(" "));
  return parts.join(" ").replace(/\s{2,}/g, " ").trim();
}
