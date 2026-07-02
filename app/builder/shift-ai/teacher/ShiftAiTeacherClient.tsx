'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Search, Sparkles, Users } from 'lucide-react';
import type { TeacherNarrativeResult, TeacherStudentSummary } from '@/lib/shift-ai/teacher-shared';
import { SA } from '@/lib/shift-ai/theme';

function NarrativePanel({ studentId }: { studentId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<TeacherNarrativeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/shift-ai/teacher/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      const data = (await res.json()) as { narrative?: TeacherNarrativeResult; error?: string };
      if (!res.ok) {
        setError(data.error || 'Could not generate narrative');
        return;
      }
      if (data.narrative) {
        setResult(data.narrative);
        setExpanded(true);
      }
    } catch {
      setError('Could not generate narrative');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-2 border-t border-[var(--sa-navy-100)] pt-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-2 text-xs font-semibold text-indigo-700"
        >
          AI Progress Narrative
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={generating}
          className={`${SA.btnSecondary} h-7 gap-1.5 px-2 text-xs`}
        >
          {generating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          {result ? 'Regenerate' : 'Generate'}
        </button>
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      {expanded && result ? (
        <div className="space-y-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
          <p className="text-sm leading-relaxed text-[var(--sa-navy-900)]">{result.narrative}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {result.key_strengths.length > 0 ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-green-700">
                  Strengths
                </p>
                <ul className="mt-1 space-y-0.5">
                  {result.key_strengths.map((s, i) => (
                    <li key={i} className="text-xs text-[var(--sa-navy-700)]">
                      • {s}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {result.areas_for_growth.length > 0 ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                  Focus areas
                </p>
                <ul className="mt-1 space-y-0.5">
                  {result.areas_for_growth.map((s, i) => (
                    <li key={i} className="text-xs text-[var(--sa-navy-700)]">
                      • {s}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {!result && !generating && !error ? (
        <p className="text-xs text-neutral-500">
          Generate a one-paragraph weekly summary with real mastery and completion data.
        </p>
      ) : null}
    </div>
  );
}

export default function ShiftAiTeacherClient({
  students,
}: {
  students: TeacherStudentSummary[];
}) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.year_group.toLowerCase().includes(search.toLowerCase())
  );

  const totalCompleted = students.reduce((sum, s) => sum + s.plannerCompleted, 0);
  const totalPlanner = students.reduce((sum, s) => sum + s.plannerTotal, 0);

  return (
    <div className={SA.content}>
      <div className="mb-8">
        <h1 className={SA.heading}>🏫 Teacher Dashboard</h1>
        <p className={`mt-2 text-sm ${SA.muted}`}>
          Overview of student activity in your school
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { icon: Users, label: 'Students', value: students.length },
          { icon: Users, label: 'Tasks completed', value: `${totalCompleted}/${totalPlanner}` },
          {
            icon: Users,
            label: 'Avg mastery',
            value:
              students.length > 0
                ? `${Math.round(students.reduce((s, st) => s + st.masteryPercent, 0) / students.length)}%`
                : '—',
          },
        ].map((stat) => (
          <div key={stat.label} className={`${SA.cardPadded} flex items-center gap-3`}>
            <stat.icon className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-[var(--sa-navy-900)]">{stat.value}</p>
              <p className={`text-xs ${SA.muted}`}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={SA.cardPadded}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className={`font-semibold ${SA.text}`}>Students ({filtered.length})</h2>
          <div className="relative w-64">
            <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${SA.muted}`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students…"
              className={`${SA.input} pl-9`}
            />
          </div>
        </div>

        <div className="space-y-2">
          {filtered.map((student) => {
            const isOpen = expanded === student.id;
            return (
              <div key={student.id} className="overflow-hidden rounded-xl border border-[var(--sa-navy-100)]">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : student.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--sa-navy-50)]"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--sa-navy-100)] text-sm font-bold text-[var(--sa-navy-700)]">
                    {student.full_name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${SA.text}`}>{student.full_name}</p>
                    <p className={`text-xs ${SA.muted}`}>
                      {student.year_group} · {student.key_stage}
                    </p>
                  </div>
                  <div className={`flex gap-3 text-xs ${SA.muted}`}>
                    <span>🎯 {student.masteryPercent}%</span>
                    <span>
                      ✅ {student.plannerCompleted}/{student.plannerTotal}
                    </span>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-neutral-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-neutral-400" />
                  )}
                </button>

                {isOpen ? (
                  <div className="border-t border-[var(--sa-navy-100)] px-4 pb-4 pt-3">
                    <div className="mb-3 grid gap-3 text-xs sm:grid-cols-3">
                      <div>
                        <p className={`font-semibold uppercase ${SA.muted}`}>Notes</p>
                        <p className={SA.text}>{student.notesCount}</p>
                      </div>
                      <div>
                        <p className={`font-semibold uppercase ${SA.muted}`}>Mastery</p>
                        <p className={SA.text}>{student.masteryPercent}%</p>
                      </div>
                      <div>
                        <p className={`font-semibold uppercase ${SA.muted}`}>Best arcade</p>
                        <p className={SA.text}>{student.arcadeBestScore.toLocaleString()}</p>
                      </div>
                    </div>
                    <NarrativePanel studentId={student.id} />
                  </div>
                ) : null}
              </div>
            );
          })}
          {filtered.length === 0 ? (
            <p className={`py-4 text-center text-sm ${SA.muted}`}>No students found</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
