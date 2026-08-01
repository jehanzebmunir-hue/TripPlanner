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

export function categoryLabel(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}
