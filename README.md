# weather-dashboard

A simple and modern weather dashboard that fetches live weather data from the public Open-Meteo API.

## Features
- Search for cities worldwide
- Current temperature, feels-like, humidity, and wind speed
- Sunrise and sunset details
- 7-day forecast
- Responsive layout for desktop and mobile
- No API key required

## Tech stack
- HTML
- CSS
- JavaScript
- Open-Meteo API

## Run locally
1. Clone the repository
2. Open `index.html` in a browser, or serve it locally using a simple HTTP server:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## Files
- `index.html` — dashboard structure
- `styles.css` — visual styling
- `app.js` — API requests and UI rendering

## API used
- Open-Meteo geocoding and forecast API
