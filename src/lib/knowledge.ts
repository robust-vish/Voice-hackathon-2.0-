// IndiaMART seller-side product knowledge for the voice agent.
//
// Sources: the IndiaMART team's description of the seller app (Home, BuyLeads, Lead Manager,
// Add Products) and IndiaMART's public help centre (help.indiamart.com):
//   how-to-consume-buyleads-in-indiamart, different-filter-for-buy-lead, improve-quality-of-buyleads,
//   irrelevant-buy-leads, set-buylead-preferences, indiamart-advantage-program, daily-bonus-buyleads,
//   buy-lead-vs-enquiry, transaction-history, lead-manager, maximise-conversion-of-buyleads,
//   buy-lead-relevancy-through-consumption, add-products-on-indiamart, preferred-number-service.
//
// Rules: only facts we are confident about. Exact per-plan BuyLead counts vary by plan/version,
// so the agent never quotes numbers — it offers to share plan details in the meeting.

export interface KnowledgeTopic {
  id: string;
  title: string;
  /** Lower-case words/phrases (English, Hinglish, Hindi) that make this topic relevant. */
  keywords: string[];
  facts: string[];
}

/** Always given to the agent (short). */
export const CORE_FACTS = [
  "The IndiaMART seller app has 4 main sections: Home (home page + seller profile), BuyLeads (the most important), Lead Manager (talk to buyers and close deals), and Add Products (the products the seller deals in).",
  "A BuyLead is a buyer's purchase requirement that IndiaMART filters and shares with matching sellers. A seller identifies a BuyLead by its offer ID.",
  "In BuyLeads the seller sees the requirement (product, quantity, buyer location, order value) BEFORE buying. Tapping 'Contact Buyer Now' consumes the BuyLead and reveals the buyer's contact details (name, mobile, email, address if available).",
  "Each BuyLead purchase uses 1 BuyLead from the seller's BuyLead balance, so the balance drains as they consume leads. More balance comes from paid subscriptions, which allot a fixed number of BuyLeads every week (plus daily bonus BuyLeads on paid plans).",
  "Which BuyLeads a seller gets depends on the products in their catalog (Add Products) and their BuyLead preferences (location and category).",
];

export const KNOWLEDGE: KnowledgeTopic[] = [
  {
    id: "app_sections",
    title: "Seller app sections",
    keywords: ["app", "section", "kahan", "where", "kaha", "home", "profile", "menu", "kaise dekhe", "कहाँ", "ऐप"],
    facts: [
      "Home: the seller's home page and seller/company profile (business details, contact, GST etc.). A complete profile builds buyer trust.",
      "BuyLeads: browse buyer requirements and buy them with 'Contact Buyer Now'. It has several pages/tabs: Relevant, Recent, Catalog, Shortlisted, Hidden, Expired, and a Search BuyLeads page.",
      "Lead Manager: all conversations with buyers in one place (app, web and email) — reply, call, send quotations, set reminders — to close the deal.",
      "Add Products: add the products the seller deals in. These products decide which BuyLeads the seller is shown.",
    ],
  },
  {
    id: "buylead_tabs",
    title: "BuyLeads pages / tabs",
    keywords: ["relevant", "recent", "catalog lead", "shortlist", "hidden", "hide", "expired", "tab", "page", "naye lead", "new lead", "latest", "purane", "star"],
    facts: [
      "Relevant Leads: BuyLeads matched to the seller's products, preferences and past consumption.",
      "Recent Leads: the newest BuyLeads with the most recent on top — good for being first to contact a buyer.",
      "Catalog Leads: BuyLeads for the products listed in the seller's own catalog.",
      "Shortlisted Leads: leads the seller star-marked to look at later. Shortlisting also teaches IndiaMART what kind of leads the seller wants.",
      "Hidden Leads: leads the seller chose to hide from the main list; they can still be viewed there.",
      "Expired Leads: leads that can no longer be bought — a BuyLead expires once it has been bought by the maximum number of suppliers (the help centre says the 6th supplier) or if the buyer cancels the requirement.",
      "Search BuyLeads: search by product name to find BuyLeads for any product, then filter the results.",
      "Bought (consumed) BuyLeads and their details are listed in Transaction History under the BuyLeads section.",
    ],
  },
  {
    id: "filters",
    title: "BuyLead filters",
    keywords: ["filter", "location", "city", "area", "state", "shehar", "sheher", "order value", "bada order", "big order", "bulk", "category", "region", "शहर", "इलाक", "फ़िल्टर", "फिल्टर"],
    facts: [
      "Filters are at the top of the BuyLeads tabs: Location (city, state, region), Categories/Products, Order Value (to find large orders), Lead Type (Bulk / Business), and Saved Filters (the seller's own saved filter sets).",
      "Using filters helps the seller find more of the right BuyLeads quickly and spend balance only on suitable ones.",
    ],
  },
  {
    id: "preferences",
    title: "BuyLead preferences",
    keywords: ["preference", "settings", "irrelevant", "relevant nahi", "kaam ke nahi", "faltu lead", "bekar lead", "wrong lead", "galat lead", "outside", "bahar", "mere area", "other city", "doosre", "दूसरे", "गलत", "बेकार"],
    facts: [
      "BuyLead Preferences (in Settings → BuyLead Preferences) let the seller choose and exclude locations and categories they don't want BuyLeads for.",
      "To get more relevant BuyLeads: keep the catalog complete (clear product names, good images, specifications, price) and products mapped to the correct category; remove products they no longer sell.",
      "Mark unsuitable BuyLeads as 'Not Relevant' and shortlist good ones — IndiaMART learns from this feedback.",
      "Consuming BuyLeads regularly also helps: IndiaMART learns the seller's consumption pattern and sends more leads like the ones they buy.",
    ],
  },
  {
    id: "balance",
    title: "BuyLead balance & subscriptions",
    keywords: ["balance", "credit", "khatam", "finish", "zero", "nahi bacha", "kitne lead", "how many lead", "weekly", "daily", "bonus", "subscription", "plan", "package", "paid", "price of plan", "kitne ka", "renew", "upgrade", "maximiser", "star", "leader", "trustseal", "बैलेंस", "खत्म", "प्लान"],
    facts: [
      "1 BuyLead purchase = 1 BuyLead from the balance. When the balance is used up, the seller can't buy more BuyLeads until new balance is allotted or they upgrade.",
      "Paid plans allot a fixed number of BuyLeads every week (allotted on Sunday, valid till Saturday, unused ones are NOT carried forward) plus daily bonus BuyLeads.",
      "Higher plans give more weekly BuyLeads. Plans include Mini Dynamic Catalog, TrustSEAL Pro, Maximiser Pro, IM Star Pro, IM Leader Pro and IM Industry Leader (higher plans also get extra category-wise BuyLeads).",
      "Because unused weekly BuyLeads lapse on Saturday, it's best to check and consume BuyLeads daily.",
      "Exact BuyLead counts and prices depend on the plan — don't quote numbers; offer that the team will share exact details (e.g. in the meeting).",
    ],
  },
  {
    id: "no_leads",
    title: "Few or no BuyLeads",
    keywords: ["no lead", "nahi aa rahe", "nahi mil rahe", "kam lead", "less lead", "few lead", "not getting", "lead nahi", "koi lead", "नहीं आ रहे", "नहीं मिल", "कम लीड"],
    facts: [
      "BuyLeads are shown for the products in the seller's catalog — adding all the products they deal in (Add Products) brings BuyLeads for those products.",
      "Check BuyLead Preferences aren't excluding the locations/categories they want.",
      "Use the Search BuyLeads page to look for leads for any product, and the Recent tab for the newest ones.",
      "Turn on BuyLead alerts (app notification, SMS, email) so new leads aren't missed.",
    ],
  },
  {
    id: "consume",
    title: "Buying a BuyLead",
    keywords: ["contact buyer", "consume", "purchase lead", "buy lead", "kharid", "number kaise", "buyer ka number", "contact", "खरीद", "नंबर"],
    facts: [
      "Open the BuyLead, check product, quantity, location and order value, then tap 'Contact Buyer Now'. One BuyLead is deducted and the buyer's contact details are shown.",
      "Best practice: call/message the buyer immediately after buying, send a quotation quickly, keep prices competitive, and follow up.",
      "After buying, the conversation and buyer details appear in Lead Manager.",
    ],
  },
  {
    id: "lead_manager",
    title: "Lead Manager",
    keywords: ["lead manager", "lms", "reply", "message", "chat", "quotation", "quote", "reminder", "follow up", "buyer se baat", "deal", "enquiry", "जवाब", "मैसेज"],
    facts: [
      "Lead Manager keeps all buyer conversations (app, web, email) in one place: reply instantly, call the buyer, attach files (images, PDF, DOC, Excel), use Saved Replies, Create Quotation, set Reminders, add Notes and Labels.",
      "A blue tick shows when the buyer has read the message.",
      "Direct enquiries (a buyer contacting the seller from their catalog) also land in Lead Manager — unlike BuyLeads, these don't need BuyLead balance.",
    ],
  },
  {
    id: "add_products",
    title: "Add Products",
    keywords: ["add product", "product add", "catalog", "listing", "product dal", "naya product", "new product", "image", "photo", "price update", "प्रोडक्ट", "कैटलॉग"],
    facts: [
      "Add Products: enter a clear product name buyers would search (e.g. 'SS 304 Seamless Pipe 1 inch'), choose the right category, add description, specifications, price (or price on request) and good photos (video optional).",
      "The products in the catalog decide which BuyLeads the seller gets, so they should list every product they want BuyLeads for.",
      "Listings with price and complete details get more buyer enquiries.",
    ],
  },
  {
    id: "pns",
    title: "PNS (Preferred Number Service)",
    keywords: ["pns", "virtual number", "call nahi aa", "calls not", "missed call", "phone number", "number change", "कॉल"],
    facts: [
      "PNS is a virtual number IndiaMART shows to buyers instead of the seller's real number; a buyer's call rings all of the seller's registered numbers (up to 5) together.",
    ],
  },
];

/** Picks the topics that match the seller's last message (plus the current stage's needs). */
export function relevantKnowledge(text: string, stage?: string, max = 3): KnowledgeTopic[] {
  const t = ` ${text.toLowerCase()} `;
  const scored = KNOWLEDGE.map((k) => ({ k, score: k.keywords.filter((w) => t.includes(w)).length })).filter((x) => x.score > 0);
  scored.sort((a, b) => b.score - a.score);
  const picked = scored.slice(0, max).map((x) => x.k);
  // Pitch stage always needs the subscription facts.
  if (stage === "pitch" && !picked.some((k) => k.id === "balance")) picked.push(KNOWLEDGE.find((k) => k.id === "balance")!);
  return picked;
}

export function knowledgePrompt(text: string, stage?: string): string {
  const topics = relevantKnowledge(text, stage);
  return [
    "INDIAMART SELLER APP KNOWLEDGE (the ONLY product facts you may state; if something isn't covered, say you'll check and get back — never guess):",
    ...CORE_FACTS.map((f) => `- ${f}`),
    ...topics.flatMap((k) => [`[${k.title}]`, ...k.facts.map((f) => `- ${f}`)]),
  ].join("\n");
}

/** Short, safe how-to tips for the template (no-LLM) path, keyed by issue type. */
export const QUICK_TIPS: { match: RegExp; en: string; hi: string }[] = [
  {
    match: /area|location|city|shehar|sheher|bahar|outside|doosre|other city|शहर|इलाक|बाहर/i,
    en: "You can fix this in two ways: set your locations in Settings → BuyLead Preferences, and use the Location filter at the top of the BuyLeads tab.",
    hi: "इसके दो तरीके हैं: Settings में BuyLead Preferences में अपनी locations set कीजिए, और BuyLeads tab में ऊपर Location filter लगाइए।",
  },
  {
    match: /irrelevant|relevant nahi|faltu|bekar|wrong|galat|kaam ke nahi|गलत|बेकार/i,
    en: "Mark unsuitable leads as 'Not Relevant' and shortlist the good ones — IndiaMART learns from that. Also make sure your products are listed in the right categories.",
    hi: "जो lead काम की न हो उसे 'Not Relevant' mark कीजिए और अच्छी leads को shortlist कीजिए — IndiaMART उसी से सीखता है। और products सही category में list हों, ये भी check कर लीजिए।",
  },
  {
    match: /nahi aa rahe|nahi mil|kam lead|less lead|few lead|not getting|no lead|नहीं आ रहे|नहीं मिल|कम/i,
    en: "BuyLeads come for the products in your catalog, so add every product you deal in from Add Products. You can also use Search BuyLeads and the Recent tab to find new leads.",
    hi: "BuyLeads आपके catalog के products के हिसाब से आते हैं, तो Add Products से अपने सारे products डाल दीजिए। Search BuyLeads और Recent tab से भी नई leads देख सकते हैं।",
  },
  {
    match: /balance|credit|khatam|finish|zero|बैलेंस|खत्म/i,
    en: "Each BuyLead uses one from your balance. Weekly BuyLeads are allotted on Sunday and lapse on Saturday, so it's best to use them daily — and a higher plan gives more BuyLeads every week.",
    hi: "हर BuyLead खरीदने पर balance से एक lead कम होती है। Weekly BuyLeads रविवार को मिलती हैं और शनिवार को lapse हो जाती हैं, तो रोज़ use करना अच्छा है — और बड़े plan में हर हफ्ते ज़्यादा BuyLeads मिलती हैं।",
  },
];

export function quickTip(issueText: string): { en: string; hi: string } | null {
  return QUICK_TIPS.find((q) => q.match.test(issueText)) ?? null;
}
