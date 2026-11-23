/** Editable pages and homepage sections (shared by the admin UI and actions). */
export const PAGE_KEYS = ["home", "concept", "suites", "dining", "spa", "experiences", "events", "gallery", "contact", "reservations"] as const;
export type PageKey = (typeof PAGE_KEYS)[number];

export const PAGE_LABELS: Record<PageKey, { label: string; path: string }> = {
  home: { label: "Accueil", path: "" },
  concept: { label: "Le Concept", path: "/concept" },
  suites: { label: "Suites", path: "/suites" },
  dining: { label: "Restaurants & Bars", path: "/dining" },
  spa: { label: "Spa & Bien-être", path: "/spa" },
  experiences: { label: "Expériences", path: "/experiences" },
  events: { label: "Événements & Mariages", path: "/events" },
  gallery: { label: "Galerie", path: "/gallery" },
  contact: { label: "Contact", path: "/contact" },
  reservations: { label: "Réservations", path: "/reservations" },
};

export const HOME_SECTIONS: { key: string; label: string; image: boolean }[] = [
  { key: "hero", label: "Héros (accroche)", image: false },
  { key: "intro", label: "Le Concept", image: true },
  { key: "suites", label: "Suites", image: false },
  { key: "dining", label: "Gastronomie", image: true },
  { key: "spa", label: "Spa", image: true },
  { key: "pools", label: "Piscines & mer", image: true },
  { key: "poolsInset", label: "Piscines — médaillon", image: true },
  { key: "experiences", label: "Expériences", image: false },
  { key: "events", label: "Événements", image: true },
  { key: "gallery", label: "Galerie", image: false },
  { key: "testimonials", label: "Témoignages", image: false },
  { key: "contact", label: "Contact", image: false },
];
