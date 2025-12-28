/* Holidae prototype (cleaned + fixed)
   - Mobile menu toggle (aria-expanded, Escape, close on link click)
   - Active nav link (aria-current)
   - Footer year
   - Packages tools: search, destination filter, price range, sort, saved-only
   - Save deals (localStorage) + Saved page rendering
   - Compare (max 3) + Compare page rendering
   - Package details booking calculator + booking history (localStorage)
*/

/* ---------- Safe localStorage helpers ---------- */
function safeLocalGet(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    try { return JSON.parse(raw); } catch (_) { return raw; }
  } catch (e) {
    return fallback;
  }
}

function safeLocalSet(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

/* ---------- Data ---------- */
const PACKAGES = [
  {
    id: "maldives",
    title: "Sun & Beach — Maldives",
    location: "Maldives",
    nights: 5,
    priceFrom: 299,
    image: "assets/img/img-beach.jpg",
    description: "Unwind on white‑sand beaches with warm seas and relaxed island evenings."
  },
  {
    id: "istanbul",
    title: "City Break — Istanbul, Turkey",
    location: "Turkey",
    nights: 3,
    priceFrom: 219,
    image: "assets/img/img-city.jpg",
    description: "Explore historic streets, markets, and skyline views with a central base."
  },
  {
    id: "swiss-alps",
    title: "Mountain Escape — Swiss Alps",
    location: "Switzerland",
    nights: 4,
    priceFrom: 349,
    image: "assets/img/img-mountain.jpg",
    description: "Fresh alpine air, scenic trails, and cosy evenings with mountain views."
  },
  {
    id: "phuket",
    title: "Resort Week — Phuket, Thailand",
    location: "Thailand",
    nights: 7,
    priceFrom: 399,
    image: "assets/img/img-resort.jpg",
    description: "Relax by the pool, enjoy beach days, and taste local food on the islands."
  }
];

const LS_SAVED = "holidae_saved_deals";
const LS_COMPARE = "holidae_compare";
const LS_BOOKING_HISTORY = "holidae_booking_history";

/* ---------- Small helpers ---------- */
function $(sel, root = document) { return root.querySelector(sel); }
function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function currentPageName() {
  return (location.pathname.split("/").pop() || "index.html").toLowerCase();
}

function getQueryParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

function getPkgById(id) {
  return PACKAGES.find(p => p.id === id) || null;
}

function getSavedSet() {
  const arr = safeLocalGet(LS_SAVED, []);
  return new Set(Array.isArray(arr) ? arr : []);
}

function setSavedSet(setObj) {
  safeLocalSet(LS_SAVED, Array.from(setObj));
}

function getCompareList() {
  const arr = safeLocalGet(LS_COMPARE, []);
  return Array.isArray(arr) ? arr : [];
}

function setCompareList(list) {
  safeLocalSet(LS_COMPARE, list);
}

function pushBooking(record) {
  const arr = safeLocalGet(LS_BOOKING_HISTORY, []);
  const list = Array.isArray(arr) ? arr : [];
  list.unshift(record);
  safeLocalSet(LS_BOOKING_HISTORY, list.slice(0, 10)); // keep last 10
}

/* ---------- Global UI (nav + footer) ---------- */
function initNav() {
  const nav = $("#site-nav");
  const btn = $(".nav-toggle");

  if (btn && nav) {
    const closeMenu = () => {
      nav.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    };

    btn.addEventListener("click", () => {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expanded));
      nav.classList.toggle("open", !expanded);
    });

    // Close on link click (mobile)
    $all("a[href]", nav).forEach(a => a.addEventListener("click", closeMenu));

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }

  // Active link
  const here = currentPageName();
  $all("nav a[href]").forEach(a => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    if (href === here) a.setAttribute("aria-current", "page");
  });
}

function initFooterYear() {
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());
}

/* ---------- Save deal (details page button) ---------- */
function initSaveDealButton() {
  const btn = $("#saveDealBtn");
  if (!btn) return;

  const id = getQueryParam("id");
  if (!id) return;

  const msg = $("#saveMessage");
  const saved = getSavedSet();

  const render = () => {
    const isSaved = saved.has(id);
    btn.textContent = isSaved ? "Saved ✓" : "Save deal";
    btn.setAttribute("aria-pressed", String(isSaved));
    if (msg) msg.textContent = isSaved ? "Saved to your deals." : "";
  };

  btn.addEventListener("click", () => {
    if (saved.has(id)) saved.delete(id);
    else saved.add(id);
    setSavedSet(saved);
    render();
    // keep any other UI in sync
    updateSavedBadges();
  });

  render();
}

/* ---------- Compare buttons on package cards (packages page) ---------- */
function initCompareButtonsOnCards() {
  const cards = $all(".package-card[data-id]");
  if (!cards.length) return;

  const list = getCompareList();

  const renderCounts = () => {
    const n = getCompareList().length;
    $all("[data-compare-count]").forEach(el => {
      el.textContent = n ? ("Selected: " + n + "/3") : "";
    });
  };

  cards.forEach(card => {
    const id = card.getAttribute("data-id");
    if (!id) return;

    // Avoid duplicate insertion
    if (card.querySelector("[data-compare-toggle]")) return;

    const wrap = document.createElement("div");
    wrap.style.marginTop = "12px";
    wrap.style.display = "flex";
    wrap.style.gap = "10px";
    wrap.style.alignItems = "center";
    wrap.style.flexWrap = "wrap";

    const label = document.createElement("label");
    label.style.display = "inline-flex";
    label.style.alignItems = "center";
    label.style.gap = "8px";
    label.style.padding = "8px 10px";
    label.style.border = "1px solid rgba(0,0,0,0.15)";
    label.style.borderRadius = "10px";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.setAttribute("data-compare-toggle", "1");
    cb.checked = getCompareList().includes(id);

    const text = document.createElement("span");
    text.textContent = "Compare";

    const small = document.createElement("span");
    small.className = "muted";
    small.style.fontSize = "0.9rem";
    small.setAttribute("data-compare-count", "1");

    label.appendChild(cb);
    label.appendChild(text);

    cb.addEventListener("change", () => {
      let current = getCompareList();
      const has = current.includes(id);

      if (cb.checked && !has) {
        if (current.length >= 3) {
          cb.checked = false;
          alert("You can compare up to 3 packages.");
          return;
        }
        current = current.concat(id);
      } else if (!cb.checked && has) {
        current = current.filter(x => x !== id);
      }

      setCompareList(current);
      renderCounts();
    });

    wrap.appendChild(label);
    wrap.appendChild(small);

    const body = card.querySelector(".card-body") || card;
    body.appendChild(wrap);
  });

  renderCounts();
}

/* ---------- Packages page tools (filter/search/sort) ---------- */
function initPackagesTools() {
  const cards = $all(".package-card[data-id]");
  if (!cards.length) return;

  // Inputs (support both sets of controls if present)
  const searchInput = $("#packageSearch");
  const destinationSelectA = $("#packageFilter");
  const destinationSelectB = $("#packageLocationFilter");
  const savedOnlyCheckbox = $("#savedOnly");
  const savedOnlySelect = $("#packageSavedFilter");
  const minInput = $("#priceMin");
  const maxInput = $("#priceMax");
  const clearPriceBtn = $("#priceClear");
  const sortSelect = $("#packageSort");

  // Populate destination select(s)
  const locations = Array.from(new Set(PACKAGES.map(p => p.location))).sort((a, b) => a.localeCompare(b));
  const fillSelect = (sel) => {
    if (!sel) return;
    // keep first option, then add unique ones (avoid duplicates)
    const existing = new Set($all("option", sel).map(o => o.value));
    locations.forEach(loc => {
      if (existing.has(loc)) return;
      const opt = document.createElement("option");
      opt.value = loc;
      opt.textContent = loc;
      sel.appendChild(opt);
    });
  };
  fillSelect(destinationSelectA);
  fillSelect(destinationSelectB);

  const getControls = () => {
    const savedSet = getSavedSet();

    const q = (searchInput ? searchInput.value : "").trim().toLowerCase();

    const dest =
      (destinationSelectB && destinationSelectB.value && destinationSelectB.value !== "all") ? destinationSelectB.value :
      (destinationSelectA && destinationSelectA.value && destinationSelectA.value !== "all") ? destinationSelectA.value :
      "all";

    const savedOnly =
      (savedOnlyCheckbox && savedOnlyCheckbox.checked) ||
      (savedOnlySelect && savedOnlySelect.value === "saved");

    const min = minInput && minInput.value !== "" ? Number(minInput.value) : null;
    const max = maxInput && maxInput.value !== "" ? Number(maxInput.value) : null;

    const sort = sortSelect ? sortSelect.value : "default";

    return { savedSet, q, dest, savedOnly, min, max, sort };
  };

  const getCardData = (card) => {
    const id = card.getAttribute("data-id");
    const pkg = getPkgById(id) || {};
    const title = (pkg.title || card.querySelector("h2")?.textContent || "").toLowerCase();
    const loc = (pkg.location || "").toLowerCase();
    const price = Number(pkg.priceFrom || 0);
    return { id, title, loc, price };
  };

  const apply = () => {
    const { savedSet, q, dest, savedOnly, min, max, sort } = getControls();

    // filter first
    cards.forEach(card => {
      const { id, title, loc, price } = getCardData(card);

      let ok = true;

      if (q) {
        ok = ok && (title.includes(q) || loc.includes(q));
      }
      if (dest !== "all") {
        ok = ok && (getPkgById(id)?.location === dest);
      }
      if (savedOnly) {
        ok = ok && savedSet.has(id);
      }
      if (min !== null && !Number.isNaN(min)) {
        ok = ok && price >= min;
      }
      if (max !== null && !Number.isNaN(max)) {
        ok = ok && price <= max;
      }

      card.style.display = ok ? "" : "none";
    });

    // sort visible cards (only if we can access the grid)
    const grid = cards[0]?.parentElement;
    if (grid && sort && sort !== "default") {
      const visible = cards.filter(c => c.style.display !== "none");
      const sorted = visible.slice().sort((a, b) => {
        const A = getCardData(a);
        const B = getCardData(b);

        if (sort === "az") return A.title.localeCompare(B.title);
        if (sort === "za") return B.title.localeCompare(A.title);
        if (sort === "priceLow") return A.price - B.price;
        if (sort === "priceHigh") return B.price - A.price;
        return 0;
      });
      sorted.forEach(el => grid.appendChild(el));
    }

    updateSavedBadges();
  };

  // Events
  [searchInput, destinationSelectA, destinationSelectB, savedOnlyCheckbox, savedOnlySelect, minInput, maxInput, sortSelect]
    .filter(Boolean)
    .forEach(el => el.addEventListener("input", apply));

  if (clearPriceBtn) {
    clearPriceBtn.addEventListener("click", () => {
      if (minInput) minInput.value = "";
      if (maxInput) maxInput.value = "";
      apply();
    });
  }

  apply();
}

/* ---------- Saved badges (optional) ---------- */
function updateSavedBadges() {
  // If you later add any "[data-saved-badge]" elements, this will support it.
  const saved = getSavedSet();
  $all("[data-saved-badge]").forEach(el => {
    const id = el.getAttribute("data-saved-badge");
    el.textContent = saved.has(id) ? "Saved" : "";
  });
}

/* ---------- Saved page rendering ---------- */
function initSavedPage() {
  const listEl = $("#savedList");
  if (!listEl) return;

  const emptyEl = $("#savedEmpty");
  const saved = Array.from(getSavedSet());
  listEl.innerHTML = "";

  if (!saved.length) {
    if (emptyEl) emptyEl.style.display = "";
    return;
  }
  if (emptyEl) emptyEl.style.display = "none";

  saved.forEach(id => {
    const pkg = getPkgById(id);
    if (!pkg) return;

    const item = document.createElement("article");
    item.className = "card";
    item.style.marginBottom = "14px";

    item.innerHTML = `
      <div class="card-body">
        <h2 style="margin:0 0 6px 0;">${pkg.title}</h2>
        <p class="muted" style="margin:0 0 10px 0;">${pkg.nights} nights • From £${pkg.priceFrom}</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <a class="btn primary" href="package-details.html?id=${pkg.id}">View deal</a>
          <button class="btn" type="button" data-remove-saved="${pkg.id}">Remove</button>
        </div>
      </div>
    `;
    listEl.appendChild(item);
  });

  $all("[data-remove-saved]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-remove-saved");
      const s = getSavedSet();
      s.delete(id);
      setSavedSet(s);
      initSavedPage();
    });
  });
}

/* ---------- Compare page rendering ---------- */
function initComparePage() {
  const grid = $("#compareGrid");
  if (!grid) return;

  const hint = $("#compareHint");
  const clearBtn = $("#compareClear");

  const render = () => {
    const ids = getCompareList();
    grid.innerHTML = "";

    if (!ids.length) {
      if (hint) hint.style.display = "";
      return;
    }
    if (hint) hint.style.display = "none";

    ids.forEach(id => {
      const pkg = getPkgById(id);
      if (!pkg) return;

      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `
        <div class="card-media">
          <img src="${pkg.image}" alt="${pkg.title}">
        </div>
        <div class="card-body">
          <h2>${pkg.title}</h2>
          <p class="muted">${pkg.location} • ${pkg.nights} nights • From £${pkg.priceFrom}</p>
          <p>${pkg.description}</p>
          <a class="btn primary" href="package-details.html?id=${pkg.id}">View</a>
        </div>
      `;
      grid.appendChild(card);
    });
  };

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      setCompareList([]);
      render();
    });
  }

  render();
}

/* ---------- Package details: booking calculator ---------- */
function initPackageDetailsBooking() {
  // Works on package-details.html only (elements exist there)
  const people = $("#peopleCount");
  const startDate = $("#startDate");
  const total = $("#totalPrice");
  const bookBtn = $("#bookNowBtn");
  const msg = $("#bookMsg");

  const travelDate = $("#travelDate");
  const confirm = $("#confirmBooking");

  const id = getQueryParam("id");
  const pkg = id ? getPkgById(id) : null;
  if (!pkg) return;

  // Render package content (image + text)
  const titleEl = $("#pkgTitle");
  const descEl = $("#pkgDesc");
  const locEl = $("#pkgLocation");
  const nightsEl = $("#pkgNights");
  const priceEl = $("#pkgPriceFrom");
  const imgEl = $("#pkgImg");

  if (titleEl) titleEl.textContent = pkg.title;
  if (descEl) descEl.textContent = pkg.description || "";
  if (locEl) locEl.textContent = pkg.location || "";
  if (nightsEl) nightsEl.textContent = String(pkg.nights ?? "");
  if (priceEl) priceEl.textContent = "£" + Number(pkg.priceFrom || 0).toFixed(0);
  if (imgEl) {
    imgEl.src = pkg.image || "";
    imgEl.alt = pkg.title;
  }
  // Helpful for browser tab + accessibility
  if (document && pkg.title) document.title = "Holidae | " + pkg.title;

  const calcTotal = () => {
    const n = people ? Number(people.value || 1) : 1;
    const qty = (!Number.isNaN(n) && n > 0) ? n : 1;
    const t = pkg.priceFrom * qty;
    if (total) total.textContent = "£" + t.toFixed(0);
    return t;
  };

  // set min date to today for nicer UX
  const today = new Date();
  const iso = new Date(today.getTime() - today.getTimezoneOffset()*60000).toISOString().slice(0,10);
  if (startDate) startDate.min = iso;
  if (travelDate) travelDate.min = iso;

  if (people) people.addEventListener("input", calcTotal);
  calcTotal();

  const doBook = (pickedDate) => {
    const amount = calcTotal();
    const dateVal = pickedDate || (startDate ? startDate.value : "") || (travelDate ? travelDate.value : "");
    const record = {
      id: pkg.id,
      title: pkg.title,
      people: people ? Number(people.value || 1) : 1,
      date: dateVal || null,
      total: amount,
      createdAt: new Date().toISOString()
    };
    pushBooking(record);
    if (msg) msg.textContent = "Booking saved (prototype). You can view it on the Booking page.";
  };

  if (bookBtn) {
    bookBtn.addEventListener("click", () => doBook(startDate ? startDate.value : null));
  }
  if (confirm) {
    confirm.addEventListener("click", () => doBook(travelDate ? travelDate.value : null));
  }
}

/* ---------- Booking page (history + print) ---------- */
function initBookingPage() {
  const current = $("#bookingCurrent");
  const history = $("#bookingHistory");
  const printBtn = $("#printBooking");

  if (!current && !history) return;

  const list = safeLocalGet(LS_BOOKING_HISTORY, []);
  const bookings = Array.isArray(list) ? list : [];

  const fmtDate = (iso) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleDateString();
    } catch { return iso; }
  };

  const render = () => {
    if (current) current.innerHTML = "";
    if (history) history.innerHTML = "";

    if (!bookings.length) {
      if (current) current.innerHTML = `<p class="muted">No bookings yet. Book a package from the details page.</p>`;
      return;
    }

    const first = bookings[0];
    if (current) {
      current.innerHTML = `
        <article class="card">
          <div class="card-body">
            <h2 style="margin:0 0 6px 0;">Current booking</h2>
            <p><strong>${first.title}</strong></p>
            <p class="muted" style="margin:0;">People: ${first.people || 1} • Date: ${fmtDate(first.date)} • Total: £${Number(first.total || 0).toFixed(0)}</p>
          </div>
        </article>
      `;
    }

    if (history) {
      const ul = document.createElement("ul");
      ul.style.margin = "0";
      ul.style.paddingLeft = "18px";
      bookings.slice(1).forEach(b => {
        const li = document.createElement("li");
        li.textContent = `${b.title} — ${fmtDate(b.date)} — £${Number(b.total || 0).toFixed(0)}`;
        ul.appendChild(li);
      });
      history.appendChild(ul);
    }
  };

  if (printBtn) {
    printBtn.addEventListener("click", () => window.print());
  }

  render();
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initFooterYear();

  initSaveDealButton();
  initCompareButtonsOnCards();
  initPackagesTools();

  initSavedPage();
  initComparePage();

  initPackageDetailsBooking();
  initBookingPage();
});
