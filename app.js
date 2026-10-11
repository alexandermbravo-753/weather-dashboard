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
const state = {
  unit: 'celsius',
  theme: 'dark',
  lastLocationLabel: defaultCity,
  lastWeather: null,
};

const elements = {
  currentLocationName: document.getElementById('location-name'),
  currentIcon: document.getElementById('current-icon'),
  currentTemp: document.getElementById('current-temp'),
  weatherCondition: document.getElementById('weather-condition'),
  updatedTime: document.getElementById('updated-time'),
  feelsLike: document.getElementById('feels-like'),
  humidity: document.getElementById('humidity'),
  windSpeed: document.getElementById('wind-speed'),
  sunrise: document.getElementById('sunrise'),
  sunset: document.getElementById('sunset'),
  dayHigh: document.getElementById('day-high'),
  dayLow: document.getElementById('day-low'),
  forecastGrid: document.getElementById('forecast-grid'),
  hourlyForecast: document.getElementById('hourly-forecast'),
  forecastItemTemplate: document.getElementById('forecast-item-template'),
  hourlyItemTemplate: document.getElementById('hourly-item-template'),
  searchForm: document.getElementById('search-form'),
  cityInput: document.getElementById('city-input'),
  themeToggle: document.getElementById('theme-toggle'),
  unitToggle: document.getElementById('unit-toggle'),
  locationBtn: document.getElementById('location-btn'),
};

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  const isLight = theme === 'light';
  elements.themeToggle.textContent = isLight ? '🌙 Night' : '☀️ Day';
}

function toFahrenheit(value) {
  return (value * 9) / 5 + 32;
}

function formatTemperature(value) {
  const temp = state.unit === 'celsius' ? value : toFahrenheit(value);
  return `${Math.round(temp)}°${state.unit === 'celsius' ? 'C' : 'F'}`;
}

function formatWind(value) {
  const wind = state.unit === 'celsius' ? value : value * 0.621371;
  return `${Math.round(wind)} ${state.unit === 'celsius' ? 'km/h' : 'mph'}`;
}

function formatTime(value) {
  if (!value) return '--:--';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
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

  elements.currentLocationName.textContent = placeName;
  elements.currentIcon.textContent = weatherMeta.icon;
  elements.currentTemp.textContent = formatTemperature(current.temperature_2m);
  elements.weatherCondition.textContent = weatherMeta.label;
  elements.updatedTime.textContent = `Updated ${formatTime(new Date(current.time))}`;
  elements.feelsLike.textContent = formatTemperature(current.apparent_temperature);
  elements.humidity.textContent = `${current.relative_humidity_2m}%`;
  elements.windSpeed.textContent = formatWind(current.wind_speed_10m);

  if (daily.sunrise && daily.sunset && daily.temperature_2m_max && daily.temperature_2m_min) {
    elements.sunrise.textContent = formatTime(daily.sunrise[0]);
    elements.sunset.textContent = formatTime(daily.sunset[0]);
    elements.dayHigh.textContent = formatTemperature(daily.temperature_2m_max[0]);
    elements.dayLow.textContent = formatTemperature(daily.temperature_2m_min[0]);
  }
}

function renderHourlyForecast(data) {
  const hourly = data.hourly;
  const fragment = document.createDocumentFragment();

  const count = Math.min(6, hourly.time.length);
  for (let i = 0; i < count; i += 1) {
    const card = elements.hourlyItemTemplate.content.cloneNode(true);
    const time = card.querySelector('.hour-time');
    const icon = card.querySelector('.hour-icon');
    const temp = card.querySelector('.hour-temp');

    const weatherMeta = getWeatherMeta(hourly.weather_code[i]);
    const hourLabel = new Date(hourly.time[i]);
    time.textContent = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
    }).format(hourLabel);
    icon.textContent = weatherMeta.icon;
    temp.textContent = formatTemperature(hourly.temperature_2m[i]);

    fragment.appendChild(card);
  }

  elements.hourlyForecast.innerHTML = '';
  elements.hourlyForecast.appendChild(fragment);
}

function renderForecast(data) {
  const daily = data.daily;
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < daily.time.length; i += 1) {
    const card = elements.forecastItemTemplate.content.cloneNode(true);
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

  elements.forecastGrid.innerHTML = '';
  elements.forecastGrid.appendChild(fragment);
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
    name: `${result.name}${result.country ? `, ${result.country}` : ''}`,
    latitude: result.latitude,
    longitude: result.longitude,
  };
}

async function fetchWeatherData(latitude, longitude) {
  const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');

  weatherUrl.search = new URLSearchParams({
    latitude: latitude,
    longitude: longitude,
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code',
    hourly: 'temperature_2m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset',
    timezone: 'auto',
    forecast_days: '7',
  }).toString();

  const response = await fetch(weatherUrl);

  if (!response.ok) {
    throw new Error('The weather service is temporarily unavailable.');
  }

  return response.json();
}

function displayWeather(weather, placeName) {
  renderCurrentWeather(weather, placeName);
  renderHourlyForecast(weather);
  renderForecast(weather);
  state.lastWeather = weather;
}

async function loadWeatherFromCity(city) {
  try {
    const location = await geocodeCity(city);
    const weather = await fetchWeatherData(location.latitude, location.longitude);
    state.lastLocationLabel = location.name;
    displayWeather(weather, location.name);
  } catch (error) {
    showWeatherError(error.message);
  }
}

async function loadWeatherFromCoordinates(latitude, longitude) {
  try {
    const weather = await fetchWeatherData(latitude, longitude);
    state.lastLocationLabel = 'My Location';
    displayWeather(weather, 'My Location');
  } catch (error) {
    showWeatherError(error.message);
  }
}

function showWeatherError(message) {
  elements.currentLocationName.textContent = 'Weather unavailable';
  elements.currentIcon.textContent = '⚠️';
  elements.currentTemp.textContent = '--°';
  elements.weatherCondition.textContent = message;
  elements.updatedTime.textContent = 'Please try again';
  elements.feelsLike.textContent = '--°';
  elements.humidity.textContent = '--%';
  elements.windSpeed.textContent = '-- km/h';
  elements.sunrise.textContent = '--:--';
  elements.sunset.textContent = '--:--';
  elements.dayHigh.textContent = '--°';
  elements.dayLow.textContent = '--°';
  elements.forecastGrid.innerHTML = '';
  elements.hourlyForecast.innerHTML = '';
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(state.theme);
}

function toggleUnits() {
  state.unit = state.unit === 'celsius' ? 'fahrenheit' : 'celsius';
  elements.unitToggle.textContent = state.unit === 'celsius' ? '°F' : '°C';

  if (state.lastWeather) {
    const locationName = state.lastLocationLabel || 'New York';
    renderCurrentWeather(state.lastWeather, locationName);
    renderHourlyForecast(state.lastWeather);
    renderForecast(state.lastWeather);
  }
}

function setLoadingState(isLoading) {
  elements.locationBtn.disabled = isLoading;
  elements.locationBtn.textContent = isLoading ? '📍 Loading...' : '📍 My location';
}

elements.searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const city = elements.cityInput.value.trim();

  if (!city) {
    elements.cityInput.focus();
    return;
  }

  await loadWeatherFromCity(city);
});

elements.themeToggle.addEventListener('click', toggleTheme);
elements.unitToggle.addEventListener('click', toggleUnits);

elements.locationBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showWeatherError('Geolocation is not supported in this browser.');
    return;
  }

  setLoadingState(true);

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      await loadWeatherFromCoordinates(latitude, longitude);
      setLoadingState(false);
    },
    () => {
      showWeatherError('Location access was denied. Try searching for a city instead.');
      setLoadingState(false);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

applyTheme(state.theme);
elements.unitToggle.textContent = '°F';
elements.cityInput.value = defaultCity;
loadWeatherFromCity(defaultCity);
