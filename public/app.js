(() => {
  "use strict";

  const STORAGE_KEY = "london-now-phase0-preferences";
  const DEFAULTS = {
    airports: ["LHR", "LGW", "STN"],
    station: "London Waterloo",
    stepFree: true
  };
  const STATION_CODES = {
    "London Waterloo": "WAT",
    "London Victoria": "VIC",
    "London Paddington": "PAD",
    "London Liverpool Street": "LST",
    "London Bridge": "LBG",
    "London King’s Cross": "KGX",
    "London Euston": "EUS"
  };

  const settingsDialog = document.querySelector("#settingsDialog");
  const settingsForm = document.querySelector("#settingsForm");
  const dateSwitcher = document.querySelector("#dateSwitcher");
  const selectedDateBadge = document.querySelector("#selectedDateBadge");
  const viewTabs = [...document.querySelectorAll(".view-tab")];
  const cards = [...document.querySelectorAll("[data-card]")];

  let activeView = "now";
  let preferences = readPreferences();
  let selectedWeatherDate = londonDateKey(new Date());
  let weatherForecast = null;
  let eventsRequest = null;

  async function loadWeather() {
    const card = document.querySelector("#weatherCard");
    try {
      const response = await fetch("./api/weather", { headers: { accept: "application/json" } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      weatherForecast = data;
      renderWeather();
      card.classList.remove("is-loading");
      card.setAttribute("aria-busy", "false");
    } catch (error) {
      weatherForecast = null;
      document.querySelector("#weatherKicker").textContent = "Weather · unavailable";
      document.querySelector("#weatherTitle").textContent = "Check the official forecast";
      document.querySelector("#weatherTemp").textContent = "—°";
      document.querySelector("#weatherTemp").setAttribute("aria-label", "Temperature unavailable");
      document.querySelector("#weatherSummary").textContent = error instanceof Error ? error.message : "Weather data could not be loaded.";
      document.querySelector("#weatherLow").textContent = "—";
      document.querySelector("#weatherRain").textContent = "—";
      document.querySelector("#weatherWind").textContent = "—";
      document.querySelector("#weatherFreshness").textContent = "Live fetch failed · use official source";
      card.classList.remove("is-loading");
      card.setAttribute("aria-busy", "false");
    }
  }

  function renderWeather() {
    if (!weatherForecast) return;
    const day = weatherForecast.days.find((item) => item.date === selectedWeatherDate) || weatherForecast.days[0];
    if (!day) return;

    const readableDate = new Date(`${day.date}T12:00:00Z`).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "short",
      timeZone: "Europe/London"
    });
    const max = formatMetric(day.maxC, "°");
    document.querySelector("#weatherKicker").textContent = weatherForecast.stale ? "Weather · update delayed" : "Weather · live forecast";
    document.querySelector("#weatherTitle").textContent = `${weatherForecast.location} · ${readableDate}`;
    document.querySelector("#weatherTemp").textContent = max;
    document.querySelector("#weatherTemp").setAttribute("aria-label", `Forecast high ${max}`);
    document.querySelector("#weatherTemp").classList.remove("weather-mark--pending");
    document.querySelector("#weatherSummary").textContent = day.condition;
    document.querySelector("#weatherLow").textContent = formatMetric(day.minC, "°");
    document.querySelector("#weatherRain").textContent = formatMetric(day.rainProbability, "%");
    document.querySelector("#weatherWind").textContent = formatMetric(day.windMph, " mph");
    document.querySelector("#weatherFreshness").textContent = weatherForecast.stale
      ? `Update delayed · last fetched ${formatTime(weatherForecast.fetchedAt)}`
      : `Met Office fetched ${formatTime(weatherForecast.fetchedAt)}`;
  }

  function formatMetric(value, suffix) {
    return value == null ? "—" : `${value}${suffix}`;
  }

  function londonDateKey(date) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Europe/London"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  async function loadTfl() {
    const list = document.querySelector("#tflLines");
    const count = document.querySelector("#tflCount");
    const freshness = document.querySelector("#tflFreshness");
    const alert = document.querySelector("#tflAlert");
    const alertLabel = document.querySelector("#tflAlertLabel");
    const alertText = document.querySelector("#tflAlertText");

    try {
      const response = await fetch("./api/tfl", { headers: { accept: "application/json" } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);

      const disrupted = data.lines.filter((line) => line.disrupted);
      const goodCount = data.lines.length - disrupted.length;
      list.replaceChildren();
      list.setAttribute("aria-busy", "false");

      if (disrupted.length) {
        disrupted.forEach((line) => list.appendChild(createLineRow(line)));
        if (goodCount) {
          list.appendChild(createLineRow({
            name: `${goodCount} other line${goodCount === 1 ? "" : "s"}`,
            status: "Good Service",
            details: "No issue reported by TfL",
            disrupted: false
          }));
        }
        count.textContent = `${disrupted.length} issue${disrupted.length === 1 ? "" : "s"}`;
        count.className = "status-chip status-chip--mixed";
        alertLabel.textContent = "TfL alert";
        alertText.textContent = disrupted.map((line) => `${line.name}: ${line.status}`).join(" · ");
        alert.classList.remove("is-loading", "alert-strip--good", "alert-strip--error");
      } else {
        list.appendChild(createLineRow({
          name: "Included TfL lines",
          status: "Good Service",
          details: "Tube, DLR, London Overground and Elizabeth line",
          disrupted: false
        }));
        count.textContent = "Good service";
        count.className = "status-chip status-chip--good";
        alertLabel.textContent = "TfL status";
        alertText.textContent = data.summary;
        alert.classList.remove("is-loading", "alert-strip--error");
        alert.classList.add("alert-strip--good");
      }

      freshness.textContent = `TfL checked ${formatTime(data.checkedAt)}`;
    } catch (error) {
      list.replaceChildren(createLineRow({
        name: "Live status unavailable",
        status: "Check TfL",
        details: error instanceof Error ? error.message : "Temporary data error",
        disrupted: true
      }));
      list.setAttribute("aria-busy", "false");
      count.textContent = "Unavailable";
      count.className = "status-chip status-chip--mixed";
      freshness.textContent = "Live fetch failed · use official source";
      alertLabel.textContent = "Data issue";
      alertText.textContent = "TfL status could not be loaded. Check the official TfL page before travelling.";
      alert.classList.remove("is-loading", "alert-strip--good");
      alert.classList.add("alert-strip--error");
    }
  }

  async function loadAirportAccess() {
    const list = document.querySelector("#airportList");
    const freshness = document.querySelector("#airportFreshness");

    try {
      const response = await fetch("./api/airport-access", { headers: { accept: "application/json" } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);

      list.replaceChildren(...data.airports.map(createAirportRow));
      list.setAttribute("aria-busy", "false");
      freshness.textContent = `Access checked ${formatTime(data.checkedAt)}`;
      applyPreferences();
    } catch (error) {
      list.replaceChildren();
      const row = document.createElement("li");
      row.className = "airport-row airport-row--error";
      const copy = document.createElement("span");
      const title = document.createElement("strong");
      const detail = document.createElement("small");
      title.textContent = "Live access unavailable";
      detail.textContent = error instanceof Error ? error.message : "Temporary data error";
      copy.append(title, detail);
      row.append(copy);
      list.append(row);
      list.setAttribute("aria-busy", "false");
      freshness.textContent = "Live check failed · use Journey Planner";
    }
  }

  async function loadRail() {
    const stationName = document.querySelector("#stationName");
    const departures = document.querySelector("#stationDepartures");
    const status = document.querySelector("#stationStatus");
    const link = document.querySelector("#stationLink");
    const freshness = document.querySelector("#railFreshness");
    const requestedName = preferences.station;
    const station = STATION_CODES[requestedName] || "WAT";

    stationName.textContent = requestedName;
    departures.textContent = "Checking the next departures…";
    status.textContent = "Checking";
    status.className = "status-text";
    link.href = `https://www.nationalrail.co.uk/live-trains/departures/${station.toLowerCase()}/`;

    try {
      const response = await fetch(`./api/rail?station=${encodeURIComponent(station)}`, { headers: { accept: "application/json" } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      if (preferences.station !== requestedName) return;

      const services = data.services.slice(0, 3);
      departures.textContent = services.length
        ? services.map((service) => `${service.scheduled || "—"} ${service.destination} · ${service.status}`).join(" · ")
        : data.summary;
      status.textContent = data.status === "disruption" ? data.summary : data.status === "no-services" ? "No services" : "Live";
      status.className = `status-text ${data.status === "disruption" ? "status-text--warn" : data.status === "good" ? "status-text--good" : ""}`;
      freshness.textContent = `Rail checked ${formatTime(data.checkedAt)}`;
    } catch (error) {
      if (preferences.station !== requestedName) return;
      departures.textContent = error instanceof Error ? error.message : "Live rail data could not be loaded.";
      status.textContent = "Check ↗";
      status.className = "status-text status-text--warn";
      freshness.textContent = "Rail fetch failed · use official source";
    }
  }

  async function loadEvents() {
    const card = document.querySelector("#eventsCard");
    const list = document.querySelector("#eventList");
    const kicker = document.querySelector("#eventsKicker");
    const freshness = document.querySelector("#eventsFreshness");
    const category = document.querySelector("#eventCategory").value;

    if (eventsRequest) eventsRequest.abort();
    eventsRequest = new AbortController();
    card.classList.add("is-loading");
    card.setAttribute("aria-busy", "true");
    list.setAttribute("aria-busy", "true");
    list.replaceChildren(createLoadingRow("Finding events in London…"));
    kicker.textContent = "What’s on · checking";

    try {
      const params = new URLSearchParams({ date: selectedWeatherDate, category });
      const response = await fetch(`./api/events?${params}`, {
        headers: { accept: "application/json" },
        signal: eventsRequest.signal
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);

      list.replaceChildren();
      if (data.events.length) {
        data.events.slice(0, 6).forEach((event) => list.appendChild(createEventRow(event)));
        kicker.textContent = `What’s on · ${data.events.length} found`;
      } else {
        list.appendChild(createEventMessage("No matching events found", "Try another category or check Ticketmaster directly."));
        kicker.textContent = "What’s on · no matches";
      }
      freshness.textContent = `Ticketmaster checked ${formatTime(data.checkedAt)}`;
      list.setAttribute("aria-busy", "false");
      card.classList.remove("is-loading");
      card.setAttribute("aria-busy", "false");
    } catch (error) {
      if (error?.name === "AbortError") return;
      list.replaceChildren(createEventMessage(
        "Events temporarily unavailable",
        error instanceof Error ? error.message : "Check Ticketmaster for current listings."
      ));
      kicker.textContent = "What’s on · unavailable";
      freshness.textContent = "Live fetch failed · use official source";
      list.setAttribute("aria-busy", "false");
      card.classList.remove("is-loading");
      card.setAttribute("aria-busy", "false");
    }
  }

  function createEventRow(event) {
    const item = document.createElement("li");
    const time = document.createElement("time");
    time.dateTime = event.dateTime || `${event.date}T${event.time || "00:00"}`;
    time.textContent = event.time || "All day";

    const content = document.createElement("span");
    content.className = "event-copy";
    const title = document.createElement("strong");
    const link = document.createElement("a");
    link.href = event.ticketUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = event.title;
    title.appendChild(link);

    const details = document.createElement("small");
    const location = [event.venue, event.area].filter(Boolean).join(" · ");
    const category = event.subcategory || event.category;
    details.textContent = [location, category, formatEventPrice(event.price)].filter(Boolean).join(" · ");
    content.append(title, details);

    const action = document.createElement("a");
    action.className = "event-action";
    action.href = event.ticketUrl;
    action.target = "_blank";
    action.rel = "noopener noreferrer";
    action.textContent = "Tickets ↗";
    action.setAttribute("aria-label", `Tickets for ${event.title}`);
    item.append(time, content, action);
    return item;
  }

  function createEventMessage(titleText, detailText) {
    const item = document.createElement("li");
    item.className = "event-message";
    const content = document.createElement("span");
    const title = document.createElement("strong");
    const detail = document.createElement("small");
    title.textContent = titleText;
    detail.textContent = detailText;
    content.append(title, detail);
    item.appendChild(content);
    return item;
  }

  function createLoadingRow(text) {
    const item = document.createElement("li");
    item.className = "loading-row";
    const bar = document.createElement("span");
    const label = document.createElement("span");
    bar.className = "loading-bar";
    label.textContent = text;
    item.append(bar, label);
    return item;
  }

  function formatEventPrice(price) {
    if (!price) return "Price unavailable";
    if (price.explicitlyFree) return "Free";
    const currency = price.currency === "GBP" ? "£" : `${price.currency} `;
    return `From ${currency}${Number(price.min).toLocaleString("en-GB", { maximumFractionDigits: 2 })}`;
  }

  function createAirportRow(airport) {
    const row = document.createElement("li");
    row.className = `airport-row airport-row--${airport.status}`;
    row.dataset.airport = airport.code;

    const identity = document.createElement("span");
    const title = document.createElement("strong");
    const detail = document.createElement("small");
    title.textContent = `${airport.code} · ${airport.name}`;
    detail.textContent = airport.routes.map((route) => `${route.name}: ${route.status}`).join(" · ");
    identity.append(title, detail);

    const status = document.createElement("span");
    status.className = `status-text ${airport.status === "good" ? "status-text--good" : airport.status === "disruption" ? "status-text--warn" : ""}`;
    status.textContent = airport.label;
    row.append(identity, status);
    return row;
  }

  function createLineRow(line) {
    const item = document.createElement("li");
    const dot = document.createElement("span");
    dot.className = `mode-dot ${line.disrupted ? "mode-dot--tube" : "mode-dot--good"}`;
    dot.setAttribute("aria-hidden", "true");

    const body = document.createElement("span");
    const name = document.createElement("strong");
    const details = document.createElement("small");
    name.textContent = line.name;
    details.textContent = line.details || line.status;
    body.append(name, details);

    const status = document.createElement("span");
    status.className = `status-text ${line.disrupted ? "status-text--warn" : "status-text--good"}`;
    status.textContent = line.status;
    item.append(dot, body, status);
    return item;
  }

  function formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "just now";
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/London",
      timeZoneName: "short"
    }).format(date);
  }

  function readPreferences() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved) return { ...DEFAULTS };
      return {
        airports: Array.isArray(saved.airports) ? saved.airports : DEFAULTS.airports,
        station: saved.station || DEFAULTS.station,
        stepFree: saved.stepFree !== false
      };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function renderDates() {
    const today = new Date();
    const days = Array.from({ length: 3 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      return date;
    });

    days.forEach((date, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `date-button${index === 0 ? " is-active" : ""}`;
      button.textContent = index === 0
        ? "Today"
        : date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
      button.dataset.badge = index === 0
        ? "Today"
        : date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
      button.dataset.date = londonDateKey(date);
      button.setAttribute("aria-pressed", index === 0 ? "true" : "false");
      button.addEventListener("click", () => {
        document.querySelectorAll(".date-button").forEach((item) => {
          const selected = item === button;
          item.classList.toggle("is-active", selected);
          item.setAttribute("aria-pressed", selected ? "true" : "false");
        });
        selectedDateBadge.textContent = button.dataset.badge;
        selectedWeatherDate = button.dataset.date;
        renderWeather();
        loadEvents();
      });
      dateSwitcher.appendChild(button);
    });
  }

  function applyView() {
    cards.forEach((card) => {
      const views = (card.dataset.views || "").split(" ");
      card.classList.toggle("is-hidden", !views.includes(activeView));
    });
  }

  function syncForm() {
    settingsForm.querySelectorAll('input[name="airport"]').forEach((checkbox) => {
      checkbox.checked = preferences.airports.includes(checkbox.value);
    });
    settingsForm.elements.station.value = preferences.station;
    settingsForm.elements.stepFree.checked = preferences.stepFree;
  }

  function applyPreferences() {
    document.querySelectorAll("[data-airport]").forEach((row) => {
      row.classList.toggle("is-hidden", !preferences.airports.includes(row.dataset.airport));
    });
    document.querySelectorAll("[data-airport-link]").forEach((link) => {
      link.classList.toggle("is-hidden", !preferences.airports.includes(link.dataset.airportLink));
    });
    document.querySelector("#stationName").textContent = preferences.station;
    document.querySelector("#stepFreeRow").classList.toggle("is-hidden", !preferences.stepFree);
  }

  function openSettings() {
    syncForm();
    if (typeof settingsDialog.showModal === "function") settingsDialog.showModal();
    else settingsDialog.setAttribute("open", "");
  }

  document.querySelector("#customiseButton").addEventListener("click", openSettings);
  document.querySelectorAll("[data-open-settings]").forEach((button) => button.addEventListener("click", openSettings));
  document.querySelector("#closeSettings").addEventListener("click", () => settingsDialog.close());

  settingsDialog.addEventListener("click", (event) => {
    if (event.target === settingsDialog) settingsDialog.close();
  });

  settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(settingsForm);
    preferences = {
      airports: data.getAll("airport"),
      station: String(data.get("station")),
      stepFree: data.get("stepFree") === "on"
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    applyPreferences();
    loadRail();
    settingsDialog.close();
  });

  document.querySelector("#resetSettings").addEventListener("click", () => {
    preferences = { ...DEFAULTS, airports: [...DEFAULTS.airports] };
    localStorage.removeItem(STORAGE_KEY);
    syncForm();
    applyPreferences();
    loadRail();
  });

  viewTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activeView = tab.dataset.view;
      viewTabs.forEach((item) => {
        const selected = item === tab;
        item.classList.toggle("is-active", selected);
        item.setAttribute("aria-selected", selected ? "true" : "false");
      });
      applyView();
    });
  });

  document.querySelector("#fullScreenLink").href = window.location.href;
  document.querySelector("#eventCategory").addEventListener("change", loadEvents);
  renderDates();
  applyPreferences();
  applyView();
  loadTfl();
  loadWeather();
  loadRail();
  loadAirportAccess();
  loadEvents();
  window.setInterval(loadTfl, 90_000);
  window.setInterval(loadWeather, 5 * 60_000);
  window.setInterval(loadAirportAccess, 90_000);
  window.setInterval(loadRail, 90_000);
  window.setInterval(loadEvents, 30 * 60_000);
})();
