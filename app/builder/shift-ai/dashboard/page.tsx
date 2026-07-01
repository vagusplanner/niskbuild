import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  SHIFT_CURRICULUM_FLAGS,
  SHIFT_CURRICULUM_LABELS,
  type ShiftCurriculum,
} from '@/lib/shift-ai/constants';
import {
  mergeStudentSubjects,
  subjectIcon,
  subjectPagePath,
  type ShiftSubjectRow,
} from '@/lib/shift-ai/subjects';
import { getSafeSession } from '@/lib/supabaseSession.server';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';

type PlannerItem = {
  id: string;
  title: string;
  description: string | null;
  item_type: string;
  due_date: string;
  completed: boolean;
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function itemTypeLabel(type: string): string {
  switch (type) {
    case 'class':
      return 'Class';
    case 'homework':
      return 'Homework';
    case 'test':
      return 'Test';
    case 'revision':
      return 'Revision';
    default:
      return type;
  }
}

function keyStageTip(curriculum: ShiftCurriculum, keyStage: string, yearGroup: string): string {
  if (curriculum === 'france') {
    return `Conseil pour ${yearGroup} : utilise le tuteur IA pour réviser tes cours et préparer le Brevet ou le Bac.`;
  }
  if (curriculum === 'usa') {
    return `Tip for ${yearGroup}: use the AI tutor to review lessons, prep for AP exams, SAT/ACT, and get step-by-step homework help.`;
  }

  const tips: Record<string, string> = {
    'Key Stage 2': 'Focus on building strong foundations in reading, maths and science.',
    'Key Stage 3': 'Explore all your subjects — this is a great time to discover what you love!',
    'Key Stage 4 (GCSEs)': 'Stay consistent with revision. Use the notes + AI tools to prepare for exams.',
    'Key Stage 5 (A-Levels)': 'Go deep on your subjects. Use the AI to test your understanding.',
  };

  return `Tip for ${keyStage}: ${tips[keyStage] || 'Keep studying and stay curious!'}`;
}

function startOfTodayUtc(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function endOfTodayUtc(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
  ).toISOString();
}

export default async function ShiftAiDashboardPage() {
  const session = await getSafeSession();

  if (!session?.user) {
    redirect('/builder/shift-ai/login');
  }

  const admin = createAdminClient();
  const { data: student } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select(
      'id, full_name, curriculum, year_group, key_stage, favourite_subjects, is_active'
    )
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!student || needsSubjectOnboarding(student)) {
    redirect('/builder/shift-ai/onboarding');
  }

  let plannerItems: PlannerItem[] = [];
  const { data: items, error: plannerError } = await admin
    .schema('firstparty')
    .from('shift_planner_items')
    .select('id, title, description, item_type, due_date, completed')
    .eq('student_id', student.id)
    .eq('completed', false)
    .gte('due_date', startOfTodayUtc())
    .lte('due_date', endOfTodayUtc())
    .order('due_date', { ascending: true });

  if (!plannerError && items) {
    plannerItems = items;
  }

  const curriculum = (student.curriculum || 'uk') as ShiftCurriculum;
  const displayName = firstName(student.full_name?.trim() || 'Student');
  const favouriteSubjects = (
    Array.isArray(student.favourite_subjects) ? student.favourite_subjects : []
  ).filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0);

  const { data: subjectRows } = await admin
    .schema('firstparty')
    .from('shift_subjects')
    .select('id, name, ai_persona, is_favourite')
    .eq('student_id', student.id);

  const subjects = mergeStudentSubjects(
    favouriteSubjects,
    (subjectRows || []) as ShiftSubjectRow[]
  );

  return (
    <main className="min-h-screen bg-[#1a1612] text-[#e8dcc8]">
      <div className="mx-auto max-w-5xl p-6 md:p-10">
        {/* Header — layout from reference Dashboard.jsx */}
        <header className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#e8dcc8] md:text-3xl">
                {getGreeting()}, {displayName}! 👋
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-[#857664]">
                <span className="font-medium text-[#e8dcc8]">{student.year_group}</span>
                <span>· {student.key_stage}</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#9a6530]/40 bg-[#9a6530]/10 px-2 py-0.5 text-xs font-medium text-[#e8dcc8]">
                  {SHIFT_CURRICULUM_FLAGS[curriculum]} {SHIFT_CURRICULUM_LABELS[curriculum]}
                </span>
              </p>
            </div>
          </div>
        </header>

        {/* Curriculum tip — adapted from reference tip banner */}
        <section className="mb-6 rounded-xl border border-[#9a6530]/30 bg-[#9a6530]/10 p-4 text-sm text-[#e8dcc8]">
          💡 {keyStageTip(curriculum, student.key_stage, student.year_group)}
        </section>

        {/* Due today — planner items */}
        <section className="mb-6">
          <h2 className="mb-4 text-lg font-semibold text-[#e8dcc8]">Due today</h2>
          {plannerItems.length === 0 ? (
            <div className="rounded-2xl border border-[#857664]/30 bg-[#1a1612] p-5 text-sm text-[#857664]">
              Nothing due today — you&apos;re all caught up.
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {plannerItems.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-[#857664]/30 bg-[#1a1612] p-4 hover:border-[#9a6530]/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-[#e8dcc8]">{item.title}</p>
                    <span className="shrink-0 rounded-full border border-[#9a6530]/40 bg-[#9a6530]/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#e8dcc8]">
                      {itemTypeLabel(item.item_type)}
                    </span>
                  </div>
                  {item.description ? (
                    <p className="mt-1 text-sm text-[#857664]">{item.description}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-[#857664]">
                    {new Date(item.due_date).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Subject grid — layout from reference, data from favourite_subjects */}
        <section>
          <h2 className="mb-4 mt-6 text-lg font-semibold text-[#e8dcc8]">
            Your subjects
            {subjects.some((s) => s.isFavourite) ? (
              <span className="ml-2 text-sm font-normal text-[#857664]">· ⭐ your favourites</span>
            ) : null}
          </h2>
          {subjects.length === 0 ? (
            <div className="rounded-2xl border border-[#857664]/30 bg-[#1a1612] p-5 text-sm text-[#857664]">
              Add favourite subjects during onboarding to see them here.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {subjects.map((subject) => (
                <Link
                  key={subject.name}
                  href={subjectPagePath(subject)}
                  className="relative rounded-2xl border border-[#857664]/30 bg-[#1a1612] p-5 text-center transition-all hover:border-[#9a6530]/60 hover:shadow-md"
                >
                  {subject.isFavourite ? (
                    <span className="absolute right-2 top-2 text-xs">⭐</span>
                  ) : null}
                  <div className="mb-2 text-3xl">{subjectIcon(subject.name)}</div>
                  <p className="text-sm font-semibold text-[#e8dcc8]">{subject.name}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export async function generateMetadata() {
  return {
    title: 'Dashboard · Shift AI',
    robots: 'noindex',
  };
}
