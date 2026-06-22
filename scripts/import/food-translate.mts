/**
 * English → Arabic translator for real USDA food names. Slot-based word
 * substitution: classifies each significant word as a body-part, main
 * ingredient, or prep/state adjective using a curated food-vocabulary
 * dictionary, then assembles in natural Arabic order (part → main → prep).
 * Falls back to the original English name (never fabricates a translation)
 * when the dictionary can't confidently cover a name.
 */

type Slot = "part" | "main" | "prep";
const DICT: Record<string, { ar: string; slot: Slot }> = {
  // main ingredients
  chicken: { ar: "دجاج", slot: "main" }, beef: { ar: "لحم بقري", slot: "main" },
  pork: { ar: "لحم خنزير", slot: "main" }, lamb: { ar: "لحم ضاني", slot: "main" }, turkey: { ar: "ديك رومي", slot: "main" },
  fish: { ar: "سمك", slot: "main" }, salmon: { ar: "سلمون", slot: "main" }, tuna: { ar: "تونة", slot: "main" },
  shrimp: { ar: "جمبري", slot: "main" }, cod: { ar: "سمك القد", slot: "main" }, tilapia: { ar: "بلطي", slot: "main" },
  egg: { ar: "بيض", slot: "main" }, eggs: { ar: "بيض", slot: "main" },
  milk: { ar: "حليب", slot: "main" }, cheese: { ar: "جبن", slot: "main" }, yogurt: { ar: "زبادي", slot: "main" },
  cream: { ar: "كريمة", slot: "main" }, butter: { ar: "زبدة", slot: "main" },
  rice: { ar: "أرز", slot: "main" }, oats: { ar: "شوفان", slot: "main" }, oatmeal: { ar: "شوفان", slot: "main" },
  bread: { ar: "خبز", slot: "main" }, pasta: { ar: "مكرونة", slot: "main" }, spaghetti: { ar: "سباجيتي", slot: "main" },
  potato: { ar: "بطاطس", slot: "main" }, potatoes: { ar: "بطاطس", slot: "main" }, quinoa: { ar: "كينوا", slot: "main" },
  corn: { ar: "ذرة", slot: "main" }, barley: { ar: "شعير", slot: "main" }, couscous: { ar: "كسكسي", slot: "main" },
  broccoli: { ar: "بروكلي", slot: "main" }, spinach: { ar: "سبانخ", slot: "main" }, carrot: { ar: "جزر", slot: "main" },
  carrots: { ar: "جزر", slot: "main" }, tomato: { ar: "طماطم", slot: "main" }, tomatoes: { ar: "طماطم", slot: "main" },
  cucumber: { ar: "خيار", slot: "main" }, lettuce: { ar: "خس", slot: "main" }, pepper: { ar: "فلفل", slot: "main" },
  peppers: { ar: "فلفل", slot: "main" }, onion: { ar: "بصل", slot: "main" }, onions: { ar: "بصل", slot: "main" },
  zucchini: { ar: "كوسة", slot: "main" }, cauliflower: { ar: "قرنبيط", slot: "main" }, asparagus: { ar: "هليون", slot: "main" },
  mushroom: { ar: "مشروم", slot: "main" }, mushrooms: { ar: "مشروم", slot: "main" }, kale: { ar: "كرنب", slot: "main" },
  cabbage: { ar: "ملفوف", slot: "main" }, beans: { ar: "فاصوليا", slot: "main" },
  apple: { ar: "تفاح", slot: "main" }, banana: { ar: "موز", slot: "main" }, orange: { ar: "برتقال", slot: "main" },
  oranges: { ar: "برتقال", slot: "main" }, strawberry: { ar: "فراولة", slot: "main" }, strawberries: { ar: "فراولة", slot: "main" },
  grape: { ar: "عنب", slot: "main" }, grapes: { ar: "عنب", slot: "main" }, mango: { ar: "مانجو", slot: "main" },
  pineapple: { ar: "أناناس", slot: "main" }, watermelon: { ar: "بطيخ", slot: "main" }, blueberry: { ar: "توت أزرق", slot: "main" },
  blueberries: { ar: "توت أزرق", slot: "main" }, pear: { ar: "كمثرى", slot: "main" }, peach: { ar: "خوخ", slot: "main" },
  kiwi: { ar: "كيوي", slot: "main" }, date: { ar: "تمر", slot: "main" }, dates: { ar: "تمر", slot: "main" },
  fig: { ar: "تين", slot: "main" }, figs: { ar: "تين", slot: "main" }, melon: { ar: "شمام", slot: "main" },
  lemon: { ar: "ليمون", slot: "main" }, avocado: { ar: "أفوكادو", slot: "main" },
  almond: { ar: "لوز", slot: "main" }, almonds: { ar: "لوز", slot: "main" }, walnut: { ar: "جوز", slot: "main" },
  walnuts: { ar: "جوز", slot: "main" }, peanut: { ar: "فول سوداني", slot: "main" }, peanuts: { ar: "فول سوداني", slot: "main" },
  cashew: { ar: "كاجو", slot: "main" }, cashews: { ar: "كاجو", slot: "main" }, olive: { ar: "زيتون", slot: "main" },
  oil: { ar: "زيت", slot: "main" }, coconut: { ar: "جوز الهند", slot: "main" },
  juice: { ar: "عصير", slot: "main" }, coffee: { ar: "قهوة", slot: "main" }, tea: { ar: "شاي", slot: "main" },
  soda: { ar: "مشروب غازي", slot: "main" }, water: { ar: "ماء", slot: "main" },
  pizza: { ar: "بيتزا", slot: "main" }, burger: { ar: "برجر", slot: "main" }, fries: { ar: "بطاطس مقلية", slot: "main" },
  sandwich: { ar: "ساندوتش", slot: "main" }, taco: { ar: "تاكو", slot: "main" },
  whey: { ar: "واي بروتين", slot: "main" }, protein: { ar: "بروتين", slot: "main" }, creatine: { ar: "كرياتين", slot: "main" },
  lentils: { ar: "عدس", slot: "main" }, lentil: { ar: "عدس", slot: "main" }, chickpea: { ar: "حمص", slot: "main" },
  chickpeas: { ar: "حمص", slot: "main" }, tofu: { ar: "توفو", slot: "main" },

  // body parts / cuts
  breast: { ar: "صدر", slot: "part" }, thigh: { ar: "فخدة", slot: "part" }, leg: { ar: "ساق", slot: "part" },
  wing: { ar: "جنح", slot: "part" }, fillet: { ar: "فيليه", slot: "part" }, ground: { ar: "مفروم", slot: "part" },

  // prep / state
  raw: { ar: "نيء", slot: "prep" }, cooked: { ar: "مطبوخ", slot: "prep" }, grilled: { ar: "مشوي", slot: "prep" },
  roasted: { ar: "محمص", slot: "prep" }, boiled: { ar: "مسلوق", slot: "prep" }, fried: { ar: "مقلي", slot: "prep" },
  baked: { ar: "مخبوز", slot: "prep" }, dried: { ar: "مجفف", slot: "prep" }, fresh: { ar: "طازج", slot: "prep" },
  canned: { ar: "معلب", slot: "prep" }, frozen: { ar: "مجمد", slot: "prep" }, whole: { ar: "كامل", slot: "prep" },
  skim: { ar: "خالي الدسم", slot: "prep" }, brown: { ar: "بني", slot: "prep" },
};

const PHRASES: Record<string, string> = {
  "green beans": "فاصوليا خضراء",
  "hot dog": "هوت دوج",
  "mass gainer": "ماس جينر",
  "sweet potato": "بطاطا حلوة",
  "sweet potatoes": "بطاطا حلوة",
  "protein powder": "بودرة بروتين",
  "protein bar": "بار بروتين",
};

const SKIP = new Set(["the", "a", "an", "of", "with", "and", "or", "in", "for", "to", "from", "without"]);

function cleanToken(w: string) {
  return w.toLowerCase().replace(/[.,()]/g, "").trim();
}

export function translateFoodToArabic(nameEn: string): string {
  const lower = nameEn.toLowerCase();
  for (const [phrase, ar] of Object.entries(PHRASES)) {
    if (lower.includes(phrase)) return ar;
  }

  const tokens = nameEn.split(/[\s,]+/).filter(Boolean);
  const parts: string[] = [];
  const mains: string[] = [];
  const preps: string[] = [];

  for (const raw of tokens) {
    const w = cleanToken(raw);
    if (!w || SKIP.has(w)) continue;
    const hit = DICT[w];
    if (!hit) continue;
    if (hit.slot === "part") parts.push(hit.ar);
    else if (hit.slot === "main") mains.push(hit.ar);
    else preps.push(hit.ar);
  }

  if (mains.length === 0) return nameEn; // honest fallback — no fabricated translation
  return [...new Set([...parts, ...mains, ...preps])].join(" ");
}
