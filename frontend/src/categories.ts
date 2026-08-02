// label is the English default -- passed to i18next's t() as a fallback
// value (see components), not read directly anywhere. The real, current
// translation lives in i18n/en.ts and i18n/es.ts's categories.* keys.
export const CATEGORIES = [
  { slug: "sightseeing-culture", label: "Sightseeing & Culture" },
  { slug: "food-dining", label: "Food & Dining" },
  { slug: "arts-entertainment-nightlife", label: "Arts, Entertainment & Nightlife" },
  { slug: "outdoor-nature", label: "Outdoor & Nature" },
  { slug: "wellness-relaxation", label: "Wellness & Relaxation" },
  { slug: "sports-major-events", label: "Sports & Major Events" },
  { slug: "shopping", label: "Shopping" },
  { slug: "guided-tours", label: "Guided Tours & Excursions" },
] as const;
