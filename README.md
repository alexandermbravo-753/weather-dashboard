# weather-dashboard

A polished weather dashboard that fetches live weather data from the public Open-Meteo API.

## Features
- Search by city name
- Current weather details with humidity, wind, feels-like, sunrise, and sunset
- 6-hour outlook and a 7-day forecast
- Toggle between light and dark mode
- Toggle between °C and °F
- Use browser geolocation to fetch nearby weather
- Responsive for desktop and mobile devices
- No API key required

## Tech stack
- HTML
- CSS
- JavaScript
- Open-Meteo API

## Run locally
1. Download or clone the repository
2. Open `index.html` in your browser, or run a local server:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## Files
- `index.html` — dashboard structure and controls
- `styles.css` — responsive weather dashboard styling
- `app.js` — data fetching, rendering, themes, geolocation, and unit conversion

## API used
- Open-Meteo geocoding and forecast API
