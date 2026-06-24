import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TimerIcon, Play, Pause, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const POMODORO_WORK = 25;
const POMODORO_BREAK = 5;
const LONG_BREAK = 15;

export default function PomodoroIntegration() {
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(POMODORO_WORK * 60);
  const [sessionCount, setSessionCount] = useState(0);
  const [isBreak, setIsBreak] = useState(false);
  const [customWork, setCustomWork] = useState(POMODORO_WORK);
  const [customBreak, setCustomBreak] = useState(POMODORO_BREAK);

  useEffect(() => {
    let interval;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      // Session complete
      if (isBreak) {
        // Back to work
        setIsBreak(false);
        setTimeLeft(customWork * 60);
        toast.success('Break over! Ready to focus?');
      } else {
        // Start break
        setIsBreak(true);
        setSessionCount(sessionCount + 1);
        const breakTime = sessionCount % 4 === 3 ? LONG_BREAK : customBreak;
        setTimeLeft(breakTime * 60);
        toast.success(`Session ${sessionCount + 1} complete! Take a ${breakTime}min break.`);
      }
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, isBreak, sessionCount, customWork, customBreak]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(customWork * 60);
    setIsBreak(false);
    setSessionCount(0);
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const progress = isBreak 
    ? 100 - (timeLeft / (customBreak * 60)) * 100
    : 100 - (timeLeft / (customWork * 60)) * 100;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="bg-gradient-to-br from-orange-50 dark:from-orange-950 to-red-50 dark:to-red-950 border-orange-200 dark:border-orange-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TimerIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            Pomodoro Timer
          </CardTitle>
          <CardDescription>{isBreak ? 'Break time' : 'Focus time'} - Session {sessionCount + 1}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timer Display */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative w-48 h-48">
              {/* Circular progress */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="rgba(0,0,0,0.1)"
                  strokeWidth="3"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={isBreak ? '#3b82f6' : '#f97316'}
                  strokeWidth="3"
                  strokeDasharray="282.7"
                  initial={{ strokeDashoffset: 282.7 }}
                  animate={{ strokeDashoffset: 282.7 * (1 - progress / 100) }}
                  transition={{ duration: 1 }}
                />
              </svg>

              {/* Timer text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-slate-900 dark:text-slate-100">
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  {isBreak ? 'Break' : 'Work'}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <Button
                size="icon"
                onClick={toggleTimer}
                className="rounded-full w-12 h-12"
              >
                {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={handleReset}
                className="rounded-full w-12 h-12"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
            <div>
              <Label htmlFor="work-time" className="text-xs">Work (min)</Label>
              <Input
                id="work-time"
                type="number"
                value={customWork}
                onChange={(e) => setCustomWork(Math.max(1, Number(e.target.value)))}
                disabled={isRunning}
                className="mt-1"
                min="1"
              />
            </div>
            <div>
              <Label htmlFor="break-time" className="text-xs">Break (min)</Label>
              <Input
                id="break-time"
                type="number"
                value={customBreak}
                onChange={(e) => setCustomBreak(Math.max(1, Number(e.target.value)))}
                disabled={isRunning}
                className="mt-1"
                min="1"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="text-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400">Sessions completed</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{sessionCount}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}