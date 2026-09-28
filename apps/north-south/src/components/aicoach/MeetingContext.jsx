import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Calendar, Sparkles, Clock, Users, ChevronRight, AlertCircle,
  RefreshCw, Loader2, ArrowLeft, CheckSquare, AlertTriangle, MessageSquare, Target, Eye
} from "lucide-react";

const GOLD = "#B8952A";
const FOREST = "#2C3B2D";

const urgencyStyle = {
  today:    { label: "Today",    dot: "#dc2626", bg: "bg-red-50 border-red-200",     text: "text-red-700" },
  soon:     { label: "Soon",     dot: GOLD,      bg: "bg-amber-50 border-amber-200",  text: "text-amber-700" },
  upcoming: { label: "Upcoming", dot: "#8A9A7A", bg: "bg-secondary border-border",   text: "text-muted-foreground" },
};

function Section({ icon: Icon, title, color, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: (color || GOLD) + "20" }}>
          <Icon className="w-3.5 h-3.5" style={{ color: color || GOLD }} />
        </div>
        <h3 className="font-inter text-xs uppercase tracking-wider font-semibold" style={{ color: color || GOLD }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`bg-card rounded-2xl border border-border p-5 ${className}`}>
      {children}
    </div>
  );
}

export default function MeetingContext() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notConnected, setNotConnected] = useState(false);
  const [error, setError] = useState(null);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [guide, setGuide] = useState(null);
  const [generating, setGenerating] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("meetingContext", {});
      if (res.data?.not_connected) {
        setNotConnected(true);
      } else {
        setEvents(res.data?.events || []);
      }
    } catch (e) {
      setError("Could not load calendar. Check your Google Calendar connection.");
    }
    setLoading(false);
  };

  const generateGuide = async (event) => {
    setSelectedEvent(event);
    setGuide(null);
    setGenerating(true);
    try {
      const res = await base44.functions.invoke("meetingContext", { event_id: event.event_id });
      setGuide(res.data?.guide || null);
    } catch (e) {
      setError("Failed to generate prep guide.");
    }
    setGenerating(false);
  };

  useEffect(() => { loadEvents(); }, []);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="bg-card rounded-3xl border border-border p-10 flex items-center justify-center gap-3 max-w-3xl mx-auto">
      <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
      <span className="font-inter text-sm text-muted-foreground">Loading your calendar…</span>
    </div>
  );

  // ── Not connected ───────────────────────────────────────────────────────────
  if (notConnected) return (
    <div className="bg-card rounded-3xl border border-border p-10 text-center space-y-4 max-w-3xl mx-auto">
      <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground" />
      <p className="font-cormorant text-2xl text-foreground">Google Calendar not connected</p>
      <p className="font-inter text-sm text-muted-foreground max-w-sm mx-auto">
        Ask your administrator to connect Google Calendar via Dashboard → Integrations to use Meeting Context.
      </p>
    </div>
  );

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error && !selectedEvent) return (
    <div className="bg-card rounded-3xl border border-border p-10 flex items-start gap-3 max-w-3xl mx-auto">
      <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="font-inter text-sm text-muted-foreground">{error}</p>
        <Button variant="ghost" size="sm" className="mt-2 rounded-full text-xs px-3 h-7" onClick={loadEvents}>Retry</Button>
      </div>
    </div>
  );

  // ── Guide view ──────────────────────────────────────────────────────────────
  if (selectedEvent) {
    const urg = urgencyStyle[selectedEvent.urgency] || urgencyStyle.upcoming;
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Back + header */}
        <button onClick={() => { setSelectedEvent(null); setGuide(null); setError(null); }}
          className="flex items-center gap-1.5 font-inter text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to meetings
        </button>

        <div className="bg-card rounded-3xl border border-border overflow-hidden">
          {/* Event header strip */}
          <div className="px-6 py-5 border-b border-border" style={{ background: FOREST }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-inter text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: urg.dot + "30", color: urg.dot === "#8A9A7A" ? "#ccc" : urg.dot }}>
                    {urg.label}
                  </span>
                </div>
                <h2 className="font-cormorant text-2xl font-medium text-white">{selectedEvent.title}</h2>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-white/60 text-xs font-inter">
                <Clock className="w-3.5 h-3.5" /> {selectedEvent.start_formatted}
              </div>
              {selectedEvent.attendees_count > 0 && (
                <div className="flex items-center gap-1.5 text-white/60 text-xs font-inter">
                  <Users className="w-3.5 h-3.5" /> {selectedEvent.attendees_count} attendee{selectedEvent.attendees_count !== 1 ? "s" : ""}
                </div>
              )}
              {selectedEvent.location && (
                <div className="text-white/60 text-xs font-inter">{selectedEvent.location}</div>
              )}
            </div>
          </div>

          {/* Generating state */}
          {generating && (
            <div className="p-10 flex flex-col items-center gap-4 text-center">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
              <div>
                <p className="font-cormorant text-xl text-foreground">Preparing your guide…</p>
                <p className="font-inter text-sm text-muted-foreground mt-1">
                  Analysing meeting context and stakeholders
                </p>
              </div>
            </div>
          )}

          {/* Guide content */}
          {guide && !generating && (
            <div className="p-6 space-y-7">

              {/* Executive summary */}
              {guide.executive_summary && (
                <div className="p-4 rounded-2xl" style={{ backgroundColor: FOREST + "10", border: `1px solid ${FOREST}20` }}>
                  <p className="font-cormorant text-lg text-foreground leading-relaxed italic">"{guide.executive_summary}"</p>
                </div>
              )}

              {/* Key Objectives */}
              {guide.key_objectives?.length > 0 && (
                <Section icon={Target} title="Key Objectives" color={FOREST}>
                  <div className="space-y-2">
                    {guide.key_objectives.map((obj, i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-xl bg-secondary/50">
                        <span className="font-inter text-xs font-bold text-primary mt-0.5 shrink-0">{i + 1}</span>
                        <div>
                          <p className="font-inter text-sm font-medium text-foreground">{obj.objective}</p>
                          <p className="font-inter text-xs text-muted-foreground mt-0.5">{obj.why_it_matters}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Opening Lines */}
              {guide.opening_lines?.length > 0 && (
                <Section icon={MessageSquare} title="Opening Lines" color="#16a34a">
                  <div className="space-y-2">
                    {guide.opening_lines.map((line, i) => (
                      <div key={i} className="p-3 rounded-xl bg-green-50 border border-green-100">
                        <p className="font-cormorant text-base italic text-green-900">"{line.line}"</p>
                        {line.context && (
                          <p className="font-inter text-xs text-green-700 mt-1">{line.context}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Tough Questions */}
              {guide.tough_questions?.length > 0 && (
                <Section icon={AlertTriangle} title="Potential Tough Questions" color="#dc2626">
                  <div className="space-y-3">
                    {guide.tough_questions.map((tq, i) => (
                      <div key={i} className="rounded-xl border border-red-100 overflow-hidden">
                        <div className="px-4 py-2.5 bg-red-50">
                          <p className="font-inter text-sm font-medium text-red-800">Q: {tq.question}</p>
                        </div>
                        <div className="px-4 py-2.5 bg-card">
                          <p className="font-inter text-xs text-muted-foreground leading-relaxed">
                            <span className="font-medium text-foreground">Approach: </span>{tq.suggested_answer_approach}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Stakeholder Insights */}
              {guide.stakeholder_insights?.length > 0 && (
                <Section icon={Users} title="Stakeholder Insights" color={GOLD}>
                  <div className="space-y-2">
                    {guide.stakeholder_insights.map((s, i) => (
                      <div key={i} className="p-4 rounded-xl border" style={{ backgroundColor: GOLD + "08", borderColor: GOLD + "25" }}>
                        <p className="font-inter text-sm font-semibold text-foreground mb-1">{s.name}</p>
                        <p className="font-inter text-xs text-muted-foreground leading-relaxed">
                          <span className="font-medium text-foreground">Likely agenda: </span>{s.likely_agenda}
                        </p>
                        <p className="font-inter text-xs text-muted-foreground leading-relaxed mt-1">
                          <span className="font-medium text-foreground">How to engage: </span>{s.how_to_engage}
                        </p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* 3-minute checklist + tone row */}
              <div className="grid sm:grid-cols-2 gap-5">
                {guide.three_minute_checklist?.length > 0 && (
                  <Section icon={CheckSquare} title="3-Minute Checklist" color="#6366f1">
                    <ul className="space-y-1.5">
                      {guide.three_minute_checklist.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 font-inter text-sm text-foreground">
                          <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-indigo-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                <div className="space-y-4">
                  {guide.tone_recommendation && (
                    <Section icon={Sparkles} title="Tone to Adopt" color={GOLD}>
                      <p className="font-inter text-sm text-foreground leading-relaxed">{guide.tone_recommendation}</p>
                    </Section>
                  )}
                  {guide.watch_out_for && (
                    <Section icon={Eye} title="Watch Out For" color="#ef4444">
                      <p className="font-inter text-sm text-foreground leading-relaxed">{guide.watch_out_for}</p>
                    </Section>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Event list ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="bg-card rounded-3xl border border-border p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-cormorant text-2xl font-medium text-foreground">Meeting Context</h2>
            <p className="font-inter text-sm text-muted-foreground">Select a meeting to generate your 3-minute prep guide</p>
          </div>
          <button onClick={loadEvents} className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <Calendar className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="font-cormorant text-xl text-foreground">No meetings in the next 14 days</p>
            <p className="font-inter text-xs text-muted-foreground">Events will appear here once added to your Google Calendar.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => {
              const urg = urgencyStyle[event.urgency] || urgencyStyle.upcoming;
              return (
                <button
                  key={event.event_id}
                  onClick={() => generateGuide(event)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all hover:shadow-md group ${urg.bg}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: urg.dot }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 justify-between">
                          <p className="font-inter text-sm font-medium text-foreground truncate">{event.title}</p>
                          <span className={`font-inter text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${urg.text}`}
                            style={{ backgroundColor: urg.dot + "20" }}>
                            {urg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span className="font-inter text-xs">{event.start_formatted}</span>
                          </div>
                          {event.attendees_count > 0 && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Users className="w-3 h-3" />
                              <span className="font-inter text-xs">{event.attendees_count} attendee{event.attendees_count !== 1 ? "s" : ""}</span>
                            </div>
                          )}
                        </div>
                        {event.description && (
                          <p className="font-inter text-xs text-muted-foreground mt-1 line-clamp-1">{event.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="font-inter text-xs font-medium" style={{ color: GOLD }}>Prep</span>
                      <Sparkles className="w-3.5 h-3.5" style={{ color: GOLD }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}