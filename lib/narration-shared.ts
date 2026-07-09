/** Client-safe narration helpers (no server-only imports). */

export type NarrationContextInput = {
  pageLabel?: string;
  siteKind?: string;
  businessName?: string;
  projectTitle?: string;
  primaryHeading?: string;
  activePage?: string;
};

export function formatNarrationContext(input: NarrationContextInput): string {
  const parts: string[] = [];
  if (input.projectTitle) parts.push(`Project: ${input.projectTitle}`);
  if (input.businessName) parts.push(`Business: ${input.businessName}`);
  if (input.primaryHeading) parts.push(`Main heading: ${input.primaryHeading}`);
  if (input.siteKind) parts.push(`Site type: ${input.siteKind.replace(/_/g, ' ')}`);
  if (input.pageLabel) parts.push(`Editing page: ${input.pageLabel}`);
  return parts.join(' · ');
}

const DOMAIN_PATTERNS: { re: RegExp; label: string; lines: string[] }[] = [
  {
    re: /medical|clinic|doctor|dental|patient|appointment|healthcare|hospital/i,
    label: 'medical / healthcare',
    lines: [
      'Planning a trustworthy medical layout with clear appointment booking',
      'Adding patient-friendly forms and service sections',
      'Organizing hours, location, and provider information',
    ],
  },
  {
    re: /restaurant|menu|cafe|food|dining|bakery|bar\b/i,
    label: 'restaurant',
    lines: [
      'Setting up a welcoming restaurant layout with menu highlights',
      'Adding reservation or order call-to-action sections',
      'Styling food imagery and location details',
    ],
  },
  {
    re: /shop|store|cart|ecommerce|product|checkout|retail/i,
    label: 'e-commerce',
    lines: [
      'Building a product-focused storefront with clear categories',
      'Adding cart and checkout flow sections',
      'Highlighting featured products and trust signals',
    ],
  },
  {
    re: /saas|pricing|subscription|dashboard|startup|software/i,
    label: 'SaaS',
    lines: [
      'Structuring a conversion-focused SaaS landing page',
      'Adding pricing tiers and feature comparison blocks',
      'Placing social proof and primary signup CTAs',
    ],
  },
  {
    re: /portfolio|photographer|gallery|creative|designer/i,
    label: 'portfolio',
    lines: [
      'Designing a visual portfolio with project showcases',
      'Adding an about section and contact CTA',
      'Balancing imagery with readable case-study copy',
    ],
  },
  {
    re: /booking|appointment|calendar|schedule|reservation/i,
    label: 'booking',
    lines: [
      'Setting up an appointment booking flow with time selection',
      'Adding service picker and confirmation summary UI',
      'Making the schedule easy to scan on mobile',
    ],
  },
  {
    re: /fitness|gym|workout|yoga|trainer/i,
    label: 'fitness',
    lines: [
      'Building a fitness site with programs and class schedule',
      'Adding membership or trial signup sections',
      'Highlighting transformations and trainer credentials',
    ],
  },
  {
    re: /blog|article|newsletter|magazine/i,
    label: 'blog',
    lines: [
      'Organizing a readable blog layout with featured posts',
      'Adding category navigation and newsletter signup',
      'Styling article cards for easy scanning',
    ],
  },
  {
    re: /law|legal|attorney|lawyer|firm/i,
    label: 'legal',
    lines: [
      'Creating a professional legal services layout',
      'Adding practice area sections and consultation CTA',
      'Emphasizing credibility with clean typography',
    ],
  },
  {
    re: /real estate|property|realtor|listing|rental/i,
    label: 'real estate',
    lines: [
      'Setting up property listings with search and filters',
      'Adding agent contact and neighborhood highlights',
      'Styling listing cards with key details upfront',
    ],
  },
];

/** Prompt-specific narration when the LLM path is unavailable (no extra API call). */
export function derivePromptNarrationFallback(
  prompt: string,
  extraContext?: string
): string {
  const haystack = `${prompt}\n${extraContext ?? ''}`.trim();
  if (!haystack) {
    return 'Understanding your request…\nPlanning the page structure…\nPreparing layout and styles…';
  }

  for (const domain of DOMAIN_PATTERNS) {
    if (domain.re.test(haystack)) {
      const lead = `Working on your ${domain.label} request…`;
      return [lead, ...domain.lines].join('\n');
    }
  }

  const snippet = prompt.trim().slice(0, 120).replace(/\s+/g, ' ');
  return [
    `Understanding: “${snippet}${prompt.length > 120 ? '…' : ''}”`,
    'Planning layout, sections, and navigation for this request',
    'Preparing styles and interactive elements to match your description',
  ].join('\n');
}
