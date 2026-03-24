# Supabase Keep-Alive Setup

## Problem
Supabase free tier projects enter "Deep Sleep" after 1 week of inactivity, 
requiring manual restart from the dashboard. This causes downtime for users.

## Solution
Set up a free external cron job that pings Supabase every few days.

## Setup Instructions

### Option A: cron-job.org (Recommended — Free)

1. Go to **https://cron-job.org** → Create a free account
2. Click **"Create New Cron Job"**
3. Fill in:
   - **Title:** MessFlow Keep-Alive
   - **URL:** `https://wgmbwjzvgxvqvpkgmydy.supabase.co/rest/v1/profiles?select=id&limit=1`
   - **Schedule:** Every 3 days (or use custom: `0 6 */3 * *` = 6 AM every 3rd day)
   - **Request Method:** GET
   - **Headers (add these):**
     - `apikey` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnbWJ3anp2Z3h2cXZwa2dteWR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NTc5MTUsImV4cCI6MjA4NTMzMzkxNX0.o2uNVbqnWLVItV8_HPhSkJKJx3DPV1thQ8Dmdz9lys8`
     - `Authorization` = `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnbWJ3anp2Z3h2cXZwa2dteWR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NTc5MTUsImV4cCI6MjA4NTMzMzkxNX0.o2uNVbqnWLVItV8_HPhSkJKJx3DPV1thQ8Dmdz9lys8`
4. Click **Save** → Enable the job

### Option B: UptimeRobot (Alternative — Free)

1. Go to **https://uptimerobot.com** → Create free account
2. Add new monitor:
   - **Monitor Type:** HTTP(s)
   - **URL:** `https://wgmbwjzvgxvqvpkgmydy.supabase.co/rest/v1/profiles?select=id&limit=1`
   - **Monitoring Interval:** 5 minutes (free tier)
   - **HTTP Headers:**
     - `apikey`: (same anon key as above)
     - `Authorization`: `Bearer (same anon key)`
3. This also gives you uptime monitoring and alerts if Supabase goes down

### What the ping does
- Sends a lightweight `SELECT id FROM profiles LIMIT 1` query via REST API
- Uses the public anon key (no secrets exposed)
- Takes ~50ms, uses minimal resources
- Keeps the Supabase project active and prevents deep sleep

### Verification
After setup, check cron-job.org's execution log to confirm 200 OK responses.
You can also test manually in your browser:

```
curl -H "apikey: YOUR_ANON_KEY" -H "Authorization: Bearer YOUR_ANON_KEY" \
  "https://wgmbwjzvgxvqvpkgmydy.supabase.co/rest/v1/profiles?select=id&limit=1"
```

Should return: `[{"id":"some-uuid"}]`
