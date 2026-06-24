import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, MapPin, Sparkles, Navigation, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const QUICK_QUESTIONS = [
  { icon: '🍽️', text: 'Best halal restaurant nearby' },
  { icon: '🕌', text: 'Nearest mosque/prayer room' },
  { icon: '🛍️', text: 'Halal grocery stores' },
  { icon: '🕯️', text: 'Islamic heritage sites' },
  { icon: '🚕', text: 'Muslim-friendly transport' },
  { icon: '🏥', text: 'Halal medical services' }
];

const POPULAR_CITIES = [
  { city: 'London', country: 'UK' },
  { city: 'Paris', country: 'France' },
  { city: 'Berlin', country: 'Germany' },
  { city: 'New York', country: 'USA' },
  { city: 'Los Angeles', country: 'USA' },
  { city: 'Toronto', country: 'Canada' },
  { city: 'Sydney', country: 'Australia' },
  { city: 'Tokyo', country: 'Japan' }
];

export default function MuslimTravelAssistant() {
  const [messages, setMessages] = useState([
    {
      id: 'intro',
      type: 'assistant',
      text: '🌍 Assalamu Alaikum! I\'m your Muslim Travel Assistant. Ask me anything about finding halal food, prayer rooms, Islamic sites, or local experiences anywhere in the world. Where are you traveling?'
    }
  ]);
  const [input, setInput] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(true);
  const [bookingMode, setBookingMode] = useState(null);
  const [userInterests, setUserInterests] = useState(['halal food', 'Islamic heritage']);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectCity = (city, country) => {
    const location = `${city}, ${country}`;
    setCurrentLocation(location);
    setShowLocationSelector(false);
    const msg = {
      id: Date.now(),
      type: 'assistant',
      text: `Great! You're in ${location}. How can I help you today? Ask me about halal restaurants, prayer times, mosques, or anything else!`
    };
    setMessages(prev => [...prev, msg]);
  };

  const handleSetCustomLocation = () => {
    if (!customLocation.trim()) {
      toast.error('Please enter a location');
      return;
    }
    setCurrentLocation(customLocation);
    setShowLocationSelector(false);
    const msg = {
      id: Date.now(),
      type: 'assistant',
      text: `Perfect! I can help you explore ${customLocation}. What are you looking for? 🌟`
    };
    setMessages(prev => [...prev, msg]);
    setCustomLocation('');
  };

  const handleQuickQuestion = async (question) => {
    if (!currentLocation) {
      toast.error('Please select a location first');
      return;
    }
    setInput(question);
    await sendMessage(question);
  };

  const sendMessage = async (text) => {
    if (!text.trim() || !currentLocation) return;

    const userMessage = { id: Date.now(), type: 'user', text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await base44.functions.invoke('pilgrimageConcierge', {
        question: text,
        current_location: currentLocation,
        context_type: 'muslim_travel',
        interests: userInterests,
        visited_places: []
      });

      const response = data.concierge_response;
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        text: response.answer,
        locations: response.specific_locations,
        tips: response.practical_tips,
        bookingNeeded: response.booking_needed,
        category: response.category,
        followUp: response.follow_up_questions
      };

      setMessages(prev => [...prev, assistantMessage]);
      toast.success('Got your answer!');
    } catch (error) {
      toast.error('Failed to get response');
      const errorMsg = {
        id: Date.now() + 1,
        type: 'error',
        text: 'Sorry, I couldn\'t process that. Try rephrasing your question.'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleGetRecommendations = async () => {
    if (!currentLocation) {
      toast.error('Please select a location first');
      return;
    }
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('generateLocalRecommendations', {
        current_location: currentLocation,
        user_interests: userInterests,
        time_available_hours: 3,
        budget_usd: 150
      });

      const recommendations = data.recommendations;
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'recommendations',
        recommendations: recommendations.recommendations,
        itinerary: recommendations.itinerary_suggestion,
        insights: recommendations.local_insights
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast.error('Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async (bookingType) => {
    if (!currentLocation) {
      toast.error('Please select a location first');
      return;
    }
    setBookingMode(bookingType);
    const message = {
      id: Date.now(),
      type: 'assistant',
      text: `I'll help you book ${bookingType} in ${currentLocation}. What date and time do you need?`
    };
    setMessages(prev => [...prev, message]);
  };

  const handleChangeLocation = () => {
    setShowLocationSelector(true);
    setCurrentLocation('');
    setMessages([{
      id: 'intro',
      type: 'assistant',
      text: '🌍 Where would you like to travel? Select a city or enter a custom location.'
    }]);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            <div>
              <h2 className="text-lg font-bold">Muslim Travel Assistant</h2>
              <p className="text-xs text-emerald-100">Halal • Prayer • Culture • Local Guides</p>
            </div>
          </div>
          {currentLocation && (
            <Button
              size="sm"
              variant="ghost"
              className="text-emerald-50 hover:text-white"
              onClick={handleChangeLocation}
            >
              <MapPin className="w-4 h-4 mr-1" />
              Change Location
            </Button>
          )}
        </div>
        {currentLocation && (
          <p className="text-xs text-emerald-100 mt-2">📍 Currently viewing: {currentLocation}</p>
        )}
      </div>

      {/* Location Selector */}
      <AnimatePresence>
        {showLocationSelector && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b bg-emerald-50 p-4 space-y-3"
          >
            <Label className="text-sm font-semibold text-emerald-900">Select Location or Enter Custom</Label>
            
            <div className="grid grid-cols-2 gap-2">
              {POPULAR_CITIES.map((loc, i) => (
                <Button
                  key={i}
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 justify-start"
                  onClick={() => handleSelectCity(loc.city, loc.country)}
                >
                  <span className="text-xs mr-1">📍</span>
                  {loc.city}
                </Button>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Input
                placeholder="Enter city and country..."
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSetCustomLocation()}
                className="text-sm"
              />
              <Button
                onClick={handleSetCustomLocation}
                className="bg-emerald-600 hover:bg-emerald-700"
                size="sm"
              >
                Go
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              {msg.type === 'user' && (
                <div className="flex justify-end">
                  <div className="bg-emerald-600 text-white rounded-lg px-4 py-2 max-w-xs text-sm">
                    {msg.text}
                  </div>
                </div>
              )}

              {msg.type === 'assistant' && (
                <div className="bg-white rounded-lg shadow-sm p-3 space-y-2">
                  <p className="text-sm text-slate-800">{msg.text}</p>

                  {/* Locations */}
                  {msg.locations?.length > 0 && (
                    <div className="space-y-2 mt-2 pt-2 border-t">
                      {msg.locations.map((loc, i) => (
                        <div key={i} className="bg-emerald-50 rounded p-2 text-xs">
                          <p className="font-semibold text-emerald-900">{loc.name}</p>
                          <p className="text-emerald-800">{loc.description}</p>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <Badge className="text-xs bg-emerald-200 text-emerald-800">
                              {loc.distance_km}km
                            </Badge>
                            {loc.ratings_score && (
                              <Badge className="text-xs bg-amber-200 text-amber-800">
                                ⭐ {loc.ratings_score}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tips */}
                  {msg.tips?.length > 0 && (
                    <div className="bg-amber-50 rounded p-2 text-xs space-y-1 mt-2">
                      <p className="font-semibold text-amber-900">💡 Tips:</p>
                      {msg.tips.map((tip, i) => (
                        <p key={i} className="text-amber-800">• {tip}</p>
                      ))}
                    </div>
                  )}

                  {/* Follow-up */}
                  {msg.followUp?.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-2">
                      {msg.followUp.slice(0, 2).map((q, i) => (
                        <Button
                          key={i}
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => handleQuickQuestion(q)}
                        >
                          {q}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {msg.type === 'recommendations' && (
                <div className="bg-white rounded-lg shadow-sm p-3 space-y-2">
                  <p className="font-semibold text-slate-900 text-sm">✨ Recommendations in {currentLocation}</p>
                  {msg.recommendations?.map((rec, i) => (
                    <div key={i} className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded p-2 text-xs">
                      <p className="font-semibold text-emerald-900">{rec.name}</p>
                      <p className="text-emerald-800 text-xs">{rec.description}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge className="text-xs bg-emerald-200 text-emerald-800">
                          ${rec.cost_usd}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {msg.type === 'error' && (
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-sm text-red-800">{msg.text}</p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {currentLocation && !showLocationSelector && (
        <div className="border-t p-4 bg-white space-y-2 max-h-40 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-600">Quick questions for {currentLocation}:</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_QUESTIONS.map((q, i) => (
              <Button
                key={i}
                size="sm"
                variant="outline"
                className="text-xs h-8 justify-start"
                onClick={() => handleQuickQuestion(q.text)}
              >
                <span className="mr-1">{q.icon}</span>
                {q.text}
              </Button>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-xs h-8"
              onClick={handleGetRecommendations}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Get Recommendations
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs h-8"
              onClick={() => handleBooking('transport')}
            >
              <Navigation className="w-3 h-3 mr-1" />
              Book Transport
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      {currentLocation && (
        <div className="border-t p-4 bg-white flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder="Ask me anything..."
            className="text-sm"
            disabled={loading}
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="bg-emerald-600 hover:bg-emerald-700"
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}