(() => {
  "use strict";

  const STORAGE_KEY = "scolorships-scholarships-v1";
  const form = document.querySelector("#scholarship-form");
  const list = document.querySelector("#scholarship-list");
  const searchInput = document.querySelector("#search-input");
  const levelFilter = document.querySelector("#level-filter");
  const statusFilter = document.querySelector("#status-filter");
  const message = document.querySelector("#form-message");

  let scholarships = loadScholarships();

  function loadScholarships() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(saved) ? saved.filter(item => item && typeof item.id === "string") : [];
    } catch {
      return [];
    }
  }

  function saveScholarships() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scholarships));
      return true;
    } catch {
      message.textContent = "Your browser couldn't save this list. Check your browser storage settings.";
      return false;
    }
  }

  function safeExternalUrl(value) {
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function formatDeadline(value) {
    if (!value) return "Deadline not entered";
    const date = new Date(value + "T12:00:00");
    return Number.isNaN(date.getTime()) ? "Deadline not entered" : "Deadline: " + date.toLocaleDateString(undefined, {month:"short",day:"numeric",year:"numeric"});
  }

  function updateStats() {
    document.querySelector("#total-count").textContent = scholarships.length;
    document.querySelector("#saved-count").textContent = scholarships.filter(item => item.saved).length;
    document.querySelector("#applied-count").textContent = scholarships.filter(item => item.applied).length;
  }

  function render() {
    const query = searchInput.value.trim().toLowerCase();
    const level = levelFilter.value;
    const status = statusFilter.value;
    const filtered = scholarships.filter(item => {
      const matchesQuery = [item.name, item.provider, item.level, item.notes].join(" ").toLowerCase().includes(query);
      const matchesLevel = level === "all" || item.level === level;
      const matchesStatus = status === "all" || (status === "saved" && item.saved) || (status === "applied" && item.applied);
      return matchesQuery && matchesLevel && matchesStatus;
    });

    list.replaceChildren();
    if (!filtered.length) {
      const empty = makeElement("div", "empty-state");
      empty.append(makeElement("div", "empty-icon", "✧"));
      empty.append(makeElement("h3", "", scholarships.length ? "No matching scholarships" : "Your list is ready"));
      empty.append(makeElement("p", "", scholarships.length ? "Try another search or filter, or add a scholarship above." : "Search the resources below, then add opportunities you find here."));
      list.append(empty);
    } else {
      filtered.forEach(item => list.append(createCard(item)));
    }
    updateStats();
  }

  function createCard(item) {
    const card = makeElement("article", "scholarship-card");
    const top = makeElement("div", "card-top");
    const titleWrap = makeElement("div");
    titleWrap.append(makeElement("h3", "card-title", item.name));
    titleWrap.append(makeElement("p", "card-provider", item.provider || "Provider not entered"));
    top.append(titleWrap);
    top.append(makeElement("span", "level-pill", item.level));
    card.append(top);

    if (item.notes) card.append(makeElement("p", "card-notes", item.notes));
    const meta = makeElement("div", "card-meta");
    meta.append(makeElement("span", "", formatDeadline(item.deadline)));
    meta.append(makeElement("span", "", item.applied ? "Status: Applied" : item.saved ? "Status: Saved" : "Status: Not saved"));
    card.append(meta);

    const actions = makeElement("div", "card-actions");
    const saveButton = makeElement("button", "small-button" + (item.saved ? " active" : ""), item.saved ? "★ Saved" : "☆ Save");
    saveButton.type = "button";
    saveButton.addEventListener("click", () => updateItem(item.id, {saved: !item.saved}));
    actions.append(saveButton);

    const appliedButton = makeElement("button", "small-button" + (item.applied ? " active" : ""), item.applied ? "✓ Applied" : "Mark applied");
    appliedButton.type = "button";
    appliedButton.addEventListener("click", () => updateItem(item.id, {applied: !item.applied}));
    actions.append(appliedButton);

    const link = safeExternalUrl(item.url);
    if (link) {
      const openLink = makeElement("a", "small-button", "Official website ↗");
      openLink.href = link;
      openLink.target = "_blank";
      openLink.rel = "noopener noreferrer";
      actions.append(openLink);
    }

    const deleteButton = makeElement("button", "small-button danger", "Remove");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", () => {
      scholarships = scholarships.filter(entry => entry.id !== item.id);
      saveScholarships();
      render();
    });
    actions.append(deleteButton);
    card.append(actions);
    return card;
  }

  function updateItem(id, changes) {
    scholarships = scholarships.map(item => item.id === id ? {...item, ...changes} : item);
    saveScholarships();
    render();
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const level = String(data.get("level") || "");
    const rawUrl = String(data.get("url") || "").trim();
    const url = rawUrl ? safeExternalUrl(rawUrl) : "";

    if (!name || !level) {
      message.textContent = "Enter a scholarship name and choose an education level.";
      return;
    }
    if (rawUrl && !url) {
      message.textContent = "Enter a valid website link that starts with http:// or https://.";
      return;
    }

    scholarships.unshift({
      id: window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
      name,
      provider: String(data.get("provider") || "").trim(),
      level,
      deadline: String(data.get("deadline") || ""),
      url,
      notes: String(data.get("notes") || "").trim(),
      saved: false,
      applied: false
    });
    saveScholarships();
    form.reset();
    message.textContent = "Scholarship added to your list.";
    render();
  });

  searchInput.addEventListener("input", render);
  levelFilter.addEventListener("change", render);
  statusFilter.addEventListener("change", render);
  render();
})();