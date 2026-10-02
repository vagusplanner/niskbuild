import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { apiBase, getNsApiFetchHeaders, nsApiJson } from "@/lib/ns-api";
import { supabase } from "@/lib/supabase";
import Navbar from "../components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Video, RefreshCw, X, CheckCircle, AlertCircle, Loader2, Link2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

const statusColors = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

async function resolveIsNsStaff() {
  try {
    const { data, error } = await supabase.schema("firstparty").rpc("ns_is_staff");
    if (!error && data != null) return Boolean(data);
  } catch {
    /* fall through */
  }
  try {
    const status = await nsApiJson("/api/north-south/google-calendar/status", undefined, {
      method: "GET",
    });
    return Boolean(status?.isStaff);
  } catch {
    return false;
  }
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [rescheduleId, setRescheduleId] = useState(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [toast, setToast] = useState(null);
  const [isStaff, setIsStaff] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [data, staff] = await Promise.all([
        base44.entities.Booking.list("-created_date", 50),
        resolveIsNsStaff(),
      ]);
      setIsStaff(staff);
      setBookings(data.filter((b) => b.status !== "cancelled"));
      if (staff) {
        try {
          const status = await nsApiJson("/api/north-south/google-calendar/status", undefined, {
            method: "GET",
          });
          setCalendarStatus(status);
        } catch {
          setCalendarStatus(null);
        }
      }
    } catch (err) {
      showToast(err?.message || "Failed to load bookings", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const flag = searchParams.get("ns_google_calendar");
    if (!flag) return;
    if (flag === "connected") {
      showToast("Google Calendar connected for North South.");
      load();
    } else if (flag === "denied") {
      showToast("Google Calendar connection was denied.", "error");
    } else {
      showToast(`Google Calendar connect failed (${flag}).`, "error");
    }
    const next = new URLSearchParams(searchParams);
    next.delete("ns_google_calendar");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleConfirm = async (booking) => {
    if (!isStaff) {
      showToast("Only the coach can confirm sessions.", "error");
      return;
    }
    setActionLoading(booking.id);
    const res = await base44.functions.invoke("manageCalendarEvent", {
      action: "create",
      bookingId: booking.id,
    });
    if (res.data?.success) {
      showToast(
        res.data.meet_link
          ? "Session confirmed! Meet invite sent."
          : "Session confirmed! Calendar invite sent."
      );
      load();
    } else {
      showToast(res.data?.error || "Failed to confirm session.", "error");
    }
    setActionLoading(null);
  };

  const handleConnectCalendar = async () => {
    setActionLoading("connect");
    try {
      const returnTo = window.location.href.split("?")[0];
      // Must use VITE_API_BASE_URL — NS SPA hosts (north-south-blond / nsconsultd)
      // do not serve /api/north-south/*; those routes live on the NiskBuild API.
      const response = await fetch(
        `${apiBase()}/api/north-south/google-calendar/connect?return_to=${encodeURIComponent(returnTo)}`,
        {
          headers: {
            Accept: "application/json",
            ...(await getNsApiFetchHeaders()),
          },
          credentials: "include",
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.authorizeUrl) {
        showToast(data.error || "Could not start Calendar connect.", "error");
        return;
      }
      window.location.href = data.authorizeUrl;
    } catch (err) {
      showToast(err?.message || "Could not start Calendar connect.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReschedule = async (booking) => {
    if (!newDate || !newTime) return;
    setActionLoading(booking.id);
    const res = await base44.functions.invoke("manageCalendarEvent", {
      action: "reschedule",
      bookingId: booking.id,
      newDate,
      newTime,
    });
    if (res.data?.success) {
      showToast("Session rescheduled! Calendar invite updated.");
      setRescheduleId(null);
      load();
    } else {
      showToast(res.data?.error || "Failed to reschedule.", "error");
    }
    setActionLoading(null);
  };

  const handleCancel = async (booking) => {
    if (!confirm(`Cancel session: ${booking.session_type}?`)) return;
    setActionLoading(booking.id);
    const res = await base44.functions.invoke("manageCalendarEvent", {
      action: "cancel",
      bookingId: booking.id,
    });
    if (res.data?.success) {
      showToast("Session cancelled.");
      load();
    } else {
      showToast(res.data?.error || "Failed to cancel.", "error");
    }
    setActionLoading(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-28">
        <div className="mb-10 space-y-2">
          <h1 className="font-cormorant text-4xl md:text-5xl font-light text-foreground">My Sessions</h1>
          <p className="font-inter text-sm text-muted-foreground">Manage your upcoming coaching sessions.</p>
        </div>

        {isStaff && (
          <div className="mb-8 rounded-2xl border border-border bg-card p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="font-inter text-sm font-medium text-foreground">Coach Google Calendar</p>
              <p className="font-inter text-xs text-muted-foreground">
                {calendarStatus?.connected
                  ? `Connected${calendarStatus.googleAccountEmail ? ` as ${calendarStatus.googleAccountEmail}` : ""}. Confirm creates a Meet invite.`
                  : calendarStatus?.configured === false
                    ? "OAuth env not configured on the API host yet."
                    : "Connect once so Confirm can create Meet links and email invites."}
              </p>
            </div>
            {!calendarStatus?.connected && (
              <Button
                size="sm"
                className="rounded-full gap-1.5"
                onClick={handleConnectCalendar}
                disabled={actionLoading === "connect"}
              >
                {actionLoading === "connect" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Link2 className="w-3.5 h-3.5" />
                )}
                Connect Calendar
              </Button>
            )}
          </div>
        )}

        {toast && (
          <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-lg font-inter text-sm ${toast.type === "error" ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
            {toast.type === "error" ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            {toast.msg}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="font-cormorant text-2xl text-foreground">No upcoming sessions</p>
            <p className="font-inter text-sm text-muted-foreground">Book a session to get started.</p>
            <Link to="/book"><Button className="rounded-full px-8 mt-2">Book a Session</Button></Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <div key={b.id} className="bg-card rounded-2xl border border-border p-6 space-y-4">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-cormorant text-xl font-medium text-foreground">{b.session_type}</h3>
                      <span className={`text-xs font-inter px-2.5 py-1 rounded-full ${statusColors[b.status] || "bg-secondary text-muted-foreground"}`}>
                        {b.status}
                      </span>
                    </div>
                    {isStaff && b.client_name && (
                      <p className="font-inter text-sm text-muted-foreground">
                        {b.client_name}
                        {b.client_email ? ` · ${b.client_email}` : ""}
                      </p>
                    )}
                    <div className="flex items-center gap-4 font-inter text-sm text-muted-foreground flex-wrap">
                      {b.preferred_date && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(b.preferred_date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        </span>
                      )}
                      {b.preferred_time && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {b.preferred_time} {b.timezone || "UTC"}
                        </span>
                      )}
                    </div>
                    {b.meet_link && (
                      <a href={b.meet_link} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 font-inter text-sm text-primary hover:underline">
                        <Video className="w-3.5 h-3.5" /> Join Google Meet
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {isStaff && b.status === "pending" && (
                      <Button size="sm" className="rounded-full gap-1.5" onClick={() => handleConfirm(b)} disabled={actionLoading === b.id}>
                        {actionLoading === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        Confirm & Send Invite
                      </Button>
                    )}
                    {b.status !== "cancelled" && b.status !== "completed" && (
                      <>
                        <Button size="sm" variant="outline" className="rounded-full gap-1.5"
                          onClick={() => { setRescheduleId(rescheduleId === b.id ? null : b.id); setNewDate(b.preferred_date || ""); setNewTime(b.preferred_time || ""); }}
                          disabled={actionLoading === b.id}>
                          <RefreshCw className="w-3.5 h-3.5" /> Reschedule
                        </Button>
                        <Button size="sm" variant="ghost" className="rounded-full gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleCancel(b)} disabled={actionLoading === b.id}>
                          <X className="w-3.5 h-3.5" /> Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {rescheduleId === b.id && (
                  <div className="bg-secondary/40 rounded-xl p-5 space-y-4 border border-border">
                    <p className="font-inter text-sm font-medium text-foreground">Select a new date & time</p>
                    <p className="font-inter text-xs text-muted-foreground">
                      Calendar reschedule is not wired yet — this will return an honest unavailable message.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="font-inter text-xs text-muted-foreground">New Date</label>
                        <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-inter text-xs text-muted-foreground">New Time</label>
                        <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="rounded-xl" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="rounded-full" onClick={() => handleReschedule(b)} disabled={!newDate || !newTime || actionLoading === b.id}>
                        {actionLoading === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        Confirm Reschedule
                      </Button>
                      <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setRescheduleId(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link to="/book">
            <Button variant="outline" className="rounded-full px-8">+ Book Another Session</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
