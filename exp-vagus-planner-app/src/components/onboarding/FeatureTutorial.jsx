import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

export default function FeatureTutorial({ feature, onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!feature || !feature.tutorial_steps) return null;

  const steps = feature.tutorial_steps;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <Card className="w-full max-w-2xl">
        <CardContent className="p-0">
          {/* Header */}
          <div className="p-6 border-b flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-800">{feature.name}</h3>
              <p className="text-sm text-slate-500">Step {currentStep + 1} of {steps.length}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onSkip}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="px-6 py-3 bg-slate-50">
            <div className="flex gap-2">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 flex-1 rounded-full transition-all ${
                    idx <= currentStep ? 'bg-teal-600' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 min-h-[300px]"
            >
              <div className="mb-4">
                {steps[currentStep].image_url && (
                  <img 
                    src={steps[currentStep].image_url} 
                    alt={steps[currentStep].title}
                    className="w-full rounded-lg mb-4"
                  />
                )}
                <h4 className="text-lg font-semibold text-slate-800 mb-2">
                  {steps[currentStep].title}
                </h4>
                <p className="text-slate-600">
                  {steps[currentStep].description}
                </p>
              </div>

              {steps[currentStep].key_points && (
                <div className="space-y-2">
                  {steps[currentStep].key_points.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-slate-700">{point}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Actions */}
          <div className="p-6 border-t flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : onSkip()}
            >
              {currentStep > 0 ? (
                <>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </>
              ) : (
                'Skip Tutorial'
              )}
            </Button>
            <Button
              onClick={() => isLastStep ? onComplete() : setCurrentStep(currentStep + 1)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isLastStep ? 'Got It!' : 'Next'}
              {!isLastStep && <ChevronRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}