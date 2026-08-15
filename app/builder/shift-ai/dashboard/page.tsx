import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  SHIFT_CURRICULUM_FLAGS,
  type ShiftCurriculum,
} from '@/lib/shift-ai/constants';
import { shiftAiCatalog } from '@/lib/shift-ai/i18n';
import { getRequestStudyLanguage } from '@/lib/shift-ai/study-language';
import {
  mergeStudentSubjects,
  subjectIcon,
  subjectPagePath,
  type ShiftSubjectRow,
} from '@/lib/shift-ai/subjects';
import { getSafeSession } from '@/lib/supabaseSession.server';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';
import { SA } from '@/lib/shift-ai/theme';

type PlannerItem = {
  id: string;
  title: string;
  description: string | null;
  item_type: string;
  due_date: string;
  completed: boolean;
};

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '');
}

function greetingTemplate(
  catalog: ReturnType<typeof shiftAiCatalog>['dashboard'],
  hour: number
): string {
  if (hour < 12) return catalog.greetingMorning;
  if (hour < 17) return catalog.greetingAfternoon;
  return catalog.greetingEvening;
}

function itemTypeLabel(
  catalog: ReturnType<typeof shiftAiCatalog>['dashboard'],
  type: string
): string {
  if (type === 'class' || type === 'homework' || type === 'test' || type === 'revision') {
    return catalog.itemTypes[type];
  }
  return type;
}

function keyStageTip(
  catalog: ReturnType<typeof shiftAiCatalog>['dashboard'],
  curriculum: ShiftCurriculum,
  keyStage: string,
  yearGroup: string
): string {
  if (curriculum === 'france') {
    return interpolate(catalog.tips.france, { yearGroup });
  }
  if (curriculum === 'usa') {
    return interpolate(catalog.tips.usa, { yearGroup });
  }
  if (curriculum === 'saudi') {
    return interpolate(catalog.tips.saudi, { yearGroup });
  }

  const byStage: Record<string, string> = {
    'Key Stage 2': catalog.tips.ks2,
    'Key Stage 3': catalog.tips.ks3,
    'Key Stage 4 (GCSEs)': catalog.tips.ks4,
    'Key Stage 5 (A-Levels)': catalog.tips.ks5,
  };

  return interpolate(catalog.tips.forKeyStage, {
    keyStage,
    tip: byStage[keyStage] || catalog.tips.fallback,
  });
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

  const locale = await getRequestStudyLanguage();
  const t = shiftAiCatalog(locale).dashboard;
  const curriculum = (student.curriculum || 'uk') as ShiftCurriculum;
  const displayName = firstName(student.full_name?.trim() || t.studentFallback);
  const curriculumLabel = t.curricula[curriculum] ?? t.curricula.uk;
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
    <div className={SA.content}>
        {/* Header — layout from reference Dashboard.jsx */}
        <header className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className={SA.heading}>
                {interpolate(greetingTemplate(t, new Date().getHours()), { name: displayName })}
              </h1>
              <p className={`mt-1 flex flex-wrap items-center gap-2 ${SA.muted}`}>
                <span className={`font-medium ${SA.text}`}>{student.year_group}</span>
                <span>· {student.key_stage}</span>
                <span className={`inline-flex items-center gap-1 rounded-full border border-[var(--sa-navy-100)] bg-[var(--sa-navy-50)] px-2 py-0.5 text-xs font-medium ${SA.text}`}>
                  {SHIFT_CURRICULUM_FLAGS[curriculum]} {curriculumLabel}
                </span>
              </p>
            </div>
          </div>
        </header>

        {/* Curriculum tip — adapted from reference tip banner */}
        <section className={`mb-6 ${SA.tip}`}>
          💡 {keyStageTip(t, curriculum, student.key_stage, student.year_group)}
        </section>

        {/* Due today — planner items */}
        <section className="mb-6">
          <h2 className={`mb-4 ${SA.subheading}`}>{t.dueToday}</h2>
          {plannerItems.length === 0 ? (
            <div className={`${SA.cardPadded} text-sm ${SA.muted}`}>
              {t.nothingDue}
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {plannerItems.map((item) => (
                <li
                  key={item.id}
                  className={`${SA.cardHover} p-4`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-semibold ${SA.text}`}>{item.title}</p>
                    <span className={`shrink-0 ${SA.badgeSm}`}>
                      {itemTypeLabel(t, item.item_type)}
                    </span>
                  </div>
                  {item.description ? (
                    <p className={`mt-1 text-sm ${SA.muted}`}>{item.description}</p>
                  ) : null}
                  <p className={`mt-2 text-xs ${SA.muted}`}>
                    {new Date(item.due_date).toLocaleTimeString(locale === 'ar' ? 'ar' : 'en', {
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
          <h2 className={`mb-4 mt-6 ${SA.subheading}`}>
            {t.yourSubjects}
            {subjects.some((s) => s.isFavourite) ? (
              <span className={`ms-2 text-sm font-normal ${SA.muted}`}>{t.favouritesHint}</span>
            ) : null}
          </h2>
          {subjects.length === 0 ? (
            <div className={`${SA.cardPadded} text-sm ${SA.muted}`}>
              {t.noSubjects}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {subjects.map((subject) => (
                <Link
                  key={subject.name}
                  href={subjectPagePath(subject)}
                  className={`relative ${SA.cardHover} p-5 text-center`}
                >
                  {subject.isFavourite ? (
                    <span className="absolute end-2 top-2 text-xs">⭐</span>
                  ) : null}
                  <div className="mb-2 text-3xl">{subjectIcon(subject.name)}</div>
                  <p className={`text-sm font-semibold ${SA.text}`}>{subject.name}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
    </div>
  );
}

export async function generateMetadata() {
  return {
    title: shiftAiCatalog(await getRequestStudyLanguage()).dashboard.metaTitle,
    robots: 'noindex',
  };
}
