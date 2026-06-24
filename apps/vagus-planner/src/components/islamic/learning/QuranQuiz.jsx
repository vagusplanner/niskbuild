import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, Sparkles, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const QUIZ_TOPICS = [
  { id: 'tafsir', name: 'Tafsir & Interpretation', icon: '📖' },
  { id: 'prophets', name: 'Stories of Prophets', icon: '⭐' },
  { id: 'jurisprudence', name: 'Islamic Jurisprudence', icon: '⚖️' },
  { id: 'hadith', name: 'Hadith Knowledge', icon: '📚' },
  { id: 'history', name: 'Islamic History', icon: '🕌' },
  { id: 'practices', name: 'Islamic Practices', icon: '🤲' }
];

export default function QuranQuiz() {
  const [selectedTopic, setSelectedTopic] = useState('tafsir');
  const [difficulty, setDifficulty] = useState('medium');
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const queryClient = useQueryClient();

  const saveProgressMutation = useMutation({
    mutationFn: (data) => base44.entities.LearningProgress.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['learning-progress']);
    }
  });

  const generateQuiz = async () => {
    setLoading(true);
    setQuizComplete(false);
    setAnswers([]);
    setCurrentQuestion(0);
    
    try {
      const topic = QUIZ_TOPICS.find(t => t.id === selectedTopic);
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate an Islamic knowledge quiz on: ${topic.name}

Difficulty level: ${difficulty}

Create 5 multiple choice questions that test understanding of ${topic.name}.

For difficulty levels:
- easy: Basic concepts, straightforward questions
- medium: Intermediate understanding required
- hard: Deep knowledge, nuanced questions

Return this JSON structure:
{
  "title": "Quiz title",
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Why this is the correct answer and what the concept means",
      "reference": "Quran/Hadith reference if applicable"
    }
  ]
}

Ensure all questions are accurate, educational, and based on authentic Islamic sources.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  options: {
                    type: "array",
                    items: { type: "string" }
                  },
                  correct_answer: { type: "number" },
                  explanation: { type: "string" },
                  reference: { type: "string" }
                }
              }
            }
          }
        },
        add_context_from_internet: true
      });

      setQuiz(result);
    } catch (error) {
      toast.error('Failed to generate quiz');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (index) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(index);
    const correct = index === quiz.questions[currentQuestion].correct_answer;
    setAnswers([...answers, { question: currentQuestion, answer: index, correct }]);
    setShowResult(true);

    setTimeout(() => {
      if (currentQuestion < quiz.questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        setQuizComplete(true);
        const correctCount = [...answers, { correct }].filter(a => a.correct).length;
        const score = (correctCount / quiz.questions.length) * 100;
        
        saveProgressMutation.mutate({
          module_type: 'quiz',
          module_id: selectedTopic,
          topic: QUIZ_TOPICS.find(t => t.id === selectedTopic).name,
          quiz_score: score,
          questions_answered: quiz.questions.length,
          correct_answers: correctCount,
          completed: true,
          completed_date: new Date().toISOString()
        });
      }
    }, 3000);
  };

  const resetQuiz = () => {
    setQuiz(null);
    setCurrentQuestion(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowResult(false);
    setQuizComplete(false);
  };

  if (!quiz) {
    return (
      <div className="space-y-6">
        <Card className="border-indigo-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-900">
              <Sparkles className="w-5 h-5" />
              Start Your Quiz
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Select Topic
              </label>
              <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUIZ_TOPICS.map(topic => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.icon} {topic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Difficulty Level
              </label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={generateQuiz} 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Quiz...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Quiz
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {QUIZ_TOPICS.map(topic => (
            <Card 
              key={topic.id}
              className="cursor-pointer hover:shadow-md transition-all border-indigo-100 hover:border-indigo-300"
              onClick={() => setSelectedTopic(topic.id)}
            >
              <CardContent className="p-4 text-center">
                <div className="text-3xl mb-2">{topic.icon}</div>
                <div className="text-sm font-medium text-slate-700">{topic.name}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (quizComplete) {
    const score = (answers.filter(a => a.correct).length / quiz.questions.length) * 100;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Card className="border-indigo-200">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {score >= 80 ? (
                <CheckCircle className="w-10 h-10 text-green-600" />
              ) : (
                <XCircle className="w-10 h-10 text-orange-600" />
              )}
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Quiz Complete!</h2>
            <p className="text-slate-600 mb-6">You scored {Math.round(score)}%</p>
            
            <div className="mb-6">
              <div className="text-3xl font-bold text-indigo-600 mb-1">
                {answers.filter(a => a.correct).length}/{quiz.questions.length}
              </div>
              <div className="text-sm text-slate-500">Correct Answers</div>
            </div>

            <div className="flex gap-2 justify-center">
              <Button onClick={resetQuiz} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Another Topic
              </Button>
              <Button onClick={generateQuiz} className="bg-indigo-600">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retake Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <Badge className="bg-indigo-600">
          Question {currentQuestion + 1} of {quiz.questions.length}
        </Badge>
        <div className="text-sm text-slate-600">
          {answers.filter(a => a.correct).length} correct
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      <Card className="border-indigo-200">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">
            {question.question}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <AnimatePresence mode="wait">
            {question.options.map((option, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleAnswerSelect(index)}
                disabled={selectedAnswer !== null}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  selectedAnswer === null
                    ? 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                    : selectedAnswer === index
                    ? index === question.correct_answer
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-red-50'
                    : index === question.correct_answer
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-200 opacity-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {selectedAnswer !== null && (
                    index === question.correct_answer ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : selectedAnswer === index ? (
                      <XCircle className="w-5 h-5 text-red-600" />
                    ) : null
                  )}
                  <span className="flex-1">{option}</span>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>

          {showResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200"
            >
              <div className="font-medium text-indigo-900 mb-2">Explanation:</div>
              <p className="text-slate-700 mb-2">{question.explanation}</p>
              {question.reference && (
                <div className="text-sm text-indigo-600">
                  <strong>Reference:</strong> {question.reference}
                </div>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}