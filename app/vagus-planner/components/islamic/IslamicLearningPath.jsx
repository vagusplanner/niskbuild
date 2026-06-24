import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BookOpen, CheckCircle2, Play, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const SUBJECTS = [
  { id: 'hadith', name: 'Hadith', color: 'from-blue-500 to-cyan-600', icon: '📖' },
  { id: 'fiqh', name: 'Fiqh', color: 'from-purple-500 to-indigo-600', icon: '⚖️' },
  { id: 'seerah', name: 'Seerah', color: 'from-green-500 to-emerald-600', icon: '🕌' },
  { id: 'tafsir', name: 'Tafsir', color: 'from-amber-500 to-orange-600', icon: '📜' },
  { id: 'arabic', name: 'Arabic', color: 'from-pink-500 to-rose-600', icon: '🔤' }
];

export default function IslamicLearningPath() {
  const [selectedSubject, setSelectedSubject] = useState(null);
  const queryClient = useQueryClient();

  const { data: lessons = [] } = useQuery({
    queryKey: ['islamicLessons'],
    queryFn: () => base44.entities.IslamicLesson.list()
  });

  const updateLessonMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.IslamicLesson.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['islamicLessons'] });
      toast.success('Progress updated!');
    }
  });

  const filteredLessons = selectedSubject
    ? lessons.filter(l => l.subject === selectedSubject)
    : lessons;

  const overallProgress = lessons.length > 0
    ? (lessons.filter(l => l.completed).length / lessons.length) * 100
    : 0;

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-600" />
          Islamic Learning Path
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="p-4 bg-white rounded-xl border-2 border-indigo-200">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-800">Overall Progress</span>
            <span className="text-sm text-slate-600">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-3 bg-indigo-100" />
          <p className="text-xs text-slate-500 mt-2">
            {lessons.filter(l => l.completed).length} of {lessons.length} lessons completed
          </p>
        </div>

        {/* Subject Selection */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <button
            onClick={() => setSelectedSubject(null)}
            className={`p-3 rounded-xl border-2 transition-all ${
              !selectedSubject
                ? 'bg-gradient-to-r from-slate-600 to-gray-700 text-white border-slate-700'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-xl mb-1">📚</span>
            <p className="text-sm font-medium">All Subjects</p>
          </button>
          {SUBJECTS.map((subject) => (
            <button
              key={subject.id}
              onClick={() => setSelectedSubject(subject.id)}
              className={`p-3 rounded-xl border-2 transition-all ${
                selectedSubject === subject.id
                  ? `bg-gradient-to-r ${subject.color} text-white border-transparent`
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-xl mb-1">{subject.icon}</span>
              <p className="text-sm font-medium">{subject.name}</p>
              <p className="text-xs opacity-80 mt-1">
                {lessons.filter(l => l.subject === subject.id).length} lessons
              </p>
            </button>
          ))}
        </div>

        {/* Lessons List */}
        <div className="space-y-2">
          {filteredLessons.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No lessons yet</p>
              <Button size="sm" className="mt-3">Add First Lesson</Button>
            </div>
          ) : (
            filteredLessons.sort((a, b) => (a.order || 0) - (b.order || 0)).map((lesson) => (
              <div
                key={lesson.id}
                className={`p-4 rounded-xl border-2 ${
                  lesson.completed
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{lesson.title}</span>
                      {lesson.completed && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {SUBJECTS.find(s => s.id === lesson.subject)?.icon} {lesson.subject}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-slate-600">
                        <Clock className="w-3 h-3" />
                        {lesson.duration_minutes}min
                      </div>
                    </div>
                    {!lesson.completed && lesson.progress > 0 && (
                      <div className="mt-2">
                        <Progress value={lesson.progress} className="h-2" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => updateLessonMutation.mutate({
                      id: lesson.id,
                      data: { ...lesson, completed: !lesson.completed, progress: lesson.completed ? 0 : 100 }
                    })}
                    className="ml-3 p-2 hover:bg-slate-100 rounded-lg"
                  >
                    {lesson.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Play className="w-5 h-5 text-indigo-600" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}