/** Client-side Overpass API fetch — User-Agent required (406 without it). */
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const OVERPASS_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'User-Agent': 'NiskBuild-VP/1.0',
};

export async function fetchOverpass(query) {
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: OVERPASS_HEADERS,
    body: query,
  });
  if (!res.ok) {
    throw new Error(`Overpass request failed (${res.status})`);
  }
  return res.json();
}
