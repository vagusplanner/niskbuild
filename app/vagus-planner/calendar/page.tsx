'use client';

import { useEffect, useState } from 'react';
import Layout from '@/app/components/Layout';
import { createClient } from '@/lib/supabase/client';

type VpEvent = {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
};

export default function CalendarPage() {
  const [events, setEvents] = useState<VpEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setEvents([]);
          return;
        }

        const { data, error } = await supabase
          .schema('firstparty')
          .from('vp_events')
          .select('*')
          .eq('user_id', user.id)
          .order('event_date', { ascending: true, nullsLast: true });

        if (error) throw error;
        setEvents((data ?? []) as VpEvent[]);
      } catch (err) {
        console.error('Error fetching events:', err);
      } finally {
        setLoading(false);
      }
    };

    void fetchEvents();
  }, [supabase]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px] pt-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
            <p className="mt-4 text-nisk-muted text-sm">Loading calendar…</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto pt-24">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">📅 Calendar</h1>
          <button
            type="button"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            + Add Event
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="bg-gray-50 p-3 text-center text-sm font-semibold text-gray-600"
              >
                {day}
              </div>
            ))}
            {Array.from({ length: 30 }, (_, i) => (
              <div
                key={i}
                className="bg-white p-3 min-h-[80px] hover:bg-gray-50 transition cursor-pointer"
              >
                <span className="text-sm">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
          {events.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No events scheduled. Add your first event!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex justify-between items-center hover:shadow-md transition"
                >
                  <div>
                    <h3 className="font-semibold">{event.title}</h3>
                    {event.description && (
                      <p className="text-sm text-gray-500">{event.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {event.event_date
                        ? new Date(event.event_date).toLocaleDateString()
                        : 'No date'}
                    </p>
                    {event.location && (
                      <p className="text-xs text-gray-400">📍 {event.location}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
