import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, Loader2, CheckCircle, Calendar, MapPin, 
  Plane, Hotel, FileText, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ItineraryImporter({ onItineraryImported }) {
  const [importing, setImporting] = useState(false);
  const [foundItineraries, setFoundItineraries] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const scanEmailForItineraries = async () => {
    setImporting(true);
    setShowResults(false);
    
    try {
      // Call backend function to scan Gmail for travel confirmations
      const { data } = await base44.functions.invoke('scanTravelEmails', {});
      
      if (data.itineraries && data.itineraries.length > 0) {
        setFoundItineraries(data.itineraries);
        setShowResults(true);
        toast.success(`Found ${data.itineraries.length} travel booking(s) in your email`);
      } else {
        toast.info('No travel bookings found in recent emails');
      }
    } catch (error) {
      console.error('Failed to scan emails:', error);
      toast.error('Failed to scan emails for itineraries');
    } finally {
      setImporting(false);
    }
  };

  const importItinerary = async (itinerary) => {
    try {
      await onItineraryImported(itinerary);
      toast.success('Itinerary imported successfully!');
      
      // Remove from list
      setFoundItineraries(prev => prev.filter(i => i.id !== itinerary.id));
    } catch (error) {
      toast.error('Failed to import itinerary');
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-xl shadow-sm">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">
              Import Travel Bookings
            </h3>
            <p className="text-sm text-slate-600 mb-3">
              Automatically detect and import travel bookings from your Gmail (Booking.com, Airbnb, airlines, etc.)
            </p>
            <Button
              onClick={scanEmailForItineraries}
              disabled={importing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning Emails...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Scan My Email
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      <AnimatePresence>
        {showResults && foundItineraries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Found {foundItineraries.length} Travel Booking{foundItineraries.length > 1 ? 's' : ''}
            </h4>
            
            {foundItineraries.map((itinerary, idx) => (
              <motion.div
                key={itinerary.id || idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="p-4 bg-white border-slate-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h5 className="font-semibold text-slate-800">
                          {itinerary.title}
                        </h5>
                        <Badge className="text-xs bg-blue-100 text-blue-700">
                          {itinerary.type}
                        </Badge>
                      </div>
                      
                      {itinerary.destination && (
                        <p className="text-sm text-slate-600 flex items-center gap-1 mb-1">
                          <MapPin className="w-4 h-4" />
                          {itinerary.destination}
                        </p>
                      )}
                      
                      {itinerary.dates && (
                        <p className="text-sm text-slate-600 flex items-center gap-1 mb-1">
                          <Calendar className="w-4 h-4" />
                          {itinerary.dates}
                        </p>
                      )}
                      
                      {itinerary.confirmation && (
                        <p className="text-xs text-slate-500 mt-2">
                          Confirmation: {itinerary.confirmation}
                        </p>
                      )}
                      
                      {itinerary.details && (
                        <p className="text-xs text-slate-500 mt-1">
                          {itinerary.details}
                        </p>
                      )}
                    </div>
                    
                    <Button
                      onClick={() => importItinerary(itinerary)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Import
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}