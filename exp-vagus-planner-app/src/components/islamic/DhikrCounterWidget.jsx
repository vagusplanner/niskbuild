import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Hand, RotateCcw, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

const COMMON_DHIKR = [
  { text: 'SubhanAllah', target: 33, color: 'from-blue-500 to-cyan-600' },
  { text: 'Alhamdulillah', target: 33, color: 'from-green-500 to-emerald-600' },
  { text: 'Allahu Akbar', target: 34, color: 'from-purple-500 to-indigo-600' },
  { text: 'La ilaha illallah', target: 100, color: 'from-amber-500 to-orange-600' }
];

export default function DhikrCounterWidget() {
  const [selectedDhikr, setSelectedDhikr] = useState(COMMON_DHIKR[0]);
  const [count, setCount] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (count >= selectedDhikr.target && !completed) {
      setCompleted(true);
    }
  }, [count, selectedDhikr.target, completed]);

  const increment = () => {
    setCount(prev => prev + 1);
    setCompleted(false);
  };

  const reset = () => {
    setCount(0);
    setCompleted(false);
  };

  const switchDhikr = (dhikr) => {
    setSelectedDhikr(dhikr);
    setCount(0);
    setCompleted(false);
  };

  const progress = Math.min((count / selectedDhikr.target) * 100, 100);

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hand className="w-5 h-5 text-indigo-600" />
          Dhikr Counter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dhikr Selection */}
        <div className="flex gap-2 flex-wrap">
          {COMMON_DHIKR.map((dhikr, idx) => (
            <button
              key={idx}
              onClick={() => switchDhikr(dhikr)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                selectedDhikr.text === dhikr.text
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {dhikr.text}
            </button>
          ))}
        </div>

        {/* Counter Display */}
        <div className="text-center space-y-4 py-6">
          <motion.div
            key={count}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="relative"
          >
            <div className={`w-40 h-40 mx-auto rounded-full bg-gradient-to-br ${selectedDhikr.color} flex items-center justify-center shadow-2xl`}>
              <div className="text-center text-white">
                <p className="text-5xl font-bold">{count}</p>
                <p className="text-sm opacity-90">/ {selectedDhikr.target}</p>
              </div>
            </div>
            
            {/* Progress Ring */}
            <svg className="absolute inset-0 w-40 h-40 mx-auto -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="75"
                stroke="white"
                strokeWidth="4"
                fill="none"
                opacity="0.3"
              />
              <circle
                cx="80"
                cy="80"
                r="75"
                stroke="white"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 75}`}
                strokeDashoffset={`${2 * Math.PI * 75 * (1 - progress / 100)}`}
                className="transition-all duration-300"
              />
            </svg>

            {completed && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2"
              >
                <Trophy className="w-8 h-8 text-yellow-500" />
              </motion.div>
            )}
          </motion.div>

          <p className="text-lg font-arabic text-indigo-900">{selectedDhikr.text}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={increment}
            className={`flex-1 h-16 text-lg bg-gradient-to-r ${selectedDhikr.color} hover:opacity-90`}
          >
            <Hand className="w-6 h-6 mr-2" />
            Count
          </Button>
          <Button
            onClick={reset}
            variant="outline"
            className="w-16 h-16"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>

        {completed && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-green-100 border border-green-200 rounded-lg text-center"
          >
            <p className="text-sm text-green-800 font-medium">
              ✨ Completed! May Allah accept your dhikr
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}