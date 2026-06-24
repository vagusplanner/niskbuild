import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Calendar, BookOpen, Users, Sparkles } from 'lucide-react';

const TIMELINE_DATA = {
  prophets: [
    { year: '~570 CE', title: 'Birth of Prophet Muhammad ﷺ', description: 'Born in Makkah in the Year of the Elephant', category: 'life' },
    { year: '610 CE', title: 'First Revelation', description: 'Prophet Muhammad ﷺ receives first revelation in Cave Hira', category: 'revelation' },
    { year: '622 CE', title: 'Hijra to Madinah', description: 'Migration marking start of Islamic calendar', category: 'migration' },
    { year: '624 CE', title: 'Battle of Badr', description: 'First major battle, Muslims achieve victory', category: 'battle' },
    { year: '630 CE', title: 'Conquest of Makkah', description: 'Peaceful conquest of Makkah', category: 'conquest' },
    { year: '632 CE', title: 'Farewell Sermon', description: 'Prophet\'s final sermon at Mount Arafat', category: 'sermon' }
  ],
  caliphates: [
    { year: '632-661 CE', title: 'Rashidun Caliphate', description: 'Era of the Four Rightly Guided Caliphs', category: 'governance' },
    { year: '661-750 CE', title: 'Umayyad Caliphate', description: 'Islamic empire expands across three continents', category: 'governance' },
    { year: '750-1258 CE', title: 'Abbasid Caliphate', description: 'Golden Age of Islamic civilization', category: 'governance' },
    { year: '1299-1922 CE', title: 'Ottoman Empire', description: 'Last major Islamic caliphate', category: 'governance' }
  ],
  golden_age: [
    { year: '8th-9th Century', title: 'House of Wisdom', description: 'Center of learning in Baghdad', category: 'education' },
    { year: '9th Century', title: 'Al-Khwarizmi', description: 'Father of Algebra develops mathematical systems', category: 'science' },
    { year: '10th Century', title: 'Ibn Sina (Avicenna)', description: 'Medical encyclopedia shapes medicine for centuries', category: 'medicine' },
    { year: '12th Century', title: 'Al-Idrisi', description: 'Creates detailed world map', category: 'geography' }
  ]
};

const CATEGORY_COLORS = {
  life: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  revelation: 'bg-purple-100 text-purple-800 border-purple-300',
  migration: 'bg-blue-100 text-blue-800 border-blue-300',
  battle: 'bg-red-100 text-red-800 border-red-300',
  conquest: 'bg-amber-100 text-amber-800 border-amber-300',
  sermon: 'bg-teal-100 text-teal-800 border-teal-300',
  governance: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  education: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  science: 'bg-violet-100 text-violet-800 border-violet-300',
  medicine: 'bg-rose-100 text-rose-800 border-rose-300',
  geography: 'bg-lime-100 text-lime-800 border-lime-300'
};

export default function IslamicTimeline() {
  const [selectedEvent, setSelectedEvent] = useState(null);

  const TimelineEvent = ({ event, index }) => (
    <motion.div
      initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative"
    >
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all border-2 border-slate-200 hover:border-indigo-300"
        onClick={() => setSelectedEvent(event)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Calendar className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="font-mono text-xs">
                  {event.year}
                </Badge>
                <Badge className={CATEGORY_COLORS[event.category]}>
                  {event.category}
                </Badge>
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">
                {event.title}
              </h3>
              <p className="text-sm text-slate-600">
                {event.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <Sparkles className="w-5 h-5" />
            Interactive Islamic History Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700">
            Explore key events in Islamic history from the life of Prophet Muhammad ﷺ through the Golden Age of Islamic civilization.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="prophets" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="prophets">
            <Users className="w-4 h-4 mr-2" />
            Prophetic Era
          </TabsTrigger>
          <TabsTrigger value="caliphates">
            <BookOpen className="w-4 h-4 mr-2" />
            Caliphates
          </TabsTrigger>
          <TabsTrigger value="golden_age">
            <Sparkles className="w-4 h-4 mr-2" />
            Golden Age
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prophets" className="space-y-4 mt-6">
          {TIMELINE_DATA.prophets.map((event, index) => (
            <TimelineEvent key={index} event={event} index={index} />
          ))}
        </TabsContent>

        <TabsContent value="caliphates" className="space-y-4 mt-6">
          {TIMELINE_DATA.caliphates.map((event, index) => (
            <TimelineEvent key={index} event={event} index={index} />
          ))}
        </TabsContent>

        <TabsContent value="golden_age" className="space-y-4 mt-6">
          {TIMELINE_DATA.golden_age.map((event, index) => (
            <TimelineEvent key={index} event={event} index={index} />
          ))}
        </TabsContent>
      </Tabs>

      {selectedEvent && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardHeader>
              <CardTitle className="text-indigo-900">
                {selectedEvent.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Badge variant="outline">{selectedEvent.year}</Badge>
                  <Badge className={CATEGORY_COLORS[selectedEvent.category]}>
                    {selectedEvent.category}
                  </Badge>
                </div>
                <p className="text-slate-700">{selectedEvent.description}</p>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedEvent(null)}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}