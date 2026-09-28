import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowRight, Sparkles, RefreshCw, AlertCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const GOLD = "#B8952A";
const FOREST = "#2C3B2D";

const urgencyStyle = {
  today: { label: "Today", bg: "bg-red-50 border-red-200", dot: "#dc2626", text: "text-red-700" },
  soon:  { label: "Soon",  bg: "bg-amber-50 border-amber-200", dot: GOLD, text: "text-amber-700" },
  upcoming: { label: "Upcoming", bg: "bg-secondary border-border", dot: "#8A9A7A", text: "text-muted-foreground" },
};

const toolRoutes = {
  speech: "/ai-coach",
  roleplay: "/ai-coach",
  writing: "/ai-coach",
  email: "/ai-coach",
  style: "/ai-coach",
};

export default function CalendarPrepPanel() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("calendarPrepSuggestions", {});
      if (res.data?.not_connected) {
        setError("Google Calendar not connected. Please connect it via Dashboard → Integrations.");
      } else {
        setEvents(res.data?.events || []);
      }
    } catch (e) {
      setError("Could not load calendar. Make sure Google Calendar is connected.");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="bg-card rounded-2xl border border-border p-6 flex items-center gap-3">
      <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
      <span className="font-inter text-sm text-muted-foreground">Loading your calendar…</span>
    </div>
  );

  if (error) return (
    <div className="bg-card rounded-2xl border border-border p-5 flex items-start gap-3">
      <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="font-inter text-sm text-muted-foreground">{error}</p>
        <Button variant="ghost" size="sm" className="mt-2 rounded-full text-xs px-3 h-7" onClick={load}>Retry</Button>
      </div>
    </div>
  );

  if (events.length === 0) return (
    <div className="bg-card rounded-2xl border border-border p-6 text-center space-y-2">
      <Calendar className="w-8 h-8 mx-auto text-muted-foreground" />
      <p className="font-cormorant text-lg text-foreground">No meetings in the next 7 days</p>
      <p className="font-inter text-xs text-muted-foreground">Check back when events are added to your calendar.</p>
    </div>
  );

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-cormorant text-xl font-medium text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Upcoming Meetings
          </h2>
          <p className="font-inter text-xs text-muted-foreground mt-0.5">
            AI-suggested prep sessions for your next 7 days
          </p>
        </div>
        <button onClick={load} className="text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2">
        {events.slice(0, 6).map((event, i) => {
          const urg = urgencyStyle[event.urgency] || urgencyStyle.upcoming;
          const isOpen = expanded === event.event_id;

          return (
            <div key={event.event_id || i}
              className={`rounded-xl border transition-all ${urg.bg}`}>
              <button className="w-full text-left p-4 flex items-start gap-3"
                onClick={() => setExpanded(isOpen ? null : event.event_id)}>
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: urg.dot }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-inter text-sm font-medium text-foreground truncate">{event.title}</p>
                    <span className={`font-inter text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${urg.text}`}
                      style={{ backgroundColor: urg.dot + "20" }}>
                      {urg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <p className="font-inter text-xs text-muted-foreground">{event.start_formatted}</p>
                    {event.attendees_count > 0 && (
                      <span className="font-inter text-xs text-muted-foreground">· {event.attendees_count} attendee{event.attendees_count !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/40 pt-3">
                  {event.description && (
                    <p className="font-inter text-xs text-muted-foreground leading-relaxed">{event.description}</p>
                  )}
                  <div className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ backgroundColor: GOLD + "12", border: `1px solid ${GOLD}30` }}>
                    <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: GOLD }} />
                    <div className="flex-1">
                      <p className="font-inter text-xs font-medium text-foreground">Suggested: {event.prep_label}</p>
                      <p className="font-inter text-xs text-muted-foreground mt-0.5">{event.prep_reason}</p>
                    </div>
                    <Link to="/ai-coach">
                      <Button size="sm" className="rounded-full gap-1 text-xs h-7 px-3 shrink-0"
                        style={{ backgroundColor: FOREST, color: "white" }}>
                        Prime <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}