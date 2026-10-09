Oe thig about depllloyment with cron job on vercel, vercel only run one per day because I am on hobby pla. So, how do I do that aspect. And I have a vps hosted for a client, I don't know if I can take a smslal part of it and add tthis job or what do I do
+ Thought: 12.7s
Good question — you've hit a real Vercel Hobby limitation. Let me confirm the current limits before I lay out options.
◈Parallel Web Search "Vercel Hobby plan cron jobs limit once per day frequency 2026" 
+ Thought: 9.7s
Confirmed the key fact: Hobby is hard-limited to once-per-day crons, and */30 * * * * will actually fail your deployment with "Hobby accounts are limited to daily cron jobs." So the current vercel.json won't deploy as-is — that part has to change no matter what.
The clean fix is to decouple who triggers the job from where the app runs. Your route GET /api/intake/run just needs an authenticated HTTP ping; anything with outbound HTTPS can do it.
The constraint
- Vercel Hobby cron: 1×/day only, and even then within a ±59-min window.
- Your route already supports an external caller: Authorization: Bearer $CRON_SECRET → runs with the admin client (see src/app/api/intake/run/route.ts:27).
- Per run it's capped at 40 companies (maxCompanies: 40) and skips companies polled in the last 25 min (minAgeMinutes: 25), so it's safe against double-fires.
Trigger options
Option	Cadence	Cost
cron-job.org / EasyCron	1 min+	Free
Upstash QStash	1 min+	Free tier
Client VPS (cron/systemd)	any	"free"
GitHub Actions schedule	~5 min min	Free
Vercel Pro	per-min	$20/mo
My recommendation
Keep a daily Vercel cron as a safety net + an external cron for the 30-min cadence. For the external one, cron-job.org is the least-effort and needs nothing from your client. Use the VPS only if your client has explicitly authorized it — it's their machine and the secret would live on it, which is a confidentiality/contract question more than a technical one.
What changes (once you pick)
1. vercel.json → daily fallback, e.g. "schedule": "0 6 * * *" (or delete the crons block if you go fully external).
2. External scheduler: GET https://<your-app>/api/intake/run with header Authorization: Bearer <CRON_SECRET>. CRON_SECRET is already in .env.example; set the real value in Vercel and in the scheduler.
3. Tune to your activation count: interval vs minAgeMinutes (set it to slightly less than the interval — 25 fits 30 min; use ~10 for 15 min) and consider raising the hardcoded maxCompanies: 40 / making it env-driven. At 40/run × 48 runs/day, 200 active companies ≈ each polled every 2.5 h.
4. If using the VPS: crontab line */30 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/intake/run, secret in a root-only file, and use a dedicated secret you can rotate.
A couple of things I need from you before writing the exact steps:
# Questions
Which external trigger do you want to use for the sub-daily ATS polling?
cron-job.org (Recommended)
If we were to use the client's VPS, do you have their explicit permission to run an extra scheduled task on it?
No / unsure
Roughly how many companies do you expect to activate in the catalog? (Drives interval/cap tuning.)
50–200
+ Thought: 13.3s
Locked in: cron-job.org, no VPS, ~50–200 companies.
Recommended setup
- Cadence: every 15 minutes from cron-job.org (min age 10) → 96 runs/day × 40 companies = 3,840 board-polls/day. At 200 active companies that's ~19 polls/company/day (~every 75 min); at 50 it's throttled by the min-age. Comfortably handles your range.
- Keep a daily Vercel cron as a safety net (e.g. 03:00 UTC) — now a legal Hobby expression, and Vercel auto-injects Authorization: Bearer $CRON_SECRET for it.
- Don't raise the per-run cap much: maxDuration = 60 (Hobby max) and new-job DeepSeek scoring is the bottleneck; more frequent runs beat a bigger cap.
Implementation plan (when you approve)
1. vercel.json — replace */30 * * * * with a daily fallback, e.g. "schedule": "0 3 * * *". (This alone fixes the current deploy failure on Hobby.)
2. src/app/api/intake/run/route.ts — make the two hardcoded knobs env-configurable so you can retune without a redeploy:
- INTAKE_MAX_COMPANIES (default 40)
- INTAKE_MIN_AGE_MINUTES (default 25; you'd set 10)
Apply to the cron branch; leave the manual "Run intake now" button at minAge 0.
3. .env.example + Vercel env — document/add INTAKE_MAX_COMPANIES, INTAKE_MIN_AGE_MINUTES, and confirm CRON_SECRET is set in Production.
4. cron-job.org job (manual, in their dashboard — not code):
- URL: https://<your-app-domain>/api/intake/run
- Method: GET; Schedule: every 15 min
- Advanced → Header: Authorization: Bearer <CRON_SECRET>
- Enable failure email notifications
- "Execute now" to test; expect JSON like { ok: true, mode: "cron", companiesPolled: …, jobsNew: … }
5. Verify:
- Deploy succeeds (Hobby daily-cron constraint cleared).
- PowerShell test: Invoke-RestMethod -Uri "https://<app>/api/intake/run" -Headers @{Authorization="Bearer $env:CRON_SECRET"}.
- After the next fire, confirm last_polled_at advances in Settings → Watched Companies and check Vercel function logs.
Security notes
- The bearer secret grants admin-level intake across all users — treat it as sensitive. Use a dedicated 32+ char value, keep it only in Vercel + cron-job.org, and rotate by updating both if needed.
- Double-fires are safe: minAgeMinutes dedups, and Vercel's occasional duplicate cron delivery is harmless.
No code was changed (plan mode). Want me to proceed with steps 1–3 and the .env.example update once you switch me to execute?