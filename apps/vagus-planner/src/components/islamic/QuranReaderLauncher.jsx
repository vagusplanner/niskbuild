import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, ExternalLink, ChevronRight } from 'lucide-react';
import QuranReader from './QuranReader';

export default function QuranReaderLauncher() {
  const [showReader, setShowReader] = useState(false);

  return (
    <>
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-900">
            <BookOpen className="w-5 h-5" />
            Quran Reader
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-emerald-700">
            Read and track your Quran progress with integrated goal tracking
          </p>
          
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => setShowReader(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Open Quran Reader
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Button>
            
            <Button
              onClick={() => window.open('https://quranly.com', '_blank')}
              variant="outline"
              className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Quranly.com
            </Button>
          </div>
        </CardContent>
      </Card>

      {showReader && (
        <QuranReader onClose={() => setShowReader(false)} />
      )}
    </>
  );
}