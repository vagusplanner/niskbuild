import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, MapPin, Sparkles, BookOpen, Navigation, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const QUICK_QUESTIONS = [
  { icon: '🍽️', text: 'Best nearby halal restaurant' },
  { icon: '🕌', text: 'Nearest prayer room' },
  { icon: '🏛️', text: 'How to reach historical site' },
  { icon: '🚕', text: 'Local transport options' },
  { icon: '🛍️', text: 'Best shopping areas' },
  { icon: '🏥', text: 'Medical facilities nearby' }
];

export default function PilgrimageConcierge({ currentLocation = 'Mecca', userInterests = [] }) {
  const [messages, setMessages] = useState([
    {
      id: 'intro',
      type: 'assistant',
      text: '👋 Hello! I\'m your AI pilgrimage concierge. Ask me anything about your current location, and I\'ll provide instant recommendations, directions, and booking assistance. How can I help?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [bookingMode, setBookingMode] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleQuickQuestion = async (question) => {
    setInput(question);
    await sendMessage(question);
  };

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    const userMessage = { id: Date.now(), type: 'user', text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await base44.functions.invoke('pilgrimageConcierge', {
        question: text,
        current_location: currentLocation,
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
      const errorMsg = { id: Date.now() + 1, type: 'error', text: 'Sorry, I couldn\'t process that. Try rephrasing your question.' };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleGetRecommendations = async () => {
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
      setShowRecommendations(true);
    } catch (error) {
      toast.error('Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async (bookingType) => {
    setBookingMode(bookingType);
    const message = {
      id: Date.now(),
      type: 'assistant',
      text: `I'll help you book ${bookingType}. What date and time do you need?`
    };
    setMessages(prev => [...prev, message]);
  };

  const handleBookingRequest = async (text) => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('assistBooking', {
        booking_type: bookingMode,
        destination: currentLocation,
        date: new Date().toISOString().split('T')[0],
        time: '14:00',
        party_size: 1,
        special_requirements: [],
        budget_usd: 200,
        preferences: { language: 'English' }
      });

      const booking = data.booking_assistance;
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'booking',
        bookingInfo: booking,
        options: booking.options
      };

      setMessages(prev => [...prev, assistantMessage]);
      setBookingMode(null);
    } catch (error) {
      toast.error('Failed to process booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5" />
          <h2 className="text-lg font-bold">Pilgrimage Concierge</h2>
        </div>
        <p className="text-xs text-blue-100">Instant answers • Smart recommendations • Booking assistance</p>
      </div>

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
                  <div className="bg-blue-600 text-white rounded-lg px-4 py-2 max-w-xs text-sm">
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
                        <div key={i} className="bg-blue-50 rounded p-2 text-xs">
                          <p className="font-semibold text-slate-900">{loc.name}</p>
                          <p className="text-slate-700">{loc.description}</p>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <Badge className="text-xs bg-blue-200 text-blue-800">
                              {loc.distance_km}km away
                            </Badge>
                            <Badge className="text-xs bg-emerald-200 text-emerald-800">
                              {loc.estimated_travel_time_minutes}m walk
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

                  {/* Follow-up Questions */}
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
                  <p className="font-semibold text-slate-900 text-sm">✨ Personalized Recommendations</p>
                  {msg.recommendations?.map((rec, i) => (
                    <div key={i} className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded p-2 text-xs">
                      <p className="font-semibold text-emerald-900">{rec.name}</p>
                      <p className="text-emerald-800">{rec.description}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge className="text-xs bg-emerald-200 text-emerald-800">
                          ${rec.cost_usd}
                        </Badge>
                        <Badge className="text-xs bg-blue-200 text-blue-800">
                          {rec.duration_minutes}m
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {msg.itinerary && (
                    <div className="bg-blue-50 rounded p-2 mt-2 text-xs text-blue-900">
                      <p className="font-semibold mb-1">📍 Suggested Itinerary:</p>
                      <p>{msg.itinerary}</p>
                    </div>
                  )}
                </div>
              )}

              {msg.type === 'booking' && (
                <div className="bg-white rounded-lg shadow-sm p-3 space-y-2">
                  <p className="font-semibold text-slate-900 text-sm">🎫 Booking Options</p>
                  {msg.options?.map((opt, i) => (
                    <div key={i} className="bg-purple-50 rounded p-2 text-xs space-y-1">
                      <p className="font-semibold text-purple-900">{opt.provider} - {opt.option_name}</p>
                      <p className="text-purple-800">{opt.description}</p>
                      <div className="flex justify-between items-center">
                        <Badge className="text-xs bg-purple-200 text-purple-800">
                          ${opt.price_usd}
                        </Badge>
                        <Button
                          size="sm"
                          className="text-xs h-6 bg-purple-600"
                          onClick={() => window.open(opt.how_to_book, '_blank')}
                        >
                          Book Now
                        </Button>
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
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {!showRecommendations && messages.length <= 1 && (
        <div className="border-t p-4 bg-white space-y-2">
          <p className="text-xs font-semibold text-slate-600 mb-2">Quick questions:</p>
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
      <div className="border-t p-4 bg-white flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder={bookingMode ? 'Provide booking details...' : 'Ask me anything...'}
          className="text-sm"
          disabled={loading}
        />
        <Button
          onClick={() => bookingMode ? handleBookingRequest(input) : sendMessage(input)}
          disabled={!input.trim() || loading}
          className="bg-blue-600 hover:bg-blue-700"
          size="icon"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}