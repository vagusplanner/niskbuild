import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
];

export default function TranslateButton({ text, onTranslated, variant = "ghost", size = "sm" }) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleTranslate = async (targetLanguage) => {
    if (!text?.trim()) {
      toast.error('No text to translate');
      return;
    }

    setIsTranslating(true);
    try {
      const { data } = await SDK.functions.invoke('translateContent', {
        text,
        target_language: targetLanguage.name,
        source_language: 'auto'
      });

      if (data.success) {
        setTranslatedText({
          text: data.translated_text,
          language: targetLanguage
        });
        
        if (onTranslated) {
          onTranslated(data.translated_text, targetLanguage);
        }
        
        toast.success(`Translated to ${targetLanguage.name}`);
      } else {
        toast.error('Translation failed');
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Failed to translate');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = () => {
    if (translatedText) {
      navigator.clipboard.writeText(translatedText.text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={variant} 
            size={size}
            disabled={isTranslating || !text?.trim()}
            className="gap-2"
          >
            {isTranslating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Languages className="w-4 h-4" />
            )}
            {size !== "icon" && "Translate"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 max-h-80 overflow-y-auto">
          {LANGUAGES.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleTranslate(lang)}
              className="cursor-pointer"
            >
              <span className="mr-2">{lang.flag}</span>
              {lang.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AnimatePresence>
        {translatedText && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 right-0 z-50 w-80 max-w-[90vw] p-4 bg-white rounded-lg shadow-xl border-2 border-teal-200"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-semibold text-teal-900">
                  {translatedText.language.flag} {translatedText.language.name}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  className="h-7 w-7"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTranslatedText(null)}
                  className="h-7 w-7"
                >
                  <Languages className="w-3 h-3 rotate-180" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {translatedText.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}