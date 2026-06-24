import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Palette, Clock, Calendar, RotateCw, Settings } from 'lucide-react';
import ColorPaletteCustomizer from './ColorPaletteCustomizer';
import WorkingHoursCustomizer from './WorkingHoursCustomizer';
import DateFormatCustomizer from './DateFormatCustomizer';

export default function CalendarCustomizationPanel({ settings }) {
  const [activeTab, setActiveTab] = useState('colors');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <Card className="border-2 border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-600" />
            Calendar Customization
          </CardTitle>
          <p className="text-sm text-slate-500 mt-2">
            Personalize your calendar experience with custom colors, working hours, and date formats
          </p>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-100">
              <TabsTrigger value="colors" className="flex items-center gap-2 text-xs sm:text-sm">
                <Palette className="w-4 h-4" />
                <span className="hidden sm:inline">Colors</span>
              </TabsTrigger>
              <TabsTrigger value="hours" className="flex items-center gap-2 text-xs sm:text-sm">
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Hours</span>
              </TabsTrigger>
              <TabsTrigger value="format" className="flex items-center gap-2 text-xs sm:text-sm">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Format</span>
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <TabsContent value="colors" className="space-y-4">
                  <ColorPaletteCustomizer settings={settings} />
                </TabsContent>

                <TabsContent value="hours" className="space-y-4">
                  <WorkingHoursCustomizer settings={settings} />
                </TabsContent>

                <TabsContent value="format" className="space-y-4">
                  <DateFormatCustomizer settings={settings} />
                </TabsContent>
              </motion.div>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}