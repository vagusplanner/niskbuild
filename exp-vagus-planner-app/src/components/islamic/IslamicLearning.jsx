import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, Target, BookOpen, Trophy } from 'lucide-react';
import QuranQuiz from './learning/QuranQuiz';
import IslamicTimeline from './learning/IslamicTimeline';
import LearningPaths from './learning/LearningPaths';
import LearningStats from './learning/LearningStats';

export default function IslamicLearning() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
          <GraduationCap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Islamic Learning</h1>
          <p className="text-slate-600">Interactive modules for deeper understanding</p>
        </div>
      </div>

      <LearningStats />

      <Tabs defaultValue="quiz" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quiz" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Quizzes
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="paths" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Learning Paths
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quiz">
          <QuranQuiz />
        </TabsContent>

        <TabsContent value="timeline">
          <IslamicTimeline />
        </TabsContent>

        <TabsContent value="paths">
          <LearningPaths />
        </TabsContent>
      </Tabs>
    </div>
  );
}