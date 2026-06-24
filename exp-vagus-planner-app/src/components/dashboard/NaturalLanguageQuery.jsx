import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Sparkles } from 'lucide-react';

export default function NaturalLanguageQuery() {
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    // This would integrate with the AI to process natural language queries
    console.log('Query:', query);
  };

  return (
    <Card className="bg-gradient-to-r from-purple-100 to-blue-100 border-purple-200">
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Ask anything... e.g., 'What's my schedule today?' or 'Show overdue tasks'"
              className="pl-10 bg-white"
            />
          </div>
          <Button onClick={handleSearch} className="bg-purple-600 hover:bg-purple-700">
            <Sparkles className="w-4 h-4 mr-2" />
            Ask AI
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={() => setQuery("What's my schedule today?")}
            className="text-xs bg-white px-3 py-1 rounded-full hover:bg-purple-50 transition-colors"
          >
            Today's schedule
          </button>
          <button
            onClick={() => setQuery("Show overdue tasks")}
            className="text-xs bg-white px-3 py-1 rounded-full hover:bg-purple-50 transition-colors"
          >
            Overdue tasks
          </button>
          <button
            onClick={() => setQuery("What should I focus on?")}
            className="text-xs bg-white px-3 py-1 rounded-full hover:bg-purple-50 transition-colors"
          >
            Focus recommendations
          </button>
        </div>
      </div>
    </Card>
  );
}