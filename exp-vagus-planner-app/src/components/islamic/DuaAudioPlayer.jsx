import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function DuaAudioPlayer({ dua, duaText }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTransliteration, setShowTransliteration] = useState(false);
  const audioRef = useRef(null);

  const generateAudioUrl = async () => {
    // This would ideally use text-to-speech API
    // For now, we'll create a placeholder
    try {
      const utterance = new SpeechSynthesisUtterance(dua.arabic);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.8;
      return utterance;
    } catch (error) {
      console.error('Audio generation failed:', error);
      return null;
    }
  };

  const handlePlayAudio = async () => {
    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    } else {
      const utterance = await generateAudioUrl();
      if (utterance) {
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
        utterance.onend = () => setIsPlaying(false);
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(dua.arabic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-3">
      {/* Audio & Control Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={handlePlayAudio}
          size="sm"
          variant="outline"
          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 mr-1" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 mr-1" />
              Listen
            </>
          )}
        </Button>

        <Button
          onClick={handleCopy}
          size="sm"
          variant="outline"
          className="border-slate-300 hover:bg-slate-50"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 mr-1 text-green-600" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 mr-1" />
              Copy
            </>
          )}
        </Button>

        <Button
          onClick={() => setShowTransliteration(!showTransliteration)}
          size="sm"
          variant="outline"
          className="border-slate-300 hover:bg-slate-50"
        >
          {showTransliteration ? 'Hide' : 'Show'} Transliteration
        </Button>
      </div>

      {/* Arabic Text */}
      <div className="p-2 bg-emerald-50 rounded border border-emerald-200">
        <p className="text-sm font-arabic text-right text-emerald-900 leading-relaxed">
          {dua.arabic}
        </p>
      </div>

      {/* Transliteration - Interactive */}
      {showTransliteration && (
        <div className="p-2 bg-blue-50 rounded border border-blue-200 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-900">Transliteration</span>
            <span className="text-xs text-blue-700 italic">(Click words to hear pronunciation)</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {dua.transliteration?.split(' ').map((word, idx) => (
              <button
                key={idx}
                className="px-2 py-1 text-xs rounded bg-white border border-blue-300 hover:bg-blue-100 transition-colors text-blue-700 font-medium"
                onClick={() => {
                  const utterance = new SpeechSynthesisUtterance(word);
                  utterance.lang = 'ar-SA';
                  window.speechSynthesis.speak(utterance);
                }}
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Translation */}
      <div className="p-2 bg-slate-50 rounded">
        <p className="text-xs text-slate-600 mb-1 font-semibold">Translation:</p>
        <p className="text-xs text-slate-700">{dua.translation}</p>
      </div>

      {/* Occasion Info */}
      {dua.occasion && (
        <div className="p-2 bg-amber-50 rounded border border-amber-200">
          <p className="text-xs font-semibold text-amber-900 mb-1">When to recite:</p>
          <p className="text-xs text-amber-800">{dua.occasion}</p>
        </div>
      )}
    </div>
  );
}