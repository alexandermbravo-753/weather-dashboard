const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../app.js'), 'utf8');
const html = readFileSync(join(__dirname, '../index.html'), 'utf8');

// A minimal DOM double lets the real app render and handle events without a browser.
class Element {
  constructor(fragment = false) {
    this.fragment = fragment;
    this.textContent = '';
    this.children = [];
    this.selectors = new Map();
    this.listeners = new Map();
    this.disabled = false;
    this.value = '';
    this.dataset = {};
    this.content = { cloneNode: () => new Element(true) };
  }

  set innerHTML(value) {
    assert.equal(value, '');
    this.children = [];
  }

  appendChild(child) {
    this.children.push(...(child.fragment && child.children.length ? child.children : [child]));
  }

  querySelector(selector) {
    if (!this.selectors.has(selector)) this.selectors.set(selector, new Element());
    return this.selectors.get(selector);
  }

  addEventListener(type, handler) {
    this.listeners.set(type, handler);
  }

  async dispatch(type) {
    await this.listeners.get(type)({ preventDefault() {} });
  }
}

function weather(temperature = 20) {
  const days = Array.from({ length: 7 }, (_, i) => `2026-10-${String(22 + i)}`);
  return {
    current: {
      time: '2026-10-22T12:00', temperature_2m: temperature,
      apparent_temperature: temperature - 1, relative_humidity_2m: 60,
      wind_speed_10m: 10, weather_code: 0,
    },
    hourly: {
      time: Array.from({ length: 24 }, (_, i) => `2026-10-22T${String(i).padStart(2, '0')}:00`),
      temperature_2m: Array(24).fill(temperature), weather_code: Array(24).fill(0),
    },
    daily: {
      time: days, weather_code: Array(7).fill(0),
      temperature_2m_max: Array(7).fill(temperature + 2),
      temperature_2m_min: Array(7).fill(temperature - 2),
      sunrise: days.map(day => `${day}T06:00`), sunset: days.map(day => `${day}T18:00`),
    },
  };
}

const response = (body, ok = true) => ({ ok, json: async () => body });
const city = name => response({ results: [{ name, country: 'United States', latitude: 40, longitude: -74 }] });

async function startApp() {
  const nodes = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, new Element()]));
  const replies = [city('New York'), response(weather())];
  const requests = [];
  const position = {};
  const navigator = {
    geolocation: {
      getCurrentPosition(success, error) {
        Object.assign(position, { success, error });
      },
    },
  };
  const context = vm.createContext({
    URL, URLSearchParams, navigator,
    document: { body: new Element(), getElementById: id => nodes[id], createDocumentFragment: () => new Element(true) },
    fetch: async url => {
      requests.push(new URL(url));
      const reply = replies.shift();
      assert.ok(reply, `Unexpected request: ${url}`);
      if (reply instanceof Error) throw reply;
      return reply;
    },
  });
  await vm.runInContext(source, context); // Includes the initial New York request.
  return {
    nodes, replies, requests, position, navigator,
    text: id => nodes[id].textContent,
    click: id => nodes[id].dispatch('click'),
    async search(name) {
      nodes['city-input'].value = name;
      await nodes['search-form'].dispatch('submit');
    },
  };
}

function assertWeather(app, name, temp, hourlyTemp, high, low, wind) {
  assert.equal(app.text('location-name'), name);
  assert.equal(app.text('current-temp'), temp);
  assert.equal(app.text('wind-speed'), wind);
  assert.equal(app.nodes['hourly-forecast'].children.length, 6);
  assert.equal(app.nodes['forecast-grid'].children.length, 7);
  assert.equal(app.nodes['hourly-forecast'].children[0].querySelector('.hour-temp').textContent, hourlyTemp);
  const firstDay = app.nodes['forecast-grid'].children[0];
  assert.equal(firstDay.querySelector('.high').textContent, high);
  assert.equal(firstDay.querySelector('.low').textContent, low);
}

function assertUnavailable(app, message) {
  const expected = {
    'location-name': 'Weather unavailable', 'current-icon': '⚠️', 'current-temp': '--°',
    'weather-condition': message, 'updated-time': 'Please try again', 'feels-like': '--°',
    humidity: '--%', 'wind-speed': '-- km/h', sunrise: '--:--', sunset: '--:--',
    'day-high': '--°', 'day-low': '--°',
  };
  for (const [id, value] of Object.entries(expected)) assert.equal(app.text(id), value, id);
  assert.equal(app.nodes['hourly-forecast'].children.length, 0);
  assert.equal(app.nodes['forecast-grid'].children.length, 0);
}

async function assertToggleAndRetry(app, message) {
  assertUnavailable(app, message);
  const requestCount = app.requests.length;
  for (const buttonLabel of ['°C', '°F', '°C']) {
    await app.click('unit-toggle');
    assert.equal(app.text('unit-toggle'), buttonLabel);
    assertUnavailable(app, message);
  }
  assert.equal(app.requests.length, requestCount, 'Unit toggles should not make requests');
  app.replies.push(city('Chicago'), response(weather(10)));
  await app.search('Chicago');
  assertWeather(app, 'Chicago, United States', '50°F', '50°F', '54°F', '46°F', '6 mph');
  await app.click('unit-toggle');
  assertWeather(app, 'Chicago, United States', '10°C', '10°C', '12°C', '8°C', '10 km/h');
  assert.equal(app.replies.length, 0);
}

test('successful city requests and unit conversions render current, hourly and daily weather', async () => {
  const app = await startApp();
  assert.equal(app.requests[0].searchParams.get('name'), 'New York');
  assert.equal(app.requests[1].hostname, 'api.open-meteo.com');
  assertWeather(app, 'New York, United States', '20°C', '20°C', '22°C', '18°C', '10 km/h');
  await app.click('unit-toggle');
  assertWeather(app, 'New York, United States', '68°F', '68°F', '72°F', '64°F', '6 mph');
  await app.click('unit-toggle');
  assertWeather(app, 'New York, United States', '20°C', '20°C', '22°C', '18°C', '10 km/h');
});

for (const [name, replies, message] of [
  ['no matching city', [response({ results: [] })], 'No matching city found.'],
  ['geocoding HTTP failure', [response({}, false)], 'Unable to find that city.'],
  ['weather HTTP failure', [city('Chicago'), response({}, false)], 'The weather service is temporarily unavailable.'],
  ['network failure', [city('Chicago'), new Error('Network offline')], 'Network offline'],
]) {
  test(`${name}: toggles preserve the error and a successful retry restores fresh weather`, async () => {
    const app = await startApp();
    app.replies.push(...replies);
    await app.search('Chicago');
    await assertToggleAndRetry(app, message);
  });
}

test('denied geolocation: toggles preserve the error and city retry works', async () => {
  const app = await startApp();
  await app.click('location-btn');
  assert.equal(app.nodes['location-btn'].disabled, true);
  app.position.error();
  assert.equal(app.nodes['location-btn'].disabled, false);
  await assertToggleAndRetry(app, 'Location access was denied. Try searching for a city instead.');
});

test('unsupported geolocation: toggles preserve the error and city retry works', async () => {
  const app = await startApp();
  delete app.navigator.geolocation;
  await app.click('location-btn');
  await assertToggleAndRetry(app, 'Geolocation is not supported in this browser.');
});

test('coordinate weather failure: toggles preserve the error and city retry works', async () => {
  const app = await startApp();
  app.replies.push(response({}, false));
  await app.click('location-btn');
  await app.position.success({ coords: { latitude: 41, longitude: -87 } });
  assert.equal(app.nodes['location-btn'].disabled, false);
  await assertToggleAndRetry(app, 'The weather service is temporarily unavailable.');
});

test('successful geolocation still displays and converts nearby weather', async () => {
  const app = await startApp();
  app.replies.push(response(weather(10)));
  await app.click('location-btn');
  await app.position.success({ coords: { latitude: 41, longitude: -87 } });
  assert.equal(app.requests.at(-1).searchParams.get('latitude'), '41');
  assert.equal(app.requests.at(-1).searchParams.get('longitude'), '-87');
  assert.equal(app.nodes['location-btn'].disabled, false);
  assertWeather(app, 'My Location', '10°C', '10°C', '12°C', '8°C', '10 km/h');
  await app.click('unit-toggle');
  assertWeather(app, 'My Location', '50°F', '50°F', '54°F', '46°F', '6 mph');
});
