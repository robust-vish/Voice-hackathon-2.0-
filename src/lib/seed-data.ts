import type { LanguageCode, PreferenceKey, RegistryEntry } from "./types";

// All entries below are SYNTHETIC demonstration sellers. They are not real IndiaMART
// sellers, phone numbers or business metrics.

export const DEMO_REGISTRY: RegistryEntry[] = [
  {
    glid: "DEMO_GLID_001",
    displayName: "Shree Ganesh Steel Traders",
    contactPerson: "Ramesh Agarwal",
    companyName: "Shree Ganesh Steel Traders",
    category: "Stainless Steel Pipes & Tubes",
    subCategories: ["SS Pipes", "SS Round Bars"],
    city: "Ahmedabad", state: "Gujarat",
    membership: "Mini Dynamic Catalog (demo)", trustSeal: true, gstVerified: true, yearEstablished: 2009,
    languageHint: "hi-IN", secondaryLanguage: "gu-IN",
    pnsMapped: true, pnsNumberMasked: "+91-80XXXXX411", registeredNumbers: 2,
    catalog: [
      { offerId: "DEMO_OFR_1001", name: "SS 304 Seamless Pipe", price: 210, unit: "kg", moq: "100 kg", specs: { Grade: "304", Size: "1/2 inch - 4 inch" } },
      { offerId: "DEMO_OFR_1002", name: "SS 316 Welded Tube", price: null, unit: "kg", moq: "200 kg", specs: { Grade: "316L" } },
      { offerId: "DEMO_OFR_1003", name: "SS Round Bar", price: 195, unit: "kg", moq: "500 kg" },
    ],
    buyLeadInterests: ["SS pipes bulk orders", "Gujarat & Maharashtra buyers"],
  },
  {
    glid: "DEMO_GLID_002",
    displayName: "Lakshmi Knit Fabrics",
    contactPerson: "S. Lakshmi Narayanan",
    companyName: "Lakshmi Knit Fabrics",
    category: "Cotton Knitted Fabric",
    subCategories: ["Single Jersey", "Rib Fabric"],
    city: "Tiruppur", state: "Tamil Nadu",
    membership: "Free listing (demo)", trustSeal: false, gstVerified: true, yearEstablished: 2016,
    languageHint: "ta-IN", secondaryLanguage: "en-IN",
    pnsMapped: true, pnsNumberMasked: "+91-80XXXXX732", registeredNumbers: 1,
    catalog: [
      { offerId: "DEMO_OFR_2001", name: "Single Jersey Cotton Fabric", price: 320, unit: "kg", moq: "300 kg" },
      { offerId: "DEMO_OFR_2002", name: "1x1 Rib Fabric", price: null, unit: "kg", moq: "200 kg" },
    ],
    buyLeadInterests: ["Export garment units", "Bulk fabric orders"],
  },
  {
    glid: "DEMO_GLID_003",
    displayName: "Kolkata Jute Crafts",
    contactPerson: "Subhash Mondal",
    companyName: "Kolkata Jute Crafts",
    category: "Jute Bags",
    subCategories: ["Shopping Bags", "Promotional Bags"],
    city: "Kolkata", state: "West Bengal",
    membership: "Free listing (demo)", trustSeal: false, gstVerified: false, yearEstablished: 2019,
    languageHint: "bn-IN", secondaryLanguage: "hi-IN",
    pnsMapped: true, pnsNumberMasked: "+91-80XXXXX155", registeredNumbers: 1,
    catalog: [
      { offerId: "DEMO_OFR_3001", name: "Printed Jute Shopping Bag", price: 45, unit: "piece", moq: "500 pieces" },
      { offerId: "DEMO_OFR_3002", name: "Jute Wine Bottle Bag", price: null, unit: "piece", moq: "1000 pieces" },
    ],
    buyLeadInterests: ["Corporate gifting", "Retail chains"],
  },
  {
    glid: "DEMO_GLID_004",
    displayName: "Pune Agro Machinery",
    contactPerson: "Sunil Patil",
    companyName: "Pune Agro Machinery Works",
    category: "Agricultural Machinery",
    subCategories: ["Power Tillers", "Power Weeders"],
    city: "Pune", state: "Maharashtra",
    membership: "Maximiser (demo)", trustSeal: true, gstVerified: true, yearEstablished: 2004,
    languageHint: "mr-IN", secondaryLanguage: "hi-IN",
    pnsMapped: true, pnsNumberMasked: "+91-80XXXXX908", registeredNumbers: 3,
    catalog: [
      { offerId: "DEMO_OFR_4001", name: "7 HP Mini Power Tiller", price: 68000, unit: "piece", moq: "1 piece" },
      { offerId: "DEMO_OFR_4002", name: "Petrol Power Weeder", price: null, unit: "piece", moq: "1 piece" },
    ],
    buyLeadInterests: ["Dealers in Maharashtra", "Farmer producer organisations"],
  },
  {
    glid: "DEMO_GLID_005",
    displayName: "Deccan PET Packaging",
    contactPerson: "Kiran Reddy",
    companyName: "Deccan PET Packaging Pvt Ltd",
    category: "PET Bottles & Jars",
    subCategories: ["Pharma Bottles", "Food Jars"],
    city: "Hyderabad", state: "Telangana",
    membership: "IM Star (demo)", trustSeal: true, gstVerified: true, yearEstablished: 2012,
    languageHint: "te-IN", secondaryLanguage: "en-IN",
    pnsMapped: true, pnsNumberMasked: "+91-80XXXXX620", registeredNumbers: 2,
    catalog: [
      { offerId: "DEMO_OFR_5001", name: "100 ml Amber PET Bottle", price: 4.5, unit: "piece", moq: "5000 pieces" },
      { offerId: "DEMO_OFR_5002", name: "500 ml Wide Mouth PET Jar", price: 9, unit: "piece", moq: "2000 pieces" },
      { offerId: "DEMO_OFR_5003", name: "Child Resistant Cap", price: null, unit: "piece", moq: "10000 pieces" },
    ],
    buyLeadInterests: ["Pharma companies", "Nutraceutical brands"],
  },
  {
    glid: "DEMO_GLID_006",
    displayName: "Ludhiana Hosiery House",
    contactPerson: "Gurpreet Singh",
    companyName: "Ludhiana Hosiery House",
    category: "Woolen Hosiery",
    subCategories: ["Sweaters", "Thermal Wear"],
    city: "Ludhiana", state: "Punjab",
    membership: "Free listing (demo)", trustSeal: false, gstVerified: true, yearEstablished: 1998,
    languageHint: "pa-IN", secondaryLanguage: "hi-IN",
    pnsMapped: false, registeredNumbers: 1,
    catalog: [
      { offerId: "DEMO_OFR_6001", name: "Men's Woolen Sweater", price: 450, unit: "piece", moq: "50 pieces" },
      { offerId: "DEMO_OFR_6002", name: "Thermal Inner Set", price: null, unit: "set", moq: "100 sets" },
    ],
    buyLeadInterests: ["Winter wear wholesalers"],
  },
  // Present in the (demo) registry but WITHOUT a persona profile yet — searching
  // these initialises a Provisional profile from registry metadata.
  {
    glid: "DEMO_GLID_007",
    displayName: "Malabar Spice Exports",
    contactPerson: "Anoop Varghese",
    category: "Whole Spices",
    city: "Kochi", state: "Kerala",
    membership: "Free listing (demo)", gstVerified: true,
    languageHint: "ml-IN", secondaryLanguage: "en-IN",
    pnsMapped: true, pnsNumberMasked: "+91-80XXXXX377", registeredNumbers: 1,
    catalog: [
      { offerId: "DEMO_OFR_7001", name: "Green Cardamom 8mm", price: null, unit: "kg", moq: "10 kg" },
      { offerId: "DEMO_OFR_7002", name: "Black Pepper 550 GL", price: 640, unit: "kg", moq: "25 kg" },
    ],
  },
  {
    glid: "DEMO_GLID_008",
    displayName: "Mysuru Silk Sarees",
    contactPerson: "Manjunath Gowda",
    category: "Silk Sarees",
    city: "Mysuru", state: "Karnataka",
    membership: "Free listing (demo)",
    languageHint: "kn-IN", secondaryLanguage: "en-IN",
    pnsMapped: true, pnsNumberMasked: "+91-80XXXXX290", registeredNumbers: 1,
    catalog: [{ offerId: "DEMO_OFR_8001", name: "Pure Mysore Crepe Silk Saree", price: null, unit: "piece", moq: "5 pieces" }],
  },
];

/** When each demo seller joined IndiaMART ("YYYY-MM"), used for "you've been with us for X years". */
export const MEMBER_SINCE: Record<string, string> = {
  DEMO_GLID_001: "2019-04",
  DEMO_GLID_002: "2025-11",
  DEMO_GLID_003: "2024-02",
  DEMO_GLID_004: "2016-08",
  DEMO_GLID_005: "2021-06",
  DEMO_GLID_006: "2023-01",
  DEMO_GLID_007: "2025-03",
  DEMO_GLID_008: "2022-09",
};
for (const e of DEMO_REGISTRY) e.memberSince ??= MEMBER_SINCE[e.glid];

/** GLIDs that get a stored profile at seed time (the rest are registry-only). */
export const SEEDED_PROFILE_GLIDS = ["DEMO_GLID_001", "DEMO_GLID_002", "DEMO_GLID_003", "DEMO_GLID_004", "DEMO_GLID_005", "DEMO_GLID_006"];

export interface SeedLearning {
  field: PreferenceKey;
  value: string;
  observations: number;
  note: string;
  quote?: string;
}

/** Synthetic prior-call learnings so some demo sellers start "Established". */
export const SEED_LEARNINGS: Record<string, { interactions: number; learnings: SeedLearning[]; memory: { category: "business" | "pricing" | "availability" | "preference" | "product"; fact: string }[]; traits: string[] }> = {
  DEMO_GLID_001: {
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
  DEMO_GLID_002: {
    interactions: 1,
    learnings: [
      { field: "explanationDetail", value: "high", observations: 1, note: "Seller asked for a step-by-step explanation of how BuyLeads work.", quote: "Konjam detail-aa sollunga, BuyLead eppadi work aagudhu?" },
    ],
    memory: [{ category: "business", fact: "Interested in export garment buyers; new to IndiaMART lead management." }],
    traits: ["Curious, asks clarifying questions", "New to the platform"],
  },
  DEMO_GLID_005: {
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
