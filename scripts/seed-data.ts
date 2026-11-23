/**
 * Seed content. EVERY fact below comes from the official website
 * (labadira.com, read 2026-11-23) — see DEVELOPMENT_PLAN.md §1.3.
 * Unknown values are left null and are hidden on the public site.
 */
import type { Localized } from "../src/lib/localized";

type L = Localized;

/* ------------------------------------------------------------------ */
/* Photography (picture/)                                              */
/* ------------------------------------------------------------------ */

export const images: { file: string; key: string; category: string; alt: L }[] = [
  {
    file: "0c99b11b-ff70-4a64-8c7c-12c3b7d47dfc.jpg",
    key: "bedroom-arch-sea",
    category: "suites",
    alt: {
      fr: "Chambre blanche au crépuscule, lanternes ajourées et arche ouverte sur la Méditerranée",
      en: "White bedroom at dusk with pierced lanterns and an arch opening onto the Mediterranean",
      ar: "غرفة نوم بيضاء عند الغسق بفوانيس مخرّمة وقوس مطلّ على البحر الأبيض المتوسط",
    },
  },
  {
    file: "2f7e0815-22ce-412b-b5c6-74b0d083a333.jpg",
    key: "welcome-berries",
    category: "suites",
    alt: {
      fr: "Fruits rouges et flûte de champagne dans un salon baigné de lumière",
      en: "Fresh berries and a champagne flute in a light-filled sitting room",
      ar: "توت طازج وكأس شمبانيا في صالون مضيء",
    },
  },
  {
    file: "524449db-c9ed-46c0-bd2a-073985573fdb.jpg",
    key: "spa-hand-ritual",
    category: "spa",
    alt: {
      fr: "Soin des mains au Spa by Clarins",
      en: "Hand treatment at the Spa by Clarins",
      ar: "علاج لليدين في Spa by Clarins",
    },
  },
  {
    file: "784aff1b-b371-413b-9fdc-9479498f8273.jpg",
    key: "terrace-whirlpool",
    category: "suites",
    alt: {
      fr: "Terrasse avec bain à remous et lit de repos face à la baie de Hammamet",
      en: "Terrace with whirlpool bath and daybed facing the Bay of Hammamet",
      ar: "تراس مع حوض استحمام دوّامي وسرير استرخاء مطلّ على خليج الحمامات",
    },
  },
  {
    file: "8a253fd1-ef3d-4135-adc4-e200b820e4dc.jpg",
    key: "courtyard-pool-night",
    category: "architecture",
    alt: {
      fr: "Patio et bassin illuminés la nuit, palmiers, arcades et coupole blanche",
      en: "Courtyard pool lit at night with palms, arcades and a white dome",
      ar: "فناء ومسبح مضاءان ليلاً بين النخيل والأقواس والقبة البيضاء",
    },
  },
  {
    file: "a01508f6-b184-4fda-83e3-007145d06b3b.jpg",
    key: "suite-living-screen",
    category: "suites",
    alt: {
      fr: "Salon de suite, moucharabieh sculpté et balcon ouvert sur la mer",
      en: "Suite sitting room with carved screen and a balcony open to the sea",
      ar: "صالون جناح بمشربية منحوتة وشرفة مفتوحة على البحر",
    },
  },
  {
    file: "aaabb8b4-2b27-4dfe-b91a-92ab63cc4648.jpg",
    key: "bathroom-zellige",
    category: "suites",
    alt: {
      fr: "Salle de bains en carreaux artisanaux blancs avec baignoire et double vasque",
      en: "Bathroom in white handmade tiles with bathtub and double vanity",
      ar: "حمّام ببلاط حرفي أبيض مع حوض استحمام ومغسلتين",
    },
  },
  {
    file: "b437abbe-b480-4099-885f-88a9e89bec79.jpg",
    key: "infinity-pool-portico",
    category: "pools",
    alt: {
      fr: "Piscine à débordement sous un portique blanc, face à la mer",
      en: "Infinity pool beneath a white portico facing the open sea",
      ar: "مسبح لا متناهي تحت رواق أبيض مطلّ على البحر",
    },
  },
  {
    file: "b818b55e-8ffa-4ce1-ae76-d4baee9eb663.jpg",
    key: "vanity-star-screen",
    category: "suites",
    alt: {
      fr: "Coiffeuse et paravent aux motifs d'étoiles ouvrant sur la chambre",
      en: "Vanity and star-patterned screen opening onto the bedroom",
      ar: "طاولة زينة وحاجز بزخارف نجمية يطلّ على غرفة النوم",
    },
  },
  {
    file: "d7239db0-1458-4087-9d43-bfc54887b9b5.jpg",
    key: "bedroom-carved-table",
    category: "suites",
    alt: {
      fr: "Chambre beige et blanche, table d'appoint sculptée et tapis rayé",
      en: "Beige and white bedroom with a carved side table and striped rug",
      ar: "غرفة نوم بالبيج والأبيض مع طاولة جانبية منحوتة وسجادة مخططة",
    },
  },
  {
    file: "e226c6fd-5c7f-4c23-840a-dd9e68022154.jpg",
    key: "suite-lounge-dining",
    category: "suites",
    alt: {
      fr: "Salon et coin repas d'une suite, placards ajourés en motifs géométriques",
      en: "Suite lounge and dining corner with geometric pierced cabinetry",
      ar: "صالون وركن طعام في جناح مع خزائن مخرّمة بزخارف هندسية",
    },
  },
];

/* ------------------------------------------------------------------ */
/* Suites                                                              */
/* ------------------------------------------------------------------ */

/** Placeholder values requested by the owner (2026-11-23). Flagged "TO VERIFY" in each suite's internal notes. */
const PLACEHOLDER_NOTE = "PLACEHOLDER (to verify): occupancy, bedding and amenities were filled with plausible values at the owner's request on 2026-11-23 — confirm with operations before launch.";

const commonAmenities: L[] = [
  { fr: "Climatisation", en: "Air conditioning", ar: "تكييف الهواء" },
  { fr: "Wi-Fi haut débit", en: "High-speed Wi-Fi", ar: "إنترنت لاسلكي عالي السرعة" },
  { fr: "Machine à café Nespresso", en: "Nespresso coffee machine", ar: "آلة قهوة Nespresso" },
  { fr: "Minibar", en: "Minibar", ar: "ميني بار" },
  { fr: "Coffre-fort", en: "In-room safe", ar: "خزنة" },
  { fr: "Télévision écran plat", en: "Flat-screen TV", ar: "تلفاز بشاشة مسطحة" },
  { fr: "Peignoirs et chaussons", en: "Bathrobes and slippers", ar: "أرواب وخفاف" },
  { fr: "Produits d'accueil Clarins", en: "Clarins bath amenities", ar: "مستحضرات استحمام Clarins" },
];
const legendAmenities: L[] = [
  ...commonAmenities,
  { fr: "Service de majordome", en: "Butler service", ar: "خدمة الخادم الشخصي" },
];
const kingBed: L = { fr: "Lit king size", en: "King-size bed", ar: "سرير كبير (كينغ)" };

type SuiteSeed = {
  slug: string;
  name: string;
  collection: "standard" | "legend";
  inventoryCategory: "fell" | "yasmine" | "nour" | "legend";
  tagline: L;
  description: L;
  areaSqm: number | null;
  bedConfiguration: L;
  view: "sea" | "pool_and_sea" | "partial_sea" | null;
  viewDetails: L;
  features: L[];
  maxOccupancy: number;
  amenities: L[];
  mainImage: string | null;
  gallery: string[];
  internalNotes?: string;
};

const kingOrTwin: L = { fr: "Lit king size ou deux lits jumeaux", en: "King-size bed or twin beds", ar: "سرير كبير (كينغ) أو سريران منفصلان" };

const legendCommon: L[] = [
  { fr: "Piscine privée surplombant la mer", en: "Private pool overlooking the sea", ar: "مسبح خاص مطلّ على البحر" },
  { fr: "Cheminée pour la saison fraîche", en: "Fireplace for the cooler season", ar: "مدفأة لموسم البرد" },
];

export const suites: SuiteSeed[] = [
  {
    slug: "fell-standard",
    name: "Fell Standard Suite",
    collection: "standard",
    inventoryCategory: "fell",
    tagline: { fr: "45 m² d'espace ouvert, l'artisanat local en majesté", en: "45 m² of open space, crafted by local artisans", ar: "45 م² من المساحة المفتوحة بلمسة الحرفيين المحليين" },
    description: {
      fr: "Nos suites Fell standard déploient 45 m² d'« open space » décoré dans un style oriental, à partir de l'artisanat local. Une harmonie monochrome de beige et de blanc, pensée pour le calme.",
      en: "Our standard Fell suites offer 45 m² of open space decorated in Oriental style using local handicrafts. A monochrome palette of beige and white, designed for calm.",
      ar: "تمتد أجنحة Fell القياسية على 45 م² من المساحة المفتوحة المزيّنة على الطراز الشرقي بأعمال الحرف المحلية، في تناغم أحادي اللون بين البيج والأبيض صُمّم للسكينة.",
    },
    areaSqm: 45,
    bedConfiguration: kingOrTwin,
    view: null,
    viewDetails: {},
    features: [
      { fr: "Espace ouvert de 45 m²", en: "45 m² open-plan space", ar: "مساحة مفتوحة 45 م²" },
      { fr: "Décor oriental, artisanat local", en: "Oriental decor, local craftsmanship", ar: "ديكور شرقي وحرف محلية" },
    ],
    maxOccupancy: 2,
    amenities: commonAmenities,
    mainImage: "bedroom-carved-table",
    gallery: ["vanity-star-screen"],
    internalNotes: `${PLACEHOLDER_NOTE} Photo-to-suite assignment is provisional.`,
  },
  {
    slug: "fell-sea-view",
    name: "Fell Sea View Suite",
    collection: "standard",
    inventoryCategory: "fell",
    tagline: { fr: "Le lit face à la baie de Hammamet", en: "A bed that faces the Bay of Hammamet", ar: "سرير يواجه خليج الحمامات" },
    description: {
      fr: "Nos suites Fell vue mer surplombent la baie de Hammamet. Sur 45 m² d'espace ouvert, le lit king size ou les lits jumeaux sont orientés pour contempler la baie.",
      en: "Our Fell suites with sea view overlook the Bay of Hammamet. Across 45 m² of open space, the king-size or twin beds are positioned to look out over the bay.",
      ar: "تطلّ أجنحة Fell ذات الإطلالة البحرية على خليج الحمامات. على مساحة مفتوحة تبلغ 45 م²، وُضع السرير الكبير أو السريران المنفصلان بحيث يطلّان على الخليج.",
    },
    areaSqm: 45,
    bedConfiguration: kingOrTwin,
    view: "sea",
    viewDetails: { fr: "Vue sur la baie de Hammamet", en: "View over the Bay of Hammamet", ar: "إطلالة على خليج الحمامات" },
    features: [{ fr: "Lits orientés vers la baie", en: "Beds positioned to face the bay", ar: "أسرّة موجّهة نحو الخليج" }],
    maxOccupancy: 2,
    amenities: commonAmenities,
    mainImage: "bedroom-arch-sea",
    gallery: [],
    internalNotes: `${PLACEHOLDER_NOTE} Photo-to-suite assignment is provisional.`,
  },
  {
    slug: "fell-superior",
    name: "Fell Superior Suite",
    collection: "standard",
    inventoryCategory: "fell",
    tagline: { fr: "La mer et la légendaire piscine à débordement", en: "The sea and the legendary infinity pool", ar: "البحر والمسبح اللامتناهي الأسطوري" },
    description: {
      fr: "Nos suites Fell supérieures, vue piscine et mer, dominent la baie de Hammamet et la légendaire piscine à débordement. 45 m², lit king size ou lits jumeaux.",
      en: "Our superior Fell suites with pool and sea view overlook the Bay of Hammamet and the legendary infinity pool. 45 m², king-size or twin beds.",
      ar: "تطلّ أجنحة Fell الفاخرة ذات الإطلالة على المسبح والبحر على خليج الحمامات والمسبح اللامتناهي الأسطوري. 45 م² مع سرير كبير أو سريرين منفصلين.",
    },
    areaSqm: 45,
    bedConfiguration: kingOrTwin,
    view: "pool_and_sea",
    viewDetails: { fr: "Vue piscine à débordement et mer", en: "Infinity pool and sea view", ar: "إطلالة على المسبح اللامتناهي والبحر" },
    features: [{ fr: "Vue sur la piscine à débordement", en: "Overlooks the infinity pool", ar: "إطلالة على المسبح اللامتناهي" }],
    maxOccupancy: 2,
    amenities: commonAmenities,
    mainImage: "welcome-berries",
    gallery: ["infinity-pool-portico"],
    internalNotes: `${PLACEHOLDER_NOTE} Photo-to-suite assignment is provisional.`,
  },
  {
    slug: "yasmine",
    name: "Yasmine Suite",
    collection: "standard",
    inventoryCategory: "yasmine",
    tagline: { fr: "Une salle de bains d'exception, la mer depuis le bain", en: "An exceptional bathroom, the sea from the bath", ar: "حمّام استثنائي والبحر من حوض الاستحمام" },
    description: {
      fr: "Dans les tons beige et blanc, la suite Yasmine de 45 m² accueille un lit king size ou deux lits jumeaux. Sa salle de bains, exceptionnellement grande, réunit baignoire et douche, avec une vue partielle sur la mer depuis le bain.",
      en: "In beige and white tones, the 45 m² Yasmine Suite has a king-size bed or two twin beds. Its exceptionally large bathroom contains both a bath and a shower, with a partial sea view from the bath.",
      ar: "بألوان البيج والأبيض، يضمّ جناح Yasmine بمساحة 45 م² سريراً كبيراً أو سريرين منفصلين. حمّامه الواسع على نحو استثنائي يجمع بين حوض الاستحمام والدش، مع إطلالة جزئية على البحر من الحوض.",
    },
    areaSqm: 45,
    bedConfiguration: kingOrTwin,
    view: "sea",
    viewDetails: { fr: "Vue sur la baie ; vue mer partielle depuis le bain", en: "Bay view; partial sea view from the bath", ar: "إطلالة على الخليج وإطلالة جزئية على البحر من الحوض" },
    features: [
      { fr: "Très grande salle de bains", en: "Exceptionally large bathroom", ar: "حمّام واسع على نحو استثنائي" },
      { fr: "Baignoire et douche", en: "Bath and shower", ar: "حوض استحمام ودش" },
    ],
    maxOccupancy: 2,
    amenities: commonAmenities,
    mainImage: "bathroom-zellige",
    gallery: [],
    internalNotes: `${PLACEHOLDER_NOTE} Photo-to-suite assignment is provisional.`,
  },
  {
    slug: "nour",
    name: "Nour Suite",
    collection: "standard",
    inventoryCategory: "nour",
    tagline: { fr: "120 m², une terrasse et un bain à remous face à la mer", en: "120 m², a terrace and a whirlpool facing the sea", ar: "120 م² مع تراس وحوض دوّامي مطلّ على البحر" },
    description: {
      fr: "Les suites Nour s'étendent sur 120 m², avec salon et chambre. Bain à l'italienne et douche, et une terrasse dotée d'un bain à remous extérieur surplombant la mer.",
      en: "Nour suites cover 120 m², with a sitting room and a bedroom. Italian bath and shower, and a terrace with an outdoor whirlpool bath overlooking the sea.",
      ar: "تمتد أجنحة Nour على 120 م² وتضمّ صالوناً وغرفة نوم، مع حمّام على الطراز الإيطالي ودش، وتراس مزوّد بحوض دوّامي خارجي مطلّ على البحر.",
    },
    areaSqm: 120,
    bedConfiguration: kingBed,
    view: "sea",
    viewDetails: { fr: "Terrasse surplombant la mer", en: "Terrace overlooking the sea", ar: "تراس مطلّ على البحر" },
    features: [
      { fr: "Salon et chambre séparés", en: "Separate sitting room and bedroom", ar: "صالون وغرفة نوم منفصلان" },
      { fr: "Terrasse avec bain à remous extérieur", en: "Terrace with outdoor whirlpool bath", ar: "تراس مع حوض دوّامي خارجي" },
      { fr: "Bain à l'italienne et douche", en: "Italian bath and shower", ar: "حمّام إيطالي ودش" },
    ],
    maxOccupancy: 3,
    amenities: commonAmenities,
    mainImage: "terrace-whirlpool",
    gallery: ["suite-living-screen", "suite-lounge-dining"],
    internalNotes: `${PLACEHOLDER_NOTE} Photo-to-suite assignment is provisional.`,
  },
  {
    slug: "leila-menchari",
    name: "Leïla Menchari Suite",
    collection: "legend",
    inventoryCategory: "legend",
    tagline: { fr: "Hommage à l'artiste tunisienne des vitrines Hermès", en: "A tribute to the Tunisian artist of Hermès' windows", ar: "تحية للفنانة التونسية صاحبة واجهات Hermès" },
    description: {
      fr: "Un hommage à Leïla Menchari, artiste tunisienne et première femme à imaginer les légendaires vitrines d'Hermès à Paris. Comme chaque suite Légende, elle offre une piscine privée face à la mer et, à la saison fraîche, la douceur d'un feu de cheminée.",
      en: "A tribute to Leïla Menchari, the Tunisian artist and first woman to craft Hermès' legendary window displays in Paris. Like every Legend suite, it offers a private pool overlooking the sea and, in the cooler season, a fireside to relax by.",
      ar: "تحية إلى ليلى منشاري، الفنانة التونسية وأول امرأة صمّمت واجهات Hermès الأسطورية في باريس. وكسائر أجنحة الأساطير، يوفّر مسبحاً خاصاً مطلّاً على البحر ومدفأة لأمسيات الموسم البارد.",
    },
    areaSqm: 160,
    bedConfiguration: kingBed,
    view: "sea",
    viewDetails: {},
    features: legendCommon,
    maxOccupancy: 4,
    amenities: legendAmenities,
    mainImage: null,
    gallery: [],
    internalNotes: `${PLACEHOLDER_NOTE} Area set to 160 m² like the other Legend suites (not stated on its official page). Suite inaugurated in 2025. No photography in picture/ — please upload.`,
  },
  ...(
    [
      ["claudia-cardinale", "Claudia Cardinale Suite", { fr: "L'actrice née en Tunisie, un décor aérien et détendu", en: "The Tunisian-born actress, in an airy, relaxed decor", ar: "الممثلة المولودة في تونس، في ديكور منعش ومريح" }, {
        fr: "Hommage à Claudia Cardinale, actrice d'origine italienne née en Tunisie, cette suite Légende joue la carte d'un décor aérien et détendu.",
        en: "A tribute to Claudia Cardinale, the actress of Italian origin born in Tunisia, this Legend suite has an airy and relaxed decor.",
        ar: "تحية إلى كلوديا كاردينالي، الممثلة ذات الأصول الإيطالية المولودة في تونس، يتميّز جناح الأساطير هذا بديكور منعش ومريح.",
      }],
      ["jean-cocteau", "Jean Cocteau Suite", { fr: "L'univers artistique des années 50", en: "The artistic world of the 1950s", ar: "العالم الفني لخمسينيات القرن الماضي" }, {
        fr: "Jean Cocteau, artiste lié à l'histoire de Hammamet, inspire cette suite Légende qui convoque l'univers artistique des années 50.",
        en: "Jean Cocteau, an artist linked to Hammamet's history, inspires this Legend suite, which evokes the artistic world of the 1950s.",
        ar: "يستلهم جناح الأساطير هذا روح جان كوكتو، الفنان المرتبط بتاريخ الحمامات، ويستحضر العالم الفني لخمسينيات القرن الماضي.",
      }],
      ["georges-sebastian", "Georges Sebastian Suite", { fr: "La riche histoire des années 30", en: "The rich history of the 1930s", ar: "التاريخ الغني لثلاثينيات القرن الماضي" }, {
        fr: "Dédiée à Georges Sebastian, aristocrate roumain, cette suite Légende raconte la riche histoire des années 30.",
        en: "Dedicated to Georges Sebastian, the Romanian aristocrat, this Legend suite tells the rich history of the 1930s.",
        ar: "مُهدى إلى جورج سيباستيان، الأرستقراطي الروماني، يروي جناح الأساطير هذا التاريخ الغني لثلاثينيات القرن الماضي.",
      }],
      ["wallis-simpson", "Wallis Simpson Suite", { fr: "Le monde sophistiqué des années 30", en: "The sophisticated world of the 1930s", ar: "العالم الراقي لثلاثينيات القرن الماضي" }, {
        fr: "La suite Wallis Simpson fait revivre le monde sophistiqué des années 30.",
        en: "The Wallis Simpson Suite brings back the sophisticated world of the 1930s.",
        ar: "يُحيي جناح Wallis Simpson العالم الراقي لثلاثينيات القرن الماضي.",
      }],
      ["paul-klee", "Paul Klee Suite", { fr: "Une suite riche en couleurs", en: "A suite rich in colour", ar: "جناح غنيّ بالألوان" }, {
        fr: "Paul Klee, l'un des artistes qui ont marqué l'histoire de Hammamet, inspire cette suite Légende riche en couleurs.",
        en: "Paul Klee, one of the artists who marked Hammamet's history, inspires this Legend suite, rich in colour.",
        ar: "يستلهم جناح الأساطير هذا روح بول كلي، أحد الفنانين الذين طبعوا تاريخ الحمامات، وهو جناح غنيّ بالألوان.",
      }],
    ] as const
  ).map(([slug, name, tagline, intro]): SuiteSeed => ({
    slug,
    name,
    collection: "legend",
    inventoryCategory: "legend",
    tagline,
    description: {
      fr: `${intro.fr} Chacune de nos six suites Légende s'étend sur 160 m², avec une piscine privée surplombant la mer et, à la saison fraîche, un feu de cheminée.`,
      en: `${intro.en} Each of our six Legend suites extends over 160 m², with a private pool overlooking the sea and, in the cooler season, a fireside to relax by.`,
      ar: `${intro.ar} يمتد كل جناح من أجنحة الأساطير الستة على 160 م²، مع مسبح خاص مطلّ على البحر ومدفأة لأمسيات الموسم البارد.`,
    },
    areaSqm: 160,
    bedConfiguration: kingBed,
    view: "sea",
    viewDetails: {},
    features: legendCommon,
    maxOccupancy: 4,
    amenities: legendAmenities,
    mainImage: null,
    gallery: [],
    internalNotes: `${PLACEHOLDER_NOTE} No photography in picture/ — please upload.`,
  })),
];

/* ------------------------------------------------------------------ */
/* Dining (Chef Ramzi Bouguila)                                        */
/* ------------------------------------------------------------------ */

export const restaurants = [
  {
    slug: "kamilah",
    name: "Kamilah",
    kind: "restaurant",
    cuisine: { fr: "Cuisine méditerranéenne et contemporaine", en: "Mediterranean & contemporary cuisine", ar: "مطبخ متوسطي ومعاصر" },
    description: {
      fr: "À la carte, face au panorama de la baie de Hammamet et de la piscine, autour d'une cuisine ouverte.",
      en: "À la carte, facing the panorama of the Bay of Hammamet and the pool, around an open kitchen.",
      ar: "قائمة طعام حسب الاختيار أمام بانوراما خليج الحمامات والمسبح، حول مطبخ مفتوح.",
    },
    hours: "12:00 – 00:00",
    season: { fr: "Service continu", en: "Non-stop service", ar: "خدمة متواصلة" },
    closedDays: {},
    menuUrl: "https://www.labadira.com/wp-content/uploads/2020/09/KAMILAH-ENG-2.pdf",
  },
  {
    slug: "adra",
    name: "Adra",
    kind: "restaurant",
    cuisine: { fr: "Cuisine tunisienne", en: "Tunisian cuisine", ar: "مطبخ تونسي" },
    description: {
      fr: "La table tunisienne à la carte, dans un décor oriental.",
      en: "Tunisian cuisine à la carte, in an Oriental setting.",
      ar: "المطبخ التونسي حسب الاختيار في ديكور شرقي.",
    },
    hours: "19:00 – 00:00",
    season: {},
    closedDays: { fr: "Fermé le lundi", en: "Closed on Mondays", ar: "مغلق يوم الاثنين" },
    menuUrl: null,
  },
  {
    slug: "zahila",
    name: "Zahila",
    kind: "restaurant",
    cuisine: { fr: "Petit-déjeuner", en: "Breakfast", ar: "فطور الصباح" },
    description: {
      fr: "Le petit-déjeuner sur une terrasse ombragée qui domine les piscines.",
      en: "Breakfast on a shaded terrace overlooking the pools.",
      ar: "فطور الصباح على تراس مظلّل يطلّ على المسابح.",
    },
    hours: "07:00 – 11:00",
    season: {},
    closedDays: {},
    menuUrl: null,
  },
  {
    slug: "beach-grill",
    name: "Beach Grill",
    kind: "restaurant",
    cuisine: { fr: "Salades et grillades", en: "Salads & grills", ar: "سلطات ومشويات" },
    description: {
      fr: "Une carte légère sur la terrasse panoramique face à la mer, ou depuis votre transat.",
      en: "A light menu on the panoramic terrace overlooking the sea, or from your deckchair.",
      ar: "قائمة خفيفة على التراس البانورامي المطلّ على البحر أو من كرسي الاسترخاء.",
    },
    hours: "12:00 – 19:00",
    season: { fr: "De juin à septembre", en: "June to September", ar: "من يونيو إلى سبتمبر" },
    closedDays: {},
    menuUrl: null,
  },
  {
    slug: "pool-bar",
    name: "Pool Bar",
    kind: "bar",
    cuisine: { fr: "Bar de la piscine à débordement", en: "Infinity pool bar", ar: "بار المسبح اللامتناهي" },
    description: { fr: "Au bord de la piscine à débordement.", en: "Beside the infinity pool.", ar: "بجانب المسبح اللامتناهي." },
    hours: "10:00 – 20:00",
    season: { fr: "D'avril à octobre", en: "April to October", ar: "من أبريل إلى أكتوبر" },
    closedDays: {},
    menuUrl: null,
  },
  {
    slug: "lobby-bar",
    name: "Lobby Bar",
    kind: "bar",
    cuisine: { fr: "Tapas, bibliothèque et cheminée", en: "Tapas, library & fireplace", ar: "تاباس ومكتبة ومدفأة" },
    description: {
      fr: "Tapas, bibliothèque et cheminée, avec une terrasse sur la mer.",
      en: "Tapas, a library and a fireplace, with a terrace over the sea.",
      ar: "تاباس ومكتبة ومدفأة مع تراس على البحر.",
    },
    hours: "08:00 – 00:00",
    season: { fr: "Service continu", en: "Non-stop service", ar: "خدمة متواصلة" },
    closedDays: {},
    menuUrl: null,
  },
  {
    slug: "sunset",
    name: "Sunset",
    kind: "bar",
    cuisine: { fr: "Bar du coucher de soleil", en: "Sunset bar", ar: "بار الغروب" },
    description: { fr: "Pour la lumière dorée de fin de journée.", en: "For the golden light at day's end.", ar: "لضوء نهاية اليوم الذهبي." },
    hours: "16:00 – 00:00",
    season: { fr: "De juin à septembre", en: "June to September", ar: "من يونيو إلى سبتمبر" },
    closedDays: {},
    menuUrl: null,
  },
];

/* ------------------------------------------------------------------ */
/* Spa by Clarins — facilities (verified)                              */
/* ------------------------------------------------------------------ */

export const spaFacilities: { title: L; description: L }[] = [
  { title: { fr: "Cabines de soins", en: "Treatment cabins", ar: "غرف العلاج" }, description: { fr: "Toute la gamme des soins et massages Clarins.", en: "The full range of Clarins treatments and massages.", ar: "كامل مجموعة علاجات وتدليك Clarins." } },
  { title: { fr: "Hammams", en: "Hammams", ar: "حمّامات تقليدية" }, description: { fr: "Le rituel de la chaleur et de la vapeur.", en: "The ritual of heat and steam.", ar: "طقس الحرارة والبخار." } },
  { title: { fr: "Piscine intérieure chauffée", en: "Heated indoor pool", ar: "مسبح داخلي مُدفّأ" }, description: { fr: "Semi-couverte, avec vue sur la Méditerranée.", en: "Semi-covered, with a view of the Mediterranean.", ar: "شبه مغطّى مع إطلالة على البحر الأبيض المتوسط." } },
  { title: { fr: "Yoga & fitness", en: "Yoga & fitness", ar: "اليوغا واللياقة" }, description: { fr: "Salles dédiées au yoga et à la remise en forme.", en: "Dedicated yoga and fitness rooms.", ar: "قاعات مخصّصة لليوغا واللياقة البدنية." } },
  { title: { fr: "Salon de thé", en: "Tea room", ar: "صالون شاي" }, description: { fr: "Un temps de pause après les soins.", en: "A pause after your treatments.", ar: "لحظة استراحة بعد العلاج." } },
  { title: { fr: "Coiffure, pédicure & nail bar", en: "Hair salon, pedicure & nail bar", ar: "تصفيف الشعر والعناية بالقدمين والأظافر" }, description: { fr: "Les dernières attentions avant le dîner.", en: "The finishing touches before dinner.", ar: "اللمسات الأخيرة قبل العشاء." } },
];

/* ------------------------------------------------------------------ */
/* Experiences & events                                                */
/* ------------------------------------------------------------------ */

export const experiencesSeed = [
  {
    slug: "concierge",
    title: { fr: "Conciergerie Clefs d'Or", en: "Clefs d'Or concierge", ar: "خدمة الكونسيرج Clefs d'Or" },
    description: {
      fr: "Notre concierge Clefs d'Or imagine pour vous des escapades exclusives et organise vos activités.",
      en: "Our Clefs d'Or concierge designs exclusive outings and arranges your activities.",
      ar: "يصمّم لكم الكونسيرج الحائز على شارة Clefs d'Or رحلات حصرية وينظّم أنشطتكم.",
    },
  },
  {
    slug: "culture",
    title: { fr: "Activités culturelles", en: "Cultural activities", ar: "أنشطة ثقافية" },
    description: {
      fr: "Sur les traces des artistes qui ont fait la légende de Hammamet depuis le début du XXe siècle.",
      en: "In the footsteps of the artists who have shaped Hammamet's legend since the early 20th century.",
      ar: "على خطى الفنانين الذين صنعوا أسطورة الحمامات منذ بداية القرن العشرين.",
    },
  },
  {
    slug: "sport",
    title: { fr: "Activités sportives", en: "Sports activities", ar: "أنشطة رياضية" },
    description: {
      fr: "Des activités sportives organisées sur demande par la conciergerie.",
      en: "Sports activities arranged on request by the concierge.",
      ar: "أنشطة رياضية تنظّمها خدمة الكونسيرج عند الطلب.",
    },
  },
];

export const eventsSeed = [
  {
    slug: "weddings",
    kind: "wedding",
    title: { fr: "Mariages", en: "Weddings", ar: "حفلات الزفاف" },
    description: {
      fr: "La Badira a été pensée pour rendre votre événement unique. Découvrez notre brochure mariage 2026–2027.",
      en: "La Badira has been designed to make your event unique. Discover our 2026–2027 wedding brochure.",
      ar: "صُمّمت La Badira لتجعل مناسبتكم فريدة. اكتشفوا كتيّب حفلات الزفاف 2026–2027.",
    },
    brochureUrl: "https://www.labadira.com/brochure_mariage_la_badira_2026_2027/",
  },
  {
    slug: "business",
    kind: "business",
    title: { fr: "Séminaires & incentives", en: "Seminars & incentives", ar: "الندوات ورحلات التحفيز" },
    description: {
      fr: "Séminaires, incentives et conférences dans un cadre d'exception. Découvrez notre brochure MICE 2026–2027.",
      en: "Seminars, incentives and conferences in an exceptional setting. Discover our 2026–2027 MICE brochure.",
      ar: "ندوات ورحلات تحفيزية ومؤتمرات في إطار استثنائي. اكتشفوا كتيّب الفعاليات المهنية 2026–2027.",
    },
    brochureUrl: "https://www.labadira.com/brochure_mice_la_badira_2026_2027/",
  },
];

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export const contactSettings = {
  address: { fr: "BP437, Hammamet 8050, Tunisie", en: "BP437, Hammamet 8050, Tunisia", ar: "ص.ب 437، الحمامات 8050، تونس" },
  phone: "+21670018180",
  // Confirmed by the owner on 2026-11-23.
  whatsapp: "+21625062098",
  email: "contact@labadira.com",
  mapsUrl: "",
  social: {
    facebook: "https://www.facebook.com/labadira/",
    instagram: "https://www.instagram.com/la_badira/",
    linkedin: "https://www.linkedin.com/company/labadira/",
    twitter: "https://twitter.com/labadira",
  },
  spaBookingUrl: "https://emea.spatime.com/hlbt8050",
  spaMenuUrl: "https://www.labadira.com/wp-content/uploads/2026/07/Menu-Spa-by-Clarins-La-Badira.pdf",
  conciergeBrochureUrl: "https://www.labadira.com/wp-content/uploads/2026/11/Brochure-Conciergerie-2026-2027.pdf",
  dressCodeUrl: "https://www.labadira.com/wp-content/themes/badira/images/dressCode.pdf",
  leadersClubUrl: "https://www.lhw.com/leaders-club-hub?hotel=6969",
};
