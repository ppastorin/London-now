(() => {
  "use strict";

  const STORAGE_KEY = "london-now-phase0-preferences";
  const DEFAULTS = {
    airports: ["LHR", "LGW", "STN"],
    station: "London Waterloo",
    stepFree: true
  };

  const settingsDialog = document.querySelector("#settingsDialog");
  const settingsForm = document.querySelector("#settingsForm");
  const dateSwitcher = document.querySelector("#dateSwitcher");
  const selectedDateBadge = document.querySelector("#selectedDateBadge");
  const viewTabs = [...document.querySelectorAll(".view-tab")];
  const cards = [...document.querySelectorAll("[data-card]")];

  let activeView = "now";
  let preferences = readPreferences();

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
      button.setAttribute("aria-pressed", index === 0 ? "true" : "false");
      button.addEventListener("click", () => {
        document.querySelectorAll(".date-button").forEach((item) => {
          const selected = item === button;
          item.classList.toggle("is-active", selected);
          item.setAttribute("aria-pressed", selected ? "true" : "false");
        });
        selectedDateBadge.textContent = button.dataset.badge;
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
    settingsDialog.close();
  });

  document.querySelector("#resetSettings").addEventListener("click", () => {
    preferences = { ...DEFAULTS, airports: [...DEFAULTS.airports] };
    localStorage.removeItem(STORAGE_KEY);
    syncForm();
    applyPreferences();
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
  renderDates();
  applyPreferences();
  applyView();
})();
