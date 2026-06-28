/** Seeded slugs in public.app_categories — used for AI classification. */
export const APP_CATEGORY_SLUGS = [
  'business',
  'medical',
  'restaurant',
  'finance',
  'productivity',
  'education',
  'fitness',
  'ecommerce',
  'social',
  'gaming',
  'other',
] as const;

export type AppCategorySlug = (typeof APP_CATEGORY_SLUGS)[number];

export const APP_CATEGORY_LABELS: Record<AppCategorySlug, string> = {
  business: 'Business',
  medical: 'Medical',
  restaurant: 'Restaurant',
  finance: 'Finance',
  productivity: 'Productivity',
  education: 'Education',
  fitness: 'Fitness',
  ecommerce: 'E-commerce',
  social: 'Social',
  gaming: 'Gaming',
  other: 'Other',
};

export function normalizeCategorySlug(value: string | null | undefined): AppCategorySlug {
  const slug = (value || '').trim().toLowerCase();
  if ((APP_CATEGORY_SLUGS as readonly string[]).includes(slug)) {
    return slug as AppCategorySlug;
  }
  return 'other';
}
