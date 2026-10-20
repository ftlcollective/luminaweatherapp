// ---------- SheCodes Weather API ----------
const API_KEY = "2c530aa90bf29f794ft7eb5o087051de";
const API_BASE = "https://api.shecodes.io/weather/v1";
const DEFAULT_CITY = "Paris";

// Units we ask the API for, and the labels that go with them
const UNITS = {
  metric: { temp: "°C", wind: "m/s" },
  imperial: { temp: "°F", wind: "mph" },
};

// ---------- Page elements ----------
const card = document.querySelector("#card");
const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#search-input");
const locateButton = document.querySelector("#locate-button");
const statusElement = document.querySelector("#status");
const unitButtons = document.querySelectorAll(".units-button");
const recentSection = document.querySelector("#recent");
const recentList = document.querySelector("#recent-list");
const clearRecentButton = document.querySelector("#clear-recent");

const cityElement = document.querySelector("#city");
const locationElement = document.querySelector("#location");
const countryElement = document.querySelector("#country");
const timeElement = document.querySelector("#time");
const descriptionElement = document.querySelector("#description");
const iconElement = document.querySelector("#icon");
const temperatureElement = document.querySelector("#temperature");
const temperatureUnitElement = document.querySelector("#temperature-unit");
const humidityElement = document.querySelector("#humidity");
const windSpeedElement = document.querySelector("#wind-speed");
const feelsLikeItem = document.querySelector("#feels-like-item");
const feelsLikeElement = document.querySelector("#feels-like");

const forecastSub = document.querySelector("#forecast-sub");
const forecastNote = document.querySelector("#forecast-note");
const forecastList = document.querySelector("#forecast-list");

// ---------- Saved settings (the browser remembers them) ----------
function readStorage(key, fallback) {
  try {
    let value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Storage can be blocked (private mode). The app still works without it.
  }
}

let savedUnits = readStorage("lumina.units", "metric");
let savedRecent = readStorage("lumina.recent", []);

let state = {
  units: UNITS[savedUnits] ? savedUnits : "metric",
  recent: Array.isArray(savedRecent)
    ? savedRecent.filter((city) => typeof city === "string").slice(0, 5)
    : [],
  place: null, // the place on screen right now, so we can reload it when units change
};

// ---------- Small helpers ----------
// Weekday + time for a place, e.g. "Tuesday 18:42".
// The timeZone option makes the browser show that place's clock, not yours.
function formatPlaceTime(date, timeZone) {
  let options = timeZone ? { timeZone: timeZone } : {};
  let weekday = date.toLocaleDateString("en-GB", { ...options, weekday: "long" });
  let time = date.toLocaleTimeString("en-GB", {
    ...options,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  return `${weekday} ${time}`;
}

// Turn a city's coordinates into its timezone name, e.g. "Australia/Sydney"
function getTimeZone(coordinates) {
  try {
    if (!coordinates || typeof tzlookup !== "function") return null;
    return tzlookup(coordinates.latitude, coordinates.longitude);
  } catch (error) {
    return null;
  }
}

// A live clock for the city on screen. It ticks while you look at the page.
let clockTimer = null;

function startClock(timeZone, observedAt) {
  clearInterval(clockTimer);

  function showTime() {
    if (timeZone) {
      timeElement.textContent = `${formatPlaceTime(new Date(), timeZone)} · local time`;
    } else {
      // We couldn't work out the city's timezone, so say plainly whose clock this is
      timeElement.textContent = `Updated ${formatPlaceTime(observedAt)} · your time`;
    }
  }

  showTime();
  if (timeZone) clockTimer = setInterval(showTime, 10000);
}

// The API sends an icon name like "rain-night". We turn it into a mood
// so the background colours can change with the weather.
function getWeatherType(iconName) {
  if (iconName.startsWith("clear")) return "clear";
  if (iconName.startsWith("thunderstorm")) return "storm";
  if (iconName.startsWith("snow")) return "snow";
  if (iconName.startsWith("mist")) return "mist";
  if (iconName.includes("rain")) return "rain";
  if (iconName.includes("clouds")) return "clouds";
  return "clear";
}

// The API sends http:// icon links, but our page is https://
function secureUrl(url) {
  return url.replace("http://", "https://");
}

function formatWind(speed) {
  return `${Math.round(speed * 10) / 10} ${UNITS[state.units].wind}`;
}

function setStatus(message, type = "") {
  statusElement.textContent = message;
  statusElement.dataset.type = type;
}

function setLoading(isLoading) {
  card.classList.toggle("is-loading", isLoading);
}

function hideBrokenImage(image) {
  image.addEventListener("error", function () {
    image.style.visibility = "hidden";
  });
  image.addEventListener("load", function () {
    image.style.visibility = "visible";
  });
}

hideBrokenImage(iconElement);

// ---------- Current weather ----------
function showCurrent(response, coordinates) {
  let data = response.data;
  let temperature = Math.round(data.temperature.current);
  let unit = UNITS[state.units];

  cityElement.textContent = data.city;
  startClock(getTimeZone(coordinates), new Date(data.time * 1000));
  descriptionElement.textContent = data.condition.description;
  temperatureElement.textContent = temperature;
  temperatureUnitElement.textContent = unit.temp;
  humidityElement.textContent = `${data.temperature.humidity}%`;
  windSpeedElement.textContent = formatWind(data.wind.speed);

  // Country and "feels like" are bonuses: we only show them if the API sent them
  if (data.country) {
    countryElement.textContent = data.country;
    locationElement.hidden = false;
  } else {
    locationElement.hidden = true;
  }

  if (typeof data.temperature.feels_like === "number") {
    feelsLikeElement.textContent = `${Math.round(data.temperature.feels_like)}${unit.temp}`;
    feelsLikeItem.hidden = false;
  } else {
    feelsLikeItem.hidden = true;
  }

  iconElement.src = secureUrl(data.condition.icon_url);
  iconElement.alt = data.condition.description;

  document.body.dataset.weather = getWeatherType(data.condition.icon);
  document.title = `${temperature}${unit.temp} in ${data.city} · Lumina`;
}

// ---------- Forecast ----------
function setTemp(element, label, value) {
  let hiddenLabel = document.createElement("span");
  hiddenLabel.className = "sr-only";
  hiddenLabel.textContent = `${label} `;

  element.textContent = "";
  element.append(hiddenLabel, `${Math.round(value)}°`);
}

function createForecastDay(day) {
  let item = document.createElement("li");
  item.className = "forecast-day";
  item.innerHTML = `
    <span class="forecast-weekday"></span>
    <span class="forecast-date"></span>
    <img class="forecast-icon" alt="" width="52" height="52" />
    <span class="forecast-temps">
      <span class="forecast-high"></span>
      <span class="forecast-low"></span>
    </span>
    <span class="forecast-description"></span>
    <span class="forecast-wind">
      <svg class="icon" aria-hidden="true"><use href="#i-wind"></use></svg>
      <span class="forecast-wind-value"></span>
    </span>
  `;

  // The API gives each forecast day a timestamp at midday UTC,
  // so we read the weekday in UTC to always get the right day.
  let date = new Date(day.time * 1000);
  item.querySelector(".forecast-weekday").textContent = date.toLocaleDateString("en-GB", {
    weekday: "short",
    timeZone: "UTC",
  });
  item.querySelector(".forecast-date").textContent = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  let icon = item.querySelector(".forecast-icon");
  hideBrokenImage(icon);
  icon.src = secureUrl(day.condition.icon_url);

  setTemp(item.querySelector(".forecast-high"), "High", day.temperature.maximum);
  setTemp(item.querySelector(".forecast-low"), "Low", day.temperature.minimum);
  item.querySelector(".forecast-description").textContent = day.condition.description;
  item.querySelector(".forecast-wind-value").textContent = formatWind(day.wind.speed);

  return item;
}

function showForecast(response) {
  let days = response.data.daily;

  forecastList.textContent = "";
  days.forEach(function (day) {
    forecastList.append(createForecastDay(day));
  });

  forecastSub.textContent = `${days.length}-day outlook for ${response.data.city}`;
  forecastNote.hidden = true;
}

function showForecastUnavailable() {
  forecastList.textContent = "";
  forecastSub.textContent = "";
  forecastNote.textContent = "The forecast isn't available right now. Please try again in a moment.";
  forecastNote.hidden = false;
}

// ---------- Recent searches ----------
function renderRecent() {
  recentList.textContent = "";
  recentSection.hidden = state.recent.length === 0;

  state.recent.forEach(function (city) {
    let chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = city;
    chip.addEventListener("click", function () {
      searchCity(city);
    });
    recentList.append(chip);
  });
}

function rememberCity(city) {
  let others = state.recent.filter(function (saved) {
    return saved.toLowerCase() !== city.toLowerCase();
  });

  state.recent = [city, ...others].slice(0, 5);
  writeStorage("lumina.recent", state.recent);
  renderRecent();
}

// ---------- Loading the weather (search engine + API) ----------
let latestRequest = 0;

function showError(error, place) {
  let status = error.response && error.response.status;

  if (status === 404) {
    setStatus(
      place.type === "coords"
        ? "I couldn't find weather for your location. Try searching for a city."
        : "Hmm, I can't find that city. Try another spelling?",
      "error"
    );
  } else if (status === 401 || status === 403) {
    setStatus("The weather service didn't accept the API key.", "error");
  } else {
    setStatus("Couldn't reach the weather service. Check your connection and try again.", "error");
  }
}

function loadWeather(place) {
  let requestId = ++latestRequest;
  let params = { key: API_KEY, units: state.units };

  if (place.type === "coords") {
    params.lat = place.lat;
    params.lon = place.lon;
  } else {
    params.query = place.query;
  }

  setLoading(true);
  setStatus(
    place.type === "coords" ? "Finding the weather where you are…" : `Looking up ${place.query}…`
  );

  // Current weather and forecast are fetched at the same time
  Promise.allSettled([
    axios.get(`${API_BASE}/current`, { params }),
    axios.get(`${API_BASE}/forecast`, { params }),
  ])
    .then(function (results) {
      // If a newer search started while we waited, ignore this old answer
      if (requestId !== latestRequest) return;

      let current = results[0];
      let forecast = results[1];

      if (current.status === "rejected") {
        showError(current.reason, place);
        return;
      }

      state.place = place;

      // Coordinates tell us the city's timezone
      let coordinates =
        forecast.status === "fulfilled" && forecast.value.data.coordinates
          ? forecast.value.data.coordinates
          : current.value.data.coordinates;

      showCurrent(current.value, coordinates);
      rememberCity(current.value.data.city);

      if (forecast.status === "fulfilled") {
        showForecast(forecast.value);
      } else {
        showForecastUnavailable();
      }

      setStatus("");
    })
    .finally(function () {
      if (requestId === latestRequest) setLoading(false);
    });
}

function searchCity(city) {
  loadWeather({ type: "city", query: city });
}

// ---------- Events ----------
function handleSearchSubmit(event) {
  event.preventDefault();
  let city = searchInput.value.trim();

  if (city !== "") {
    searchCity(city);
  }
}

function handleUnitsClick(event) {
  let units = event.currentTarget.dataset.units;
  if (units === state.units) return;

  state.units = units;
  writeStorage("lumina.units", units);
  updateUnitButtons();

  // Ask the API again so every number is in the new unit
  if (state.place) loadWeather(state.place);
}

function updateUnitButtons() {
  unitButtons.forEach(function (button) {
    button.setAttribute("aria-pressed", String(button.dataset.units === state.units));
  });
}

function handleLocate() {
  if (!navigator.geolocation) {
    setStatus("Your browser can't share your location. Try searching for a city.", "error");
    return;
  }

  locateButton.disabled = true;
  setStatus("Asking for your location…");

  navigator.geolocation.getCurrentPosition(
    function (position) {
      locateButton.disabled = false;
      loadWeather({
        type: "coords",
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      });
    },
    function (error) {
      locateButton.disabled = false;
      setStatus(
        error.code === 1
          ? "Location access was blocked. You can still search for a city."
          : "Couldn't find your location. Try searching for a city.",
        "error"
      );
    },
    { timeout: 10000 }
  );
}

function handleClearRecent() {
  state.recent = [];
  writeStorage("lumina.recent", state.recent);
  renderRecent();
}

searchForm.addEventListener("submit", handleSearchSubmit);
locateButton.addEventListener("click", handleLocate);
clearRecentButton.addEventListener("click", handleClearRecent);
unitButtons.forEach(function (button) {
  button.addEventListener("click", handleUnitsClick);
});

// ---------- Start ----------
updateUnitButtons();
renderRecent();
searchCity(state.recent[0] || DEFAULT_CITY);
