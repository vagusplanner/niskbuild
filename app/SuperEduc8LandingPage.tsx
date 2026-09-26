'use client';

import Link from 'next/link';
import SuperEduc8Logo from '@/app/components/SuperEduc8Logo';
import SuperEduc8LandingContactForm from '@/app/components/SuperEduc8LandingContactForm';
import './supereduc8-landing.css';

const SIGNUP_HREF = '/signup';
const LOGIN_HREF = '/login?next=/dashboard';
const PRIVACY_HREF = '/privacy';
const TERMS_HREF = '/terms';

const FEATURES = [
  {
    title: 'AI Tutor, Available Anytime',
    body: 'Ask a question, get a real explanation — not just the answer. Our AI tutor adapts to how your child learns, in their own study language.',
  },
  {
    title: 'Homework Help in Seconds',
    body: 'Snap a photo of a tricky problem and get clear, step-by-step guidance — built for how kids actually do homework.',
  },
  {
    title: 'Real Essay Feedback',
    body: 'Submit writing and get genuine, constructive feedback on structure, clarity, and grade-level expectations — not just a spell-check.',
  },
  {
    title: 'Learning That Feels Like Play',
    body: 'Flashcards, quiz arcade challenges, and mastery tracking turn practice into something kids actually want to do.',
  },
  {
    title: 'Built for Parents, Too',
    body: "A real parent dashboard shows learning progress and activity — not the child's private conversations, but genuine visibility into how they're doing.",
  },
  {
    title: 'Multiple Curricula, One Platform',
    body: 'Following the UK, French, US, or Saudi curriculum — or more than one at once for international families — SuperEduc8 adapts to your child’s actual coursework.',
  },
] as const;

const HOW_STEPS = [
  {
    n: '1',
    title: 'Sign up in minutes',
    body: 'students 13+ can start immediately; for younger students, a parent gives quick consent first',
  },
  {
    n: '2',
    title: 'Pick your curriculum',
    body: 'UK, France, USA, or Saudi Arabia, matched to your child\'s actual year group and subjects',
  },
  {
    n: '3',
    title: 'Get real help, instantly',
    body: 'homework photo scanning, an AI tutor for step-by-step explanations, essay feedback, and exam-style practice',
  },
  {
    n: '4',
    title: 'Stay in the loop',
    body: "parents and teachers see genuine progress: what's mastered, what needs work, and how much time is being spent learning",
  },
] as const;

const MONTHLY_PLANS: Array<{
  name: string;
  price: string;
  detail: string;
  cta: string;
  highlight?: boolean;
  href?: string;
}> = [
  {
    name: 'Free',
    price: '$0/month',
    detail: 'Limited daily AI tutor access, basic flashcards & quizzes',
    cta: 'Start Free',
  },
  {
    name: 'Free Trial',
    price: '14 days free',
    detail: 'Full access to every feature, no credit card required',
    cta: 'Start Free Trial',
    highlight: true,
  },
  {
    name: 'Student',
    price: '$9.99/month',
    detail: 'Unlimited AI tutor, homework scanning, essay feedback, full curriculum access',
    cta: 'Start Free Trial',
  },
  {
    name: 'Family additional child',
    price: '+$6.99/month per child',
    detail: 'Same full access, for each additional child on your account',
    cta: 'Start Free Trial',
  },
  {
    name: 'Multi-Curriculum',
    price: '20% off combined',
    detail: 'For students following more than one national curriculum at once',
    cta: 'Start Free Trial',
  },
  {
    name: 'Teacher/School',
    price: 'Contact us',
    detail: 'Custom pricing for classrooms and schools',
    cta: 'Get in touch',
    href: '#contact',
  },
];

export default function SuperEduc8LandingPage() {
  return (
    <div className="se8-landing">
      <header className="se8-nav">
        <div className="se8-nav-inner">
          <SuperEduc8Logo href="/" variant="lockup" size="sm" />
          <nav className="se8-nav-links" aria-label="Primary">
            <a href="#how-it-works" className="se8-nav-text">
              How it works
            </a>
            <a href="#features" className="se8-nav-text">
              Features
            </a>
            <a href="#pricing" className="se8-nav-text">
              Pricing
            </a>
            <Link href={LOGIN_HREF} className="se8-nav-text se8-nav-signin">
              Sign In
            </Link>
            <Link href={SIGNUP_HREF} className="se8-btn se8-btn-primary se8-btn-sm">
              Start Free Trial
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="se8-hero" aria-labelledby="se8-hero-heading">
          <div className="se8-hero-glow" aria-hidden />
          <div className="se8-hero-inner">
            <p className="se8-brand-mark">
              <span className="se8-brand-super">Super</span>
              <span className="se8-brand-educ">Educ8</span>
            </p>
            <h1 id="se8-hero-heading" className="se8-hero-title">
              Your child&apos;s personal AI tutor — for every subject, every curriculum, every
              &quot;aha&quot; moment.
            </h1>
            <p className="se8-hero-sub">
              SuperEduc8 gives students ages 7-17 a patient, always-available AI tutor for homework
              help, essay feedback, and exam prep — while parents and teachers get real visibility
              into how they&apos;re learning, not just what grade they got.
            </p>
            <div className="se8-hero-ctas">
              <Link href={SIGNUP_HREF} className="se8-btn se8-btn-primary se8-btn-lg">
                Start Free — No Credit Card Required
              </Link>
              <a href="#how-it-works" className="se8-btn se8-btn-secondary se8-btn-lg">
                See How It Works
              </a>
            </div>
            <p className="se8-trust">
              COPPA-aware parental consent for under-13 students · UK, France, USA &amp; Saudi
              curricula supported · Built for parents to stay involved
            </p>
          </div>
        </section>

        {/* ── Problem ──────────────────────────────────────────── */}
        <section className="se8-section se8-section-alt" aria-labelledby="se8-problem-heading">
          <div className="se8-wrap se8-narrow">
            <h2 id="se8-problem-heading" className="se8-h2">
              Homework help shouldn&apos;t mean sitting there waiting for an answer.
            </h2>
            <p className="se8-body">
              Every parent knows the moment: your child is stuck on a question, you&apos;re not sure
              how to explain it the way their teacher would, and the assignment is due tomorrow.
              SuperEduc8 puts a patient, curriculum-aware AI tutor in your child&apos;s corner — one
              that explains, doesn&apos;t just answer, and helps them actually understand.
            </p>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────── */}
        <section
          id="how-it-works"
          className="se8-section"
          aria-labelledby="se8-how-heading"
        >
          <div className="se8-wrap">
            <h2 id="se8-how-heading" className="se8-h2 se8-center">
              Learning support that fits into real life
            </h2>
            <ol className="se8-steps">
              {HOW_STEPS.map((step) => (
                <li key={step.n} className="se8-step">
                  <span className="se8-step-n" aria-hidden>
                    {step.n}
                  </span>
                  <div>
                    <h3 className="se8-step-title">{step.title}</h3>
                    <p className="se8-step-body">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────── */}
        <section
          id="features"
          className="se8-section se8-section-alt"
          aria-labelledby="se8-features-heading"
        >
          <div className="se8-wrap">
            <h2 id="se8-features-heading" className="se8-h2 se8-center se8-sr-only">
              Features
            </h2>
            <div className="se8-feature-grid">
              {FEATURES.map((f) => (
                <div key={f.title} className="se8-feature">
                  <h3 className="se8-feature-title">{f.title}</h3>
                  <p className="se8-feature-body">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ──────────────────────────────────────────── */}
        <section id="pricing" className="se8-section" aria-labelledby="se8-pricing-heading">
          <div className="se8-wrap">
            <h2 id="se8-pricing-heading" className="se8-h2 se8-center">
              Simple, honest pricing — no surprises
            </h2>
            <div className="se8-pricing-table-wrap">
              <table className="se8-pricing-table">
                <thead>
                  <tr>
                    <th scope="col">Plan</th>
                    <th scope="col">Price</th>
                    <th scope="col">What you get</th>
                    <th scope="col">
                      <span className="se8-sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {MONTHLY_PLANS.map((plan) => (
                    <tr
                      key={plan.name}
                      className={plan.highlight ? 'se8-pricing-highlight' : undefined}
                    >
                      <td className="se8-pricing-name">{plan.name}</td>
                      <td className="se8-pricing-price">{plan.price}</td>
                      <td>{plan.detail}</td>
                      <td>
                        <Link
                          href={plan.href ?? SIGNUP_HREF}
                          className={
                            plan.highlight
                              ? 'se8-btn se8-btn-primary se8-btn-sm'
                              : 'se8-btn se8-btn-ghost se8-btn-sm'
                          }
                        >
                          {plan.cta}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="se8-annual">
              <h3 className="se8-annual-title">Annual billing (2 months free)</h3>
              <ul className="se8-annual-list">
                <li>
                  Student: <strong>$99.90/year</strong> (vs $119.88 paid monthly — save $19.98)
                </li>
                <li>
                  Additional child: <strong>$69.90/year</strong> (vs $83.88 paid monthly — save
                  $13.98)
                </li>
              </ul>
            </div>

            <p className="se8-pricing-note">
              Cancel anytime. Your child&apos;s learning data is never deleted just because a
              subscription lapses — only premium features pause.
            </p>
          </div>
        </section>

        {/* ── Safety & privacy ─────────────────────────────────── */}
        <section
          id="safety"
          className="se8-section se8-section-alt"
          aria-labelledby="se8-safety-heading"
        >
          <div className="se8-wrap se8-narrow">
            <h2 id="se8-safety-heading" className="se8-h2">
              Built with real care for how children&apos;s data should be handled
            </h2>
            <ul className="se8-bullets">
              <li>
                <strong>Parental consent, built in.</strong> Students under 13 can&apos;t sign up on
                their own — a parent gives consent first, and gets ongoing visibility into their
                child&apos;s learning progress.
              </li>
              <li>
                <strong>We tell you the truth about our data practices</strong> — including what
                we&apos;re still improving. Read our full Privacy Policy for a genuinely detailed,
                honest look at what we collect and why — including areas we&apos;re actively
                strengthening as part of ongoing legal review, because we&apos;d rather be upfront
                with you than vague.
              </li>
              <li>
                <strong>Conversations stay private from prying eyes</strong> — including ours,
                mostly. Parents and teachers see learning progress, not your child&apos;s private
                conversations with the AI tutor.
              </li>
              <li>
                <strong>No ads. No selling data. Ever.</strong> SuperEduc8 makes money from
                subscriptions, not from your child&apos;s information.
              </li>
            </ul>
            <p className="se8-safety-cta">
              <Link href={PRIVACY_HREF} className="se8-text-link">
                Read Our Full Privacy Policy →
              </Link>
            </p>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────── */}
        <section className="se8-final" aria-labelledby="se8-final-heading">
          <div className="se8-wrap se8-narrow se8-center">
            <h2 id="se8-final-heading" className="se8-final-title">
              Give your child a tutor that&apos;s patient, available, and actually explains things.
            </h2>
            <p className="se8-final-sub">
              Start your free 14-day trial today — no credit card required.
            </p>
            <Link href={SIGNUP_HREF} className="se8-btn se8-btn-coral se8-btn-lg">
              Start Free Trial
            </Link>
          </div>
        </section>

        {/* ── Contact / schools ────────────────────────────────── */}
        <section id="contact" className="se8-section se8-section-compact" aria-labelledby="se8-contact-heading">
          <div className="se8-wrap se8-narrow se8-center">
            <h2 id="se8-contact-heading" className="se8-h3">
              Contact &amp; schools
            </h2>
            <p className="se8-body">
              Questions about your child&apos;s data, classroom licensing, or school pricing —
              send a message below. We read every inquiry and follow up carefully.
            </p>
            <div className="se8-contact-wrap">
              <SuperEduc8LandingContactForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="se8-footer">
        <div className="se8-wrap se8-footer-inner">
          <SuperEduc8Logo href="/" variant="lockup" size="sm" />
          <nav className="se8-footer-links" aria-label="Footer">
            <Link href={PRIVACY_HREF}>Privacy Policy</Link>
            <Link href={TERMS_HREF}>Terms of Service</Link>
            <a href="#contact">Contact/Support</a>
            <a href="#pricing">For Teachers &amp; Schools</a>
          </nav>
          <p className="se8-footer-copy">© {new Date().getFullYear()} SuperEduc8</p>
        </div>
      </footer>
    </div>
  );
}
