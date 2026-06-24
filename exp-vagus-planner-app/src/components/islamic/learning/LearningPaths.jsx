import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle, Lock, Play, Trophy } from 'lucide-react';
import { toast } from 'sonner';

const LEARNING_PATHS = [
  {
    id: 'basics',
    title: 'Islamic Basics',
    description: 'Foundation of Islamic beliefs and practices',
    difficulty: 'Beginner',
    duration: '2 weeks',
    modules: [
      { id: 1, title: 'Five Pillars of Islam', lessons: 5 },
      { id: 2, title: 'Articles of Faith', lessons: 6 },
      { id: 3, title: 'Daily Prayers Explained', lessons: 8 },
      { id: 4, title: 'Wudu and Purification', lessons: 4 }
    ]
  },
  {
    id: 'quran',
    title: 'Quranic Studies',
    description: 'Understanding and reflecting on the Quran',
    difficulty: 'Intermediate',
    duration: '4 weeks',
    modules: [
      { id: 1, title: 'Introduction to Tafsir', lessons: 6 },
      { id: 2, title: 'Major Themes in Quran', lessons: 8 },
      { id: 3, title: 'Stories of Prophets', lessons: 10 },
      { id: 4, title: 'Science of Quranic Recitation', lessons: 7 }
    ]
  },
  {
    id: 'hadith',
    title: 'Hadith Sciences',
    description: 'Study of Prophetic traditions and their authentication',
    difficulty: 'Advanced',
    duration: '6 weeks',
    modules: [
      { id: 1, title: 'Introduction to Hadith', lessons: 5 },
      { id: 2, title: 'Famous Hadith Collections', lessons: 7 },
      { id: 3, title: 'Hadith Authentication', lessons: 9 },
      { id: 4, title: 'Living by the Sunnah', lessons: 8 }
    ]
  },
  {
    id: 'history',
    title: 'Islamic History',
    description: 'Journey through Islamic civilization',
    difficulty: 'Intermediate',
    duration: '5 weeks',
    modules: [
      { id: 1, title: 'Life of Prophet Muhammad ﷺ', lessons: 12 },
      { id: 2, title: 'Rightly Guided Caliphs', lessons: 8 },
      { id: 3, title: 'Golden Age of Islam', lessons: 10 },
      { id: 4, title: 'Islamic Contributions to Science', lessons: 6 }
    ]
  }
];

export default function LearningPaths() {
  const [selectedPath, setSelectedPath] = useState(null);
  const queryClient = useQueryClient();

  const { data: progress = [] } = useQuery({
    queryKey: ['learning-progress'],
    queryFn: () => SDK.entities.LearningProgress.list()
  });

  const startPathMutation = useMutation({
    mutationFn: (pathData) => SDK.entities.LearningProgress.create(pathData),
    onSuccess: () => {
      queryClient.invalidateQueries(['learning-progress']);
      toast.success('Learning path started!');
    }
  });

  const getPathProgress = (pathId) => {
    const pathProgress = progress.filter(p => p.module_id === pathId);
    if (pathProgress.length === 0) return 0;
    
    const path = LEARNING_PATHS.find(p => p.id === pathId);
    const totalModules = path.modules.length;
    const completedModules = pathProgress.filter(p => p.completed).length;
    
    return (completedModules / totalModules) * 100;
  };

  const isPathStarted = (pathId) => {
    return progress.some(p => p.module_id === pathId);
  };

  const handleStartPath = (path) => {
    startPathMutation.mutate({
      module_type: 'learning_path',
      module_id: path.id,
      topic: path.title,
      progress_percentage: 0,
      completed: false
    });
  };

  if (selectedPath) {
    const path = LEARNING_PATHS.find(p => p.id === selectedPath);
    const pathProgress = getPathProgress(path.id);

    return (
      <div className="space-y-4">
        <Button 
          variant="outline" 
          onClick={() => setSelectedPath(null)}
          className="mb-4"
        >
          ← Back to Paths
        </Button>

        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-indigo-900">{path.title}</CardTitle>
                <CardDescription className="mt-1">
                  {path.description}
                </CardDescription>
              </div>
              <div className="text-right">
                <Badge className="mb-1">{path.difficulty}</Badge>
                <div className="text-xs text-slate-600">{path.duration}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600">Progress</span>
                <span className="font-medium text-indigo-600">{Math.round(pathProgress)}%</span>
              </div>
              <Progress value={pathProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {path.modules.map((module, index) => {
            const isCompleted = progress.some(p => 
              p.module_id === path.id && 
              p.topic === module.title && 
              p.completed
            );
            const isLocked = index > 0 && !progress.some(p => 
              p.module_id === path.id && 
              p.topic === path.modules[index - 1].title && 
              p.completed
            );

            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`${
                  isLocked 
                    ? 'opacity-50 border-slate-200' 
                    : 'border-indigo-200 hover:shadow-md'
                } transition-all`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${
                        isCompleted 
                          ? 'bg-green-100' 
                          : isLocked 
                          ? 'bg-slate-100' 
                          : 'bg-indigo-100'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : isLocked ? (
                          <Lock className="w-6 h-6 text-slate-400" />
                        ) : (
                          <BookOpen className="w-6 h-6 text-indigo-600" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800 mb-1">
                          Module {module.id}: {module.title}
                        </h3>
                        <div className="text-sm text-slate-600">
                          {module.lessons} lessons
                        </div>
                      </div>

                      {!isLocked && !isCompleted && (
                        <Button size="sm" className="bg-indigo-600">
                          <Play className="w-4 h-4 mr-2" />
                          Start
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <Trophy className="w-5 h-5" />
            Choose Your Learning Path
          </CardTitle>
          <CardDescription>
            Structured courses to deepen your Islamic knowledge
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {LEARNING_PATHS.map((path, index) => {
          const pathProgress = getPathProgress(path.id);
          const started = isPathStarted(path.id);

          return (
            <motion.div
              key={path.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-indigo-200 hover:shadow-lg transition-all h-full">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg">{path.title}</CardTitle>
                    <Badge variant={
                      path.difficulty === 'Beginner' ? 'default' :
                      path.difficulty === 'Intermediate' ? 'secondary' :
                      'destructive'
                    }>
                      {path.difficulty}
                    </Badge>
                  </div>
                  <CardDescription>{path.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{path.modules.length} modules</span>
                    <span className="text-slate-600">{path.duration}</span>
                  </div>

                  {started && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600">Progress</span>
                        <span className="font-medium text-indigo-600">
                          {Math.round(pathProgress)}%
                        </span>
                      </div>
                      <Progress value={pathProgress} className="h-1.5" />
                    </div>
                  )}

                  <Button
                    onClick={() => {
                      if (!started) {
                        handleStartPath(path);
                      }
                      setSelectedPath(path.id);
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    {started ? (
                      <>
                        <BookOpen className="w-4 h-4 mr-2" />
                        Continue Learning
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start Path
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}