import Link from 'next/link';
import Layout from '@/app/components/Layout';
import PageBackHeader from '@/app/components/PageBackHeader';

export const metadata = {
  title: 'AI Game Builder - Create 2D Browser Games with AI | NiskBuild',
  description:
    'Build HTML5 games with Phaser.js using AI. No coding required. Create platformers, puzzles, and endless runners from text prompts.',
  keywords: 'AI game builder, Phaser.js, game development, no-code games',
};

export default function GamesPage() {
  return (
    <Layout variant="marketing" showFooter={true}>
      <PageBackHeader href="/landing" label="Back to home" />
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="text-6xl mb-4">🎮</div>
        <h1 className="text-4xl font-bold text-white mb-4">AI Game Builder</h1>
        <p className="text-xl text-nisk-muted mb-4 max-w-2xl mx-auto">
          Create 2D browser games from text prompts. NiskBuild generates working Phaser.js games
          you can preview, export, and deploy.
        </p>
        <div className="rounded-xl border border-[var(--secondary)]/30 bg-[var(--secondary)]/10 px-4 py-3 mb-8 max-w-xl mx-auto text-left">
          <p className="text-sm text-white font-medium mb-1">Plan requirements</p>
          <p className="text-xs text-nisk-muted leading-relaxed">
            <strong className="text-gray-300">Agency plan</strong> — instant game templates (platformer, puzzle, runner) and custom Phaser.js generation.
            <br />
            <strong className="text-gray-300">Pro plan</strong> — build websites and apps in the Builder; describe game ideas as prompts.
          </p>
        </div>
        <p className="text-sm text-nisk-muted mb-10">
          Platformers · Puzzle match · Endless runners · Custom game ideas
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/templates/games"
            className="btn-primary inline-flex px-8 py-3 rounded-xl text-sm font-medium"
          >
            Start Building Games →
          </Link>
          <Link href="/pricing" className="btn-secondary inline-flex px-6 py-3 rounded-xl text-sm">
            View Agency plans
          </Link>
        </div>
      </div>
    </Layout>
  );
}
