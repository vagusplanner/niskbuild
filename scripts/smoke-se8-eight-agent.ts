/**
 * Evidence: SuperEduc8 "8" retrieves Tips and answers product questions correctly.
 * Usage: npx tsx scripts/smoke-se8-eight-agent.ts
 */
import Module from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const shim = path.resolve('scripts/shims/server-only.js');
const orig = (Module as unknown as { _resolveFilename: Function })._resolveFilename;
(Module as unknown as { _resolveFilename: Function })._resolveFilename = function (
  request: string,
  parent: unknown,
  isMain: boolean,
  options: unknown
) {
  if (request === 'server-only') return shim;
  return orig.call(this, request, parent, isMain, options);
};

function loadEnv() {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

loadEnv();

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

async function main() {
  const { retrieveSe8EightKnowledge } = await import('../lib/shift-ai/eight-retrieval');
  const {
    isHomeworkOrStudyAnswerRequest,
    runSe8EightAgent,
  } = await import('../lib/shift-ai/eight-agent');

  // Retrieval cites real tips
  const cancelRet = retrieveSe8EightKnowledge('how do I cancel my subscription?', {
    pathname: '/billing',
    hostname: 'www.supereduc8.com',
  });
  assert(cancelRet.citations.length > 0, 'cancel should retrieve tip citations');
  assert(
    cancelRet.citations.some((c) => /billing|cancel|portal|manage/i.test(c.title + c.href)),
    'cancel citations should point at billing tips'
  );
  assert(
    cancelRet.citations.every((c) => c.href.startsWith('/') && !c.href.includes('nisk')),
    'citations must be SE8 paths'
  );
  console.log('retrieval cancel OK', cancelRet.citations.map((c) => c.title));

  const flashRet = retrieveSe8EightKnowledge('how do I use flashcards?', {
    hostname: 'www.supereduc8.com',
  });
  assert(
    flashRet.citations.some((c) => /flashcard/i.test(c.title)),
    'flashcards query should cite flashcards tip'
  );
  console.log('retrieval flashcards OK', flashRet.citations.map((c) => c.title));

  // Homework redirect (canned — no LLM)
  assert(
    isHomeworkOrStudyAnswerRequest('solve this quadratic equation for x'),
    'homework detect'
  );
  assert(
    !isHomeworkOrStudyAnswerRequest('how do I cancel my subscription?'),
    'billing must not be treated as homework'
  );

  const hw = await runSe8EightAgent('Help me do my homework: solve 2x+5=11', {
    pathname: '/dashboard',
    hostname: 'www.supereduc8.com',
    retrievedKnowledge: '',
  });
  assert(hw.provider === 'canned', 'homework should be canned');
  assert(/AI Tutor/i.test(hw.response), 'homework must redirect to AI Tutor');
  assert(!/x\s*=\s*3/i.test(hw.response), 'must not give the math answer');
  console.log('homework redirect OK');

  // Live Groq answers grounded in tips
  const cancelAns = await runSe8EightAgent(
    'How do I cancel?',
    {
      pathname: '/billing',
      hostname: 'www.supereduc8.com',
      planLabel: 'student (paid)',
      retrievedKnowledge: cancelRet.contextBlock,
    },
    [],
    cancelRet.citations
  );
  console.log('\n--- Q: How do I cancel? (on /billing) ---\n', cancelAns.response);
  assert(cancelAns.provider === 'groq' || cancelAns.provider === 'canned', 'got a reply');
  assert(
    /portal|stripe|billing/i.test(cancelAns.response),
    `cancel answer should mention portal/Stripe/billing, got: ${cancelAns.response.slice(0, 200)}`
  );
  assert(
    /already|on (this|the) (page|billing)|Open billing portal|Manage in Stripe/i.test(
      cancelAns.response
    ) || /portal/i.test(cancelAns.response),
    'page-aware cancel answer should reference portal or being on billing'
  );

  const flashAns = await runSe8EightAgent(
    'How do I use flashcards?',
    {
      pathname: '/dashboard',
      hostname: 'www.supereduc8.com',
      planLabel: 'trial',
      retrievedKnowledge: flashRet.contextBlock,
    },
    [],
    flashRet.citations
  );
  console.log('\n--- Q: How do I use flashcards? ---\n', flashAns.response);
  assert(
    /flashcard/i.test(flashAns.response),
    'flashcards answer should mention flashcards'
  );

  const avatarRet = retrieveSe8EightKnowledge('how do I upload an avatar?', {
    hostname: 'www.supereduc8.com',
  });
  const avatarAns = await runSe8EightAgent(
    'How do I upload an avatar for my profile?',
    {
      pathname: '/settings',
      hostname: 'www.supereduc8.com',
      planLabel: 'trial',
      retrievedKnowledge: avatarRet.contextBlock,
    },
    [],
    avatarRet.citations
  );
  console.log('\n--- Q: Upload avatar? ---\n', avatarAns.response);
  assert(
    /not (available|built|supported)|aren[''\u2019]?t|isn[''\u2019]?t|don[''\u2019]?t (support|have)|cannot|can[''\u2019]?t|no avatar|yet/i.test(
      avatarAns.response
    ),
    `must honestly refuse unbuilt avatar feature, got: ${avatarAns.response.slice(0, 240)}`
  );
  assert(
    !/go to settings.? upload|click upload (photo|avatar)/i.test(avatarAns.response),
    'must not invent an upload UI'
  );

  console.log('\nPASS se8 eight agent evidence');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
