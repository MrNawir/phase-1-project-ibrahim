# ChamaChama — Investment Tracker (Phase 1 Project)

App to monitor your investments, track your investment progress, and make informed decisions.

## Features
- **Add investments** via a simple form (name, category, amounts, date, notes)
- **Dashboard summary** showing total invested, current value, net gain/loss, and ROI
- **Filter** by search, category, and date range
- **CRUD** operations powered by JSON Server
- **Charts** to visualize allocation (pie) and performance by category (bar)
- **Responsive UI** with clean, modern styling

## Tech Stack
- HTML, CSS, JavaScript (no framework)
- [Chart.js](https://www.chartjs.org/) via CDN
- [JSON Server](https://github.com/typicode/json-server) for a simple REST API

## Getting Started

### Prerequisites
- Node.js 18+ recommended

### Install dependencies
From the project root (`/ChamaChama`):

```bash
npm install
```

This installs `json-server` from `devDependencies`.

### Start the API (JSON Server)
```bash
npm run server
```
This will start JSON Server at `http://localhost:3000` and serve the `investments` collection from `db.json`.

If port 3000 is already in use, you can start on port 3001 instead:

```bash
npm run server:3001
```

### Serve the frontend (VS Code Live Server)
Use the VS Code "Live Server" extension for a quick local server:

1. Install the "Live Server" extension (by Ritwick Dey) in VS Code.
2. Open `index.html`, then right‑click and choose "Open with Live Server" (or click the "Go Live" status bar button).
3. A browser tab will open at a local URL such as `http://127.0.0.1:5500` and serve this project.
4. Ensure JSON Server is running on port 3000 or 3001 so the app can fetch data.

> Note: JSON Server has CORS enabled by default, so the frontend can fetch from `http://localhost:3000`.

### Automatic API Port Fallback
The frontend (`app.js`) will attempt to reach the API at `http://localhost:3000` first and automatically fall back to `http://localhost:3001` if needed. The selected base URL is cached in `localStorage` under the key `apiBase`.

## API
- Base: `http://localhost:3000`
- Resource: `/investments`

Example JSON (see `db.json`):
```json
{
  "id": 1,
  "name": "Apple Inc. (AAPL)",
  "category": "Stocks",
  "amountInvested": 1500.00,
  "currentValue": 1980.25,
  "date": "2024-02-15",
  "notes": "Long-term growth"
}
```

## Scripts
- `npm run server` — Start JSON Server on port 3000 and watch `db.json`
- `npm run server:3001` — Start JSON Server on port 3001 and watch `db.json`

## Project Structure
```
ChamaChama/
├── app.js
├── db.json
├── index.html
├── package.json
├── README.md
├── styles.css
└── .gitignore
```

## Notes
- Charts use aggregated current values and net gain by category to provide insights at a glance.
- ROI is computed per row and portfolio-wide; divide-by-zero is handled safely.

## Troubleshooting

- If you see a port-in-use error like `EADDRINUSE :3000` when starting JSON Server, use `npm run server:3001`.
- If the table shows an API error, ensure the API is running on port 3000 or 3001. The app tries both automatically but will display a friendly message if neither is available.
- If you open `index.html` directly from the filesystem and the app cannot fetch data, use the VS Code Live Server extension to serve the folder and avoid browser restrictions.
