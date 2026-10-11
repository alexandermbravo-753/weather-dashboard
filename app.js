const weatherCodeMap = {
  0: { label: 'Clear sky', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Foggy', icon: '🌫️' },
  48: { label: 'Foggy', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌦️' },
  53: { label: 'Drizzle', icon: '🌦️' },
  55: { label: 'Heavy drizzle', icon: '🌧️' },
  56: { label: 'Freezing drizzle', icon: '🌧️' },
  57: { label: 'Heavy freezing drizzle', icon: '🌧️' },
  61: { label: 'Light rain', icon: '🌦️' },
  63: { label: 'Rain', icon: '🌧️' },
  65: { label: 'Heavy rain', icon: '🌧️' },
  66: { label: 'Freezing rain', icon: '🌧️' },
  67: { label: 'Heavy freezing rain', icon: '🌧️' },
  71: { label: 'Light snow', icon: '🌨️' },
  73: { label: 'Snow', icon: '❄️' },
  75: { label: 'Heavy snow', icon: '❄️' },
  77: { label: 'Snow grains', icon: '❄️' },
  80: { label: 'Rain showers', icon: '🌦️' },
  81: { label: 'Heavy rain showers', icon: '🌧️' },
  82: { label: 'Violent rain showers', icon: '⛈️' },
  85: { label: 'Snow showers', icon: '🌨️' },
  86: { label: 'Heavy snow showers', icon: '🌨️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Thunderstorm with hail', icon: '⛈️' },
  99: { label: 'Severe thunderstorm', icon: '⛈️' },
};

const defaultCity = 'New York';

const currentLocationName = document.getElementById('location-name');
const currentIcon = document.getElementById('current-icon');
const currentTemp = document.getElementById('current-temp');
const weatherCondition = document.getElementById('weather-condition');
const updatedTime = document.getElementById('updated-time');
const feelsLike = document.getElementById('feels-like');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('wind-speed');
const sunrise = document.getElementById('sunrise');
const sunset = document.getElementById('sunset');
const dayHigh = document.getElementById('day-high');
const dayLow = document.getElementById('day-low');
const forecastGrid = document.getElementById('forecast-grid');
const forecastItemTemplate = document.getElementById('forecast-item-template');
const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');

function formatTemperature(value) {
  return `${Math.round(value)}°`;
}

function formatTime(value, type = 'time') {
  if (!value) return '--:--';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: type === 'timezone' ? undefined : undefined,
  }).format(date);
}

function formatDay(value) {
  if (!value) return 'Today';

  const date = new Date(value);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
  }).format(date);
}

function getWeatherMeta(code) {
  return weatherCodeMap[code] || { label: 'Weather', icon: '🌤️' };
}

function renderCurrentWeather(data, placeName) {
  const current = data.current;
  const daily = data.daily;
  const weatherMeta = getWeatherMeta(current.weather_code);

  currentLocationName.textContent = placeName;
  currentIcon.textContent = weatherMeta.icon;
  currentTemp.textContent = formatTemperature(current.temperature_2m);
  weatherCondition.textContent = weatherMeta.label;
  updatedTime.textContent = `Updated ${formatTime(new Date(current.time))}`;
  feelsLike.textContent = formatTemperature(current.apparent_temperature);
  humidity.textContent = `${current.relative_humidity_2m}%`;
  windSpeed.textContent = `${Math.round(current.wind_speed_10m)} km/h`;

  if (daily.sunrise && daily.sunset && daily.temperature_2m_max && daily.temperature_2m_min) {
    sunrise.textContent = formatTime(daily.sunrise[0]);
    sunset.textContent = formatTime(daily.sunset[0]);
    dayHigh.textContent = formatTemperature(daily.temperature_2m_max[0]);
    dayLow.textContent = formatTemperature(daily.temperature_2m_min[0]);
  }
}

function renderForecast(data) {
  const daily = data.daily;
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < daily.time.length; i += 1) {
    const card = forecastItemTemplate.content.cloneNode(true);
    const day = card.querySelector('.forecast-day');
    const icon = card.querySelector('.forecast-icon');
    const high = card.querySelector('.high');
    const low = card.querySelector('.low');

    const weatherMeta = getWeatherMeta(daily.weather_code[i]);
    day.textContent = i === 0 ? 'Today' : formatDay(daily.time[i]);
    icon.textContent = weatherMeta.icon;
    high.textContent = formatTemperature(daily.temperature_2m_max[i]);
    low.textContent = formatTemperature(daily.temperature_2m_min[i]);

    fragment.appendChild(card);
  }

  forecastGrid.innerHTML = '';
  forecastGrid.appendChild(fragment);
}

async function geocodeCity(city) {
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
  );

  if (!response.ok) {
    throw new Error('Unable to find that city.');
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error('No matching city found.');
  }

  const result = data.results[0];
  return {
    name: `${result.name}, ${result.country || result.admin1 || ''}`.replace(/,\s*$/, ''),
    latitude: result.latitude,
    longitude: result.longitude,
  };
}

async function fetchWeatherForCity(city) {
  const location = await geocodeCity(city);

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&forecast_days=7`;

  const response = await fetch(weatherUrl);

  if (!response.ok) {
    throw new Error('The weather service is temporarily unavailable.');
  }

  const weather = await response.json();
  return { weather, locationName: location.name };
}

async function loadWeather(city) {
  try {
    const { weather, locationName } = await fetchWeatherForCity(city);
    renderCurrentWeather(weather, locationName);
    renderForecast(weather);
  } catch (error) {
    currentLocationName.textContent = 'Weather unavailable';
    currentIcon.textContent = '⚠️';
    currentTemp.textContent = '--°';
    weatherCondition.textContent = error.message;
    updatedTime.textContent = 'Please try another city';
    feelsLike.textContent = '--°';
    humidity.textContent = '--%';
    windSpeed.textContent = '-- km/h';
    sunrise.textContent = '--:--';
    sunset.textContent = '--:--';
    dayHigh.textContent = '--°';
    dayLow.textContent = '--°';
    forecastGrid.innerHTML = '';
  }
}

searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const city = cityInput.value.trim();

  if (!city) {
    cityInput.focus();
    return;
  }

  await loadWeather(city);
});

cityInput.value = defaultCity;
loadWeather(defaultCity);
