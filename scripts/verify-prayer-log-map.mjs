/**
 * Verify PrayerLog payload mapping strips unsupported columns.
 * Run: node --experimental-vm-modules scripts/verify-prayer-log-map.mjs
 * (Also invoked via: node scripts/verify-prayer-log-map.mjs after build-time copy)
 *
 * Inline replica of mapPayloadToRow PrayerLog branch for regression guard.
 */
function mapPrayerLogPayload(p, userId = 'test-user') {
  const row = {}
  if (userId) row.user_id = userId
  const name = p.prayer_name ?? p.prayer ?? p.name
  if (name != null && String(name).trim()) {
    row.prayer_name = String(name).trim()
  }
  if (p.status != null && String(p.status).trim()) {
    row.status = String(p.status).trim()
  }
  const candidateTimes = [p.performed_at, p.prayer_time, p.due_time]
  let timeRaw = null
  for (const candidate of candidateTimes) {
    if (typeof candidate === 'string' && /^\d{1,2}:\d{2}/.test(candidate.trim())) {
      timeRaw = candidate.trim()
      break
    }
  }
  const dayRaw = p.date ?? null
  let prayedAt = null
  if (p.prayed_at != null && String(p.prayed_at).trim() !== '') {
    const s = String(p.prayed_at).trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const hhmm = timeRaw
        ? String(timeRaw).replace(/\s*\(.*?\)/, '').trim().slice(0, 5)
        : '12:00'
      prayedAt = new Date(`${s}T${hhmm}:00`)
    } else {
      prayedAt = new Date(s)
    }
  } else if (dayRaw != null && String(dayRaw).trim() !== '') {
    const day = String(dayRaw).trim().split('T')[0]
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      const time = timeRaw
        ? String(timeRaw).replace(/\s*\(.*?\)/, '').trim()
        : '12:00'
      const hhmm = /^\d{1,2}:\d{2}/.test(time) ? time.slice(0, 5) : '12:00'
      prayedAt = new Date(`${day}T${hhmm}:00`)
    }
  }
  if (prayedAt && !Number.isNaN(prayedAt.getTime())) {
    row.prayed_at = prayedAt.toISOString()
  }
  return row
}

const ALLOWED = new Set(['user_id', 'prayer_name', 'prayed_at', 'status'])

const cases = [
  {
    name: 'fard-log-like-PrayerTracker',
    payload: {
      date: '2026-09-06',
      prayer_name: 'Fajr',
      prayer_type: 'fard',
      prayer_time: '--:--',
      status: 'performed',
      performed_at: '05:42',
      location: 'home',
      in_congregation: false,
      prayed_on_time: true,
      is_makeup_prayer: false,
      makeup_for_date: null,
      missed_reason: null,
      notes: 'test',
    },
  },
  {
    name: 'sunnah-log',
    payload: {
      date: '2026-09-06',
      prayer_name: 'tahajjud',
      prayer_type: 'nafl',
      prayer_time: '03:15',
      status: 'performed',
      performed_at: '03:15',
      notes: null,
    },
  },
  {
    name: 'status-only-update',
    payload: { status: 'missed', prayed_on_time: false },
  },
]

let failed = 0
for (const c of cases) {
  const row = mapPrayerLogPayload(c.payload)
  const keys = Object.keys(row)
  const bad = keys.filter((k) => !ALLOWED.has(k))
  const ok =
    bad.length === 0 &&
    (c.name === 'status-only-update'
      ? row.status === 'missed' && row.prayer_name == null
      : row.prayer_name && row.status && row.prayed_at)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}`)
  console.log(`       ${JSON.stringify(row)}`)
  if (!ok) failed++
}

console.log(`\n${cases.length - failed}/${cases.length} passed`)
process.exit(failed ? 1 : 0)
