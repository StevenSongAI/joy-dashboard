# Joy Dashboard

Steven's personal life dashboard — a curated command center for travel planning, local discoveries, events, and life experiences.

## Live URL
https://joy-dashboard.up.railway.app (or your deployed URL)

## Features

- **🌟 What's On** — Dynamic homepage with tonight's picks, upcoming events, and latest discoveries
- **✈️ Travel** — Trip planner with interactive map, itineraries, and bucket list
- **📍 Local** — Burlington/GTA restaurants, bars, and hidden gems with interactive map
- **🎉 Events** — Calendar view of upcoming events and seasonal highlights
- **🗺️ Bucket List** — Life experiences and goals to track
- **📺 Media** — Curated shows, movies, and podcasts
- **🔥 Discovery Feed** — Agent-curated finds that don't fit elsewhere

## Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** Static HTML/CSS/JS (vanilla, no framework)
- **Maps:** Leaflet.js via CDN
- **Charts:** Chart.js via CDN
- **Styling:** TailwindCSS via CDN
- **Database:** JSON files in `/data` directory

## API Endpoints

### GET
- `/api/travel` — Travel destinations and itineraries
- `/api/local` — Local Burlington/GTA spots
- `/api/events` — Upcoming events and seasonal highlights
- `/api/experiences` — Bucket list experiences
- `/api/media` — Media recommendations
- `/api/discoveries` — Discovery feed
- `/api/state` — Agent state and preferences

### POST
- `/api/travel` — Add/update travel destination
- `/api/local` — Add local spot
- `/api/events` — Add event
- `/api/experiences` — Add experience
- `/api/media` — Add media recommendation
- `/api/discoveries` — Add discovery
- `/api/state` — Update agent state

### PATCH
- `/api/travel/:id` — Update trip status
- `/api/local/:id` — Update reaction
- `/api/experiences/:id` — Update status
- `/api/events/:id` — Update interest
- `/api/media/:id` — Update watch status
- `/api/discoveries/:id` — Update reaction

## Data Updates

The agent updates this dashboard via:
1. **Git push** — Bulk updates, new destinations, area guides
2. **API POST** — Quick additions

## Development

```bash
npm install
npm run dev
```

## Deployment

Auto-deploys on Railway when pushing to main.

```bash
git add .
git commit -m "[joy] Update description"
git push origin main
```
