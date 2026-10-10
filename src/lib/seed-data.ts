import type { LanguageCode, LeadCategory, PreferenceKey, RegistryEntry } from "./types";

// Seller registry used by the app. Sellers are identified by a numeric GLID; BuyLeads by a
// numeric offer id (a BuyLead expires once consumed).
//
// REAL sellers (isDemo: false) were provided by the IndiaMART team. Their raw mobile numbers
// live ONLY here / in data/registry.json. They are read out to the seller only when the seller
// asks for their own number on a call; profiles, API responses and the LLM only ever see
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
    displayName: "Soumya Sarkar",
    contactPerson: "Soumya Sarkar",
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
  {
    glid: "90000003",
    isDemo: true,
    displayName: "Sri Lakshmi Textiles",
    contactPerson: "Lakshmi Narayanan",
    companyName: "Sri Lakshmi Textiles",
    category: "Cotton Yarn & Grey Fabric",
    subCategories: ["Cotton Yarn", "Grey Fabric"],
    city: "Coimbatore", state: "Tamil Nadu", location: "Coimbatore",
    membership: "Mini Dynamic Catalog (demo)", trustSeal: false, gstVerified: true, yearEstablished: 2004,
    memberSince: "2017-08",
    languageHint: "ta-IN", secondaryLanguage: "en-IN",
    pnsMapped: true, pnsNumberMasked: "+91-80XXXXX733", registeredNumbers: 1,
    catalog: [
      { productId: 70000301, name: "30s Combed Cotton Yarn", price: 285, unit: "kg", moq: "500 kg" },
      { productId: 70000302, name: "Grey Cotton Fabric 60 inch", price: null, unit: "meter", moq: "2000 meter" },
    ],
    buyLeadInterests: ["Garment exporters in Tiruppur", "Bulk weavers"],
    leadCategories: [
      { mcatId: 90031, name: "Cotton Yarn", count: 7, grade: "A" },
      { mcatId: 90032, name: "Grey Fabric", count: 3, grade: "B" },
    ],
    buyLeads: [
      { offerId: 880000021, title: "Combed cotton yarn 30s, 1 tonne, Tiruppur", mcatId: 90031, status: "expired", consumedAt: "2026-09-22T09:30:00.000Z" },
      { offerId: 880000022, title: "Grey fabric 60 inch, 5000 m, Erode", mcatId: 90032, status: "active" },
    ],
  },
  {
    glid: "90000004",
    isDemo: true,
    displayName: "Punjab Agro Implements",
    contactPerson: "Gurpreet Singh",
    companyName: "Punjab Agro Implements",
    category: "Agricultural Implements",
    subCategories: ["Rotavators", "Tractor Trolleys"],
    city: "Ludhiana", state: "Punjab", location: "Ludhiana",
    membership: "IM Star (demo)", trustSeal: true, gstVerified: true, yearEstablished: 1998,
    memberSince: "2015-03",
    languageHint: "pa-IN", secondaryLanguage: "hi-IN",
    pnsMapped: true, pnsNumberMasked: "+91-80XXXXX518", registeredNumbers: 2,
    catalog: [
      { productId: 70000401, name: "6 Feet Rotavator", price: 98000, unit: "piece", moq: "1 piece" },
      { productId: 70000402, name: "Hydraulic Tractor Trolley", price: null, unit: "piece", moq: "1 piece" },
    ],
    buyLeadInterests: ["Farmers in UP and Haryana", "Dealers"],
    leadCategories: [
      { mcatId: 90041, name: "Rotavators", count: 11, grade: "A" },
      { mcatId: 90042, name: "Tractor Trolleys", count: 4, grade: "A" },
    ],
    buyLeads: [
      { offerId: 880000031, title: "Rotavator 6 ft, 3 units, Meerut", mcatId: 90041, status: "expired", consumedAt: "2026-09-30T06:15:00.000Z" },
      { offerId: 880000032, title: "Tractor trolley, 2 units, Karnal", mcatId: 90042, status: "active" },
    ],
  },
  {
    glid: "90000005",
    isDemo: true,
    displayName: "Pink City Handicrafts",
    contactPerson: "Anjali Sharma",
    companyName: "Pink City Handicrafts",
    category: "Blue Pottery & Home Decor",
    subCategories: ["Blue Pottery", "Wooden Handicrafts"],
    city: "Jaipur", state: "Rajasthan", location: "Jaipur",
    membership: "Free listing (demo)", trustSeal: false, gstVerified: true, yearEstablished: 2016,
    memberSince: "2022-01",
    languageHint: "hi-IN", secondaryLanguage: "en-IN",
    pnsMapped: false, registeredNumbers: 1,
    catalog: [
      { productId: 70000501, name: "Blue Pottery Vase 10 inch", price: 650, unit: "piece", moq: "20 pieces" },
      { productId: 70000502, name: "Hand-painted Wooden Elephant", price: null, unit: "piece", moq: "50 pieces" },
    ],
    buyLeadInterests: ["Gift shops", "Hotel interior buyers"],
    leadCategories: [{ mcatId: 90051, name: "Blue Pottery", count: 2, grade: "B" }],
    buyLeads: [
      { offerId: 880000041, title: "Blue pottery vases, 100 pcs, Delhi", mcatId: 90051, status: "active" },
    ],
  },
  {
    glid: "90000006",
    isDemo: true,
    displayName: "Sai Electricals & Switchgear",
    contactPerson: "Prakash Patil",
    companyName: "Sai Electricals & Switchgear",
    category: "Switchgear & Electrical Panels",
    subCategories: ["MCB", "Distribution Boards"],
    city: "Pune", state: "Maharashtra", location: "Pune",
    membership: "IM Leader (demo)", trustSeal: true, gstVerified: true, yearEstablished: 2007,
    memberSince: "2014-11",
    languageHint: "mr-IN", secondaryLanguage: "hi-IN",
    pnsMapped: true, pnsNumberMasked: "+91-80XXXXX902", registeredNumbers: 3,
    catalog: [
      { productId: 70000601, name: "32A Double Pole MCB", price: 410, unit: "piece", moq: "50 pieces" },
      { productId: 70000602, name: "8 Way Distribution Board", price: 1850, unit: "piece", moq: "10 pieces" },
      { productId: 70000603, name: "LT Control Panel", price: null, unit: "piece", moq: "1 piece" },
    ],
    buyLeadInterests: ["Builders in Pune & Mumbai", "Electrical contractors"],
    leadCategories: [
      { mcatId: 90061, name: "MCB", count: 9, grade: "A" },
      { mcatId: 90062, name: "Electrical Panels", count: 5, grade: "A" },
    ],
    buyLeads: [
      { offerId: 880000051, title: "32A MCB, 500 pcs, Mumbai", mcatId: 90061, status: "expired", consumedAt: "2026-09-26T11:40:00.000Z" },
      { offerId: 880000052, title: "LT panel, 2 units, Nashik", mcatId: 90062, status: "active" },
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
  "90000003": {
    interactions: 2,
    learnings: [
      { field: "language", value: "ta-IN", observations: 2, note: "Seller replied in Tamil in 2 earlier (synthetic) calls.", quote: "தமிழ்ல பேசுங்க." },
      { field: "pace", value: "slow", observations: 2, note: "Seller asked the agent to speak slowly.", quote: "Konjam medhuva pesunga." },
    ],
    memory: [{ category: "business", fact: "Sells mostly to garment exporters in Tiruppur." }],
    traits: ["Prefers Tamil", "Likes a slower pace", "Relationship-driven"],
  },
  "90000004": {
    interactions: 3,
    learnings: [
      { field: "responseLength", value: "concise", observations: 3, note: "Seller wanted short answers in 3 earlier (synthetic) calls.", quote: "Seedhi gall karo ji." },
      { field: "tone", value: "direct", observations: 2, note: "Seller responds best to direct, no-nonsense answers." },
      { field: "voiceGender", value: "male", observations: 2, note: "Seller asked for a male voice twice.", quote: "Male voice vich gall karo." },
    ],
    memory: [{ category: "availability", fact: "Busy at the workshop till 2 PM; free in the afternoon." }],
    traits: ["Busy, time-conscious", "Direct", "Prefers a male voice"],
  },
  "90000005": {
    interactions: 1,
    learnings: [
      { field: "explanationDetail", value: "high", observations: 1, note: "New to IndiaMART; asked for step-by-step help in the app.", quote: "Thoda detail mein samjhaiye, main naya hoon." },
      { field: "formality", value: "formal", observations: 1, note: "Seller used respectful 'aap' throughout." },
    ],
    memory: [{ category: "business", fact: "Small family workshop; wants more hotel and gift-shop buyers." }],
    traits: ["New to the seller app", "Needs step-by-step guidance", "Price-sensitive"],
  },
  "90000006": {
    interactions: 4,
    learnings: [
      { field: "language", value: "mr-IN", observations: 3, note: "Seller switched to Marathi in 3 earlier (synthetic) calls.", quote: "मराठीत बोला." },
      { field: "objectionHandling", value: "data-backed", observations: 2, note: "Seller asked for lead counts before discussing an upgrade." },
      { field: "bestTimeToCall", value: "after 6 PM", observations: 2, note: "Seller asked to be called after 6 PM.", quote: "Sandhyakali 6 nantar phone kara." },
    ],
    memory: [
      { category: "business", fact: "Supplies MCBs and panels to builders in Pune and Mumbai." },
      { category: "availability", fact: "On site visits during the day; reachable after 6 PM." },
    ],
    traits: ["Prefers Marathi", "Data-driven", "Call after 6 PM"],
  },
};

export const DEFAULT_LANGUAGE: LanguageCode = "hi-IN";
