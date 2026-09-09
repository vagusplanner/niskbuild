/**
 * Art.9 Travel AI compliance checks (Mekkah spelling + Halal Mode).
 * Run: npx tsx scripts/verify-travel-art9.ts
 */
import Module from 'node:module';

const originalLoad = (Module as unknown as { _load: Function })._load;
(Module as unknown as { _load: Function })._load = function (
  request: string,
  parent: unknown,
  isMain: boolean
) {
  if (request === 'server-only') return {};
  return originalLoad.call(this, request, parent, isMain);
};

type Check = { name: string; ok: boolean; detail: string };

async function main() {
  const {
    detectArt9CategoriesFromText,
    __testReligiousTextPattern,
  } = await import('../lib/vp-gdpr/art9-ai-gate');
  const { scanTravelArt9 } = await import('../lib/vp-functions/handlers/travel-ai');

  const checks: Check[] = [];
  const pattern = __testReligiousTextPattern();

  const spellings = [
    'Mekkah',
    'Makkah',
    'Mecca',
    'Makka',
    'Mekka',
    'Al-Makkah',
    'Madinah',
    'Madina',
    'Medina',
    'Mekkah, Saudi Arabia',
    'halal_tourism',
    'hajj_umrah',
    'Lisbon',
    'Tokyo',
  ];

  console.log('--- RELIGIOUS_TEXT_PATTERN coverage ---');
  for (const s of spellings) {
    const hit = detectArt9CategoriesFromText(s).includes('religious');
    const expectReligious = !['Lisbon', 'Tokyo'].includes(s);
    checks.push({
      name: `detect("${s}")`,
      ok: hit === expectReligious,
      detail: `religious=${hit} (pattern source: ${pattern.source.includes(s.toLowerCase().split(',')[0].trim()) || s.includes('_') ? 'token/normalize' : 'via variant list'})`,
    });
    console.log(`  ${s.padEnd(28)} → religious=${hit}`);
  }

  // Critical: Mekkah alone
  checks.push({
    name: 'Mekkah spelling alone triggers religious',
    ok: detectArt9CategoriesFromText('Mekkah').includes('religious'),
    detail: JSON.stringify(detectArt9CategoriesFromText('Mekkah')),
  });

  // Critical: Halal Mode alone, secular destination
  const halalOnly = scanTravelArt9({
    destination: 'Tokyo',
    travelStyle: 'leisure',
    origin: 'London',
    halalMode: true,
  });
  checks.push({
    name: 'halalMode=true + Tokyo → religious',
    ok: halalOnly.includes('religious'),
    detail: JSON.stringify(halalOnly),
  });

  // Critical: Mekkah + Halal Mode (user's exact case)
  const mekkahHalal = scanTravelArt9({
    destination: 'Mekkah',
    travelStyle: 'halal_tourism',
    origin: 'London, UK',
    halalMode: true,
  });
  checks.push({
    name: 'Mekkah + Halal Mode → religious',
    ok: mekkahHalal.includes('religious'),
    detail: JSON.stringify(mekkahHalal),
  });

  // Mekkah without toggle (spelling alone)
  const mekkahOnly = scanTravelArt9({
    destination: 'Mekkah',
    travelStyle: 'leisure',
    origin: '',
    halalMode: false,
  });
  checks.push({
    name: 'Mekkah alone (no toggle) → religious',
    ok: mekkahOnly.includes('religious'),
    detail: JSON.stringify(mekkahOnly),
  });

  // Secular control
  const secular = scanTravelArt9({
    destination: 'Lisbon',
    travelStyle: 'leisure',
    origin: 'London',
    halalMode: false,
  });
  checks.push({
    name: 'Lisbon leisure no-halal → not religious',
    ok: !secular.includes('religious'),
    detail: JSON.stringify(secular),
  });

  // Underscore trip type without boolean
  const halalTourism = scanTravelArt9({
    destination: 'Istanbul',
    travelStyle: 'halal_tourism',
    origin: '',
    halalMode: false,
  });
  checks.push({
    name: 'halal_tourism style alone → religious (underscore normalize)',
    ok: halalTourism.includes('religious'),
    detail: JSON.stringify(halalTourism),
  });

  console.log('\n--- Results ---');
  let failed = 0;
  for (const c of checks) {
    console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${c.detail}`);
    if (!c.ok) failed += 1;
  }
  if (failed) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${checks.length} checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
