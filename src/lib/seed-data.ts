import type { LanguageCode, LeadCategory, PreferenceKey, RegistryEntry } from "./types";

// Seller registry used by the app. Sellers are identified by a numeric GLID; BuyLeads by a
// numeric offer id (a BuyLead expires once consumed).
//
// REAL sellers (isDemo: false) were provided by the IndiaMART team. Their raw mobile numbers
// live ONLY here / in data/registry.json — profiles, API responses and the LLM only ever see
// a masked number. Do not publish this file.
//
// DEMO sellers (isDemo: true) are synthetic and kept for the scripted Simulated demo.

export const SEED_VERSION = 2;

/** Converts the source `{ mcatId: [count, name, grade] }` map into lead categories (index 1 = name). */
function leads(src: Record<string, [string, string, string]>): LeadCategory[] {
  return Object.entries(src).map(([mcatId, [count, name, grade]]) => ({ mcatId: Number(mcatId), name, count: Number(count), grade }));
}

export const DEMO_REGISTRY: RegistryEntry[] = [
  // ---------------- Real sellers ----------------
  {
    glid: "6601433",
    isDemo: false,
    mobile: "1002520031",
    displayName: "Komal",
    contactPerson: "Komal",
    category: "Basmati Rice, Mobile Phones, TMT Bars & more",
    city: "Bangalore", state: "Karnataka", location: "Bangalore",
    languageHint: "hi-IN", secondaryLanguage: "kn-IN",
    pnsMapped: true, registeredNumbers: 1,
    catalog: [],
    leadCategories: leads({
      "2093": ["1", "Basmati Rice", "A"],
      "5190": ["1", "Mobile Phones", "A"],
      "10002": ["2", "Men Jeans", "A"],
      "72920": ["2", "Power Bike", "A"],
      "177228": ["3", "TMT Steel Bars", "A"],
      "178221": ["4", "1121 Basmati Rice", "A"],
      "182501": ["1", "Kamdhenu TMT Bars", "A"],
    }),
  },
  {
    glid: "7349419",
    isDemo: false,
    mobile: "9582944261",
    displayName: "Shobhna",
    contactPerson: "Shobhna",
    category: "Basmati Rice, Mobile Phones, GI Pipes & more",
    city: "Delhi", state: "Delhi", location: "Delhi",
    languageHint: "hi-IN", secondaryLanguage: "en-IN",
    pnsMapped: true, registeredNumbers: 1,
    catalog: [],
    leadCategories: leads({
      "2093": ["2", "Basmati Rice", "A"],
      "5190": ["2", "Mobile Phones", "A"],
      "29161": ["3", "Galvanized Iron Pipes", "A"],
      "30613": ["1", "LED Bulb", "A"],
      "72904": ["2", "Electric Motorcycle", "A"],
      "179822": ["5", "Apple iPhone", "A"],
      "180582": ["1", "Men Cargo Jeans", "A"],
    }),
  },
  {
    glid: "37627888",
    isDemo: false,
    mobile: "8447331062",
    displayName: "Manish Murli",
    contactPerson: "Manish Murli",
    category: "TMT Bars, Laptops, Bicycles & more",
    city: "NCR", state: "Delhi NCR", location: "NCR",
    languageHint: "hi-IN", secondaryLanguage: "en-IN",
    pnsMapped: true, registeredNumbers: 1,
    catalog: [],
    leadCategories: leads({
      "10452": ["3", "Kids Bicycles", "B"],
      "68836": ["2", "Writing Notebook", "B"],
      "162792": ["2", "Refurbished Laptops", "B"],
      "180548": ["1", "Mobile Back Cover", "B"],
      "184861": ["12", "TATA TMT Bars", "B"],
    }),
  },
  {
    glid: "218447291",
    isDemo: false,
    mobile: "8697871282",
    displayName: "Unknown seller (Kolkata)",
    category: "Stationery, Books & Jeans",
    city: "Kolkata", state: "West Bengal", location: "Kolkata",
    languageHint: "hi-IN", secondaryLanguage: "bn-IN",
    pnsMapped: true, registeredNumbers: 1,
    catalog: [],
    dealsIn: ["Stationery items", "Books", "Pens", "Jeans", "Notebooks"],
    leadCategories: [],
  },

  // ---------------- Demo sellers (synthetic) ----------------
  {
    glid: "90000001",
    isDemo: true,
    displayName: "Shree Ganesh Steel Traders",
    contactPerson: "Ramesh Agarwal",
    companyName: "Shree Ganesh Steel Traders",
    category: "Stainless Steel Pipes & Tubes",
    subCategories: ["SS Pipes", "SS Round Bars"],
    city: "Ahmedabad", state: "Gujarat", location: "Ahmedabad",
    membership: "Mini Dynamic Catalog (demo)", trustSeal: true, gstVerified: true, yearEstablished: 2009,
    memberSince: "2019-04",
    languageHint: "hi-IN", secondaryLanguage: "gu-IN",
    pnsMapped: true, pnsNumberMasked: "+91-80XXXXX411", registeredNumbers: 2,
    catalog: [
      { productId: 70000101, name: "SS 304 Seamless Pipe", price: 210, unit: "kg", moq: "100 kg", specs: { Grade: "304", Size: "1/2 inch - 4 inch" } },
      { productId: 70000102, name: "SS 316 Welded Tube", price: null, unit: "kg", moq: "200 kg", specs: { Grade: "316L" } },
      { productId: 70000103, name: "SS Round Bar", price: 195, unit: "kg", moq: "500 kg" },
    ],
    buyLeadInterests: ["SS pipes bulk orders", "Gujarat & Maharashtra buyers"],
    leadCategories: [
      { mcatId: 90011, name: "Stainless Steel Pipes", count: 6, grade: "A" },
      { mcatId: 90012, name: "SS Round Bars", count: 2, grade: "A" },
    ],
    buyLeads: [
      { offerId: 880000001, title: "SS 304 pipes, 2 tonnes, Pune", mcatId: 90011, status: "expired", consumedAt: "2026-09-18T10:20:00.000Z" },
      { offerId: 880000002, title: "SS round bar 316, 500 kg, Surat", mcatId: 90012, status: "expired", consumedAt: "2026-09-25T07:45:00.000Z" },
      { offerId: 880000003, title: "SS seamless pipe 1 inch, 800 kg, Nashik", mcatId: 90011, status: "active" },
    ],
  },
  {
    glid: "90000002",
    isDemo: true,
    displayName: "Deccan PET Packaging",
    contactPerson: "Kiran Reddy",
    companyName: "Deccan PET Packaging Pvt Ltd",
    category: "PET Bottles & Jars",
    subCategories: ["Pharma Bottles", "Food Jars"],
    city: "Hyderabad", state: "Telangana", location: "Hyderabad",
    membership: "IM Star (demo)", trustSeal: true, gstVerified: true, yearEstablished: 2012,
    memberSince: "2021-06",
    languageHint: "te-IN", secondaryLanguage: "en-IN",
    pnsMapped: true, pnsNumberMasked: "+91-80XXXXX620", registeredNumbers: 2,
    catalog: [
      { productId: 70000201, name: "100 ml Amber PET Bottle", price: 4.5, unit: "piece", moq: "5000 pieces" },
      { productId: 70000202, name: "500 ml Wide Mouth PET Jar", price: 9, unit: "piece", moq: "2000 pieces" },
      { productId: 70000203, name: "Child Resistant Cap", price: null, unit: "piece", moq: "10000 pieces" },
    ],
    buyLeadInterests: ["Pharma companies", "Nutraceutical brands"],
    leadCategories: [{ mcatId: 90021, name: "PET Bottles", count: 9, grade: "A" }],
    buyLeads: [
      { offerId: 880000011, title: "Amber PET bottles 100 ml, 20k pcs, Hyderabad", mcatId: 90021, status: "expired", consumedAt: "2026-09-29T12:00:00.000Z" },
      { offerId: 880000012, title: "PET jars 500 ml, 5k pcs, Chennai", mcatId: 90021, status: "active" },
    ],
  },
];

/** When each seller joined IndiaMART ("YYYY-MM"); unknown for the real sellers. */
export const MEMBER_SINCE: Record<string, string> = Object.fromEntries(
  DEMO_REGISTRY.filter((e) => e.memberSince).map((e) => [e.glid, e.memberSince!]),
);

/** GLIDs that get a stored profile at seed time. */
export const SEEDED_PROFILE_GLIDS = DEMO_REGISTRY.map((e) => e.glid);

export interface SeedLearning {
  field: PreferenceKey;
  value: string;
  observations: number;
  note: string;
  quote?: string;
}

/** Synthetic prior-call learnings so the demo sellers start "Established". */
export const SEED_LEARNINGS: Record<string, { interactions: number; learnings: SeedLearning[]; memory: { category: "business" | "pricing" | "availability" | "preference" | "product"; fact: string }[]; traits: string[] }> = {
  "90000001": {
    interactions: 3,
    learnings: [
      { field: "responseLength", value: "concise", observations: 2, note: "Seller asked to keep it short in 2 earlier (synthetic) calls.", quote: "Seedha point pe aaiye, time kam hai." },
      { field: "formality", value: "formal", observations: 3, note: "Seller consistently used 'aap' and preferred respectful address." },
      { field: "bestTimeToCall", value: "after 4 PM", observations: 2, note: "Seller asked to be called after 4 PM.", quote: "Chaar baje ke baad call kijiye." },
    ],
    memory: [
      { category: "business", fact: "Supplies mainly to fabricators in Gujarat; wants more Maharashtra buyers." },
      { category: "pricing", fact: "Revises SS 304 prices every Monday based on LME rates." },
    ],
    traits: ["Busy, time-conscious", "Price-sensitive", "Prefers Hindi with some English technical terms"],
  },
  "90000002": {
    interactions: 4,
    learnings: [
      { field: "language", value: "en-IN", observations: 3, note: "Seller switched to English in 3 earlier (synthetic) calls.", quote: "Let's continue in English, please." },
      { field: "tone", value: "direct", observations: 2, note: "Seller responded best to direct, numbers-first answers." },
      { field: "objectionHandling", value: "data-backed", observations: 2, note: "Seller asked for data (lead counts, response rates) before agreeing." },
    ],
    memory: [
      { category: "business", fact: "Has an in-house sales team that handles the Lead Manager (LMS) inbox." },
      { category: "availability", fact: "Factory closed on Sundays." },
    ],
    traits: ["Data-driven", "Decisive", "Prefers English"],
  },
};

export const DEFAULT_LANGUAGE: LanguageCode = "hi-IN";
