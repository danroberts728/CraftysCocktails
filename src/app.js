import * as CFG from "./config.js";

// --- Config (fallbacks ok for GH Pages)
const SHEET_URL = CFG.SHEET_URL;
const RECIPES_URL = CFG.RECIPES_URL ?? "./assets/data/recipes.json";
const INVITES_URL = CFG.INVITES_URL ?? "./assets/data/invites.json";

/* ================= Utilities ================= */
// If the sheet is blank, make it TBD for the card
const defaultTbd = v => {
    if (v == null) return CFG.DEFAULT_TBD;
    const s = String(v).trim();
    return s === "" ? CFG.DEFAULT_TBD : s;
};

// Clean parse CSV file
async function parseCsv(url) {
    const res = await fetch(url);
    const text = await res.text();
    const [header, ...rows] = text.trim().split(/\r?\n/);
    const cols = header.split(",").map(h => h.trim());
    return rows.map(r => {
        const vals = r.split(",").map(v => v.trim());
        const o = {};
        cols.forEach((c, i) => o[c] = vals[i]);
        return o;
    });
}

// Keep these in sync with CSS vars
const CARD_H = 84;
const V_GAP = 16;

function withinIdx(matchNum, arr) {
    const min = Math.min(...arr.map(d => d.Match));
    return matchNum - min + 1;
}

/* ================= Recipe store + modal ================= */

function lockBodyScroll(lock) {
    document.documentElement.style.overflow = lock ? "hidden" : "";
    document.body.style.overflow = lock ? "hidden" : "";
}

const Recipes = {
    map: new Map(),
    async load(url = RECIPES_URL) {
        if (this.map.size) return this.map;
        try {
            const res = await fetch(url, { cache: "no-store" });
            const json = await res.json();
            Object.keys(json).forEach(name =>
                this.map.set(name.toLowerCase(), json[name])
            );
        } catch (e) {
            console.warn(CFG.ERRORSTR_RECIPE_FETCH, e);
        }
        return this.map;
    },
    get(name) {
        if (!name) return null;
        return this.map.get(String(name).toLowerCase()) || null;
    }
};

/* ================= Invites store ================= */

const Invites = {
    list: [],
    async load(url = INVITES_URL) {
        if (this.list.length) return this.list;
        try {
            const res = await fetch(url, { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            // ensure it's an array
            this.list = Array.isArray(json) ? json : [];
        } catch (e) {
            console.warn("No invites loaded:", e);
            this.list = [];
        }
        return this.list;
    },
    findByRoundMatch(round, match) {
        round = Number(round);
        match = Number(match);
        return this.list.find(
            i => Number(i.round) === round && Number(i.match) === match
        ) || null;
    }
};

/* ====== RECIPE MODAL ====== */
function setupRecipeModal() {
    const modal = document.getElementById(CFG.ELEMENTID_RECIPE_MODAL);
    if (!modal || modal.__wired) return;
    modal.__wired = true;

    modal.addEventListener("click", (e) => {
        if (e.target.hasAttribute("data-close") || e.target === modal) {
            if (document.activeElement && modal.contains(document.activeElement)) {
                document.activeElement.blur();
            }
            modal.classList.remove("is-open");
            modal.setAttribute("aria-hidden", "true");
            lockBodyScroll(false);
        }
    });

    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("is-open")) {
            if (document.activeElement && modal.contains(document.activeElement)) {
                document.activeElement.blur();
            }
            modal.classList.remove("is-open");
            modal.setAttribute("aria-hidden", "true");
            lockBodyScroll(false);
        }
    });
}

function openRecipeModal(drinkName) {
    setupRecipeModal();

    const modal = document.getElementById(CFG.ELEMENTID_RECIPE_MODAL);
    const title = document.getElementById(CFG.ELEMENTID_RECIPE_TITLE);
    const img = document.getElementById(CFG.ELEMENTID_RECIPE_PHOOTO);
    const ul = document.getElementById(CFG.ELEMENTID_RECIPE_INGREDIENTS);
    const ol = document.getElementById(CFG.ELEMENTID_RECIPE_INSTRUCTIONS);
    const notes = document.getElementById(CFG.ELEMENTID_RECIPE_NOTES);
    const ingredients_title = document.getElementById(CFG.ELEMENTID_INGREDIENTS_TITLE);
    const instructions_title = document.getElementById(CFG.ELEMENTID_INSTRUCTIONS_TITLE);

    title.textContent = drinkName;
    const r = Recipes.get(drinkName);

    if (r) {
        if (r.photo) {
            img.src = r.photo;
            img.alt = drinkName;
            img.style.display = "";
        } else {
            img.removeAttribute("src");
            img.alt = "";
            img.style.display = "none";
        }

        const ings = Array.isArray(r.ingredients)
            ? r.ingredients
            : (r.ingredients ? String(r.ingredients).split(/\n+/) : []);

        const steps = Array.isArray(r.instructions)
            ? r.instructions
            : (r.instructions ? String(r.instructions).split(/\n+/) : []);

        ul.innerHTML = ings.map(i => `<li>${i}</li>`).join("");
        ol.innerHTML = steps.map(s => `<li>${s}</li>`).join("");

        ingredients_title.style.display = "";
        instructions_title.style.display = "";

        notes.textContent = r.notes || "";
        notes.style.display = r.notes ? "" : "none";

    } else {
        img.style.display = "none";
        ul.innerHTML = "";
        ol.innerHTML = "";
        ingredients_title.style.display = "none";
        instructions_title.style.display = "none";
        notes.textContent = CFG.STR_NO_RECIPE;
        notes.style.display = "";
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    lockBodyScroll(true);
}

/* ====== INVITE MODAL ====== */

function setupInviteModal() {
    const modal = document.getElementById(CFG.ELEMENTID_INVITE_MODAL);
    if (!modal || modal.__wired) return;
    modal.__wired = true;

    modal.addEventListener("click", (e) => {
        if (e.target.hasAttribute("data-close") || e.target === modal) {
            if (document.activeElement && modal.contains(document.activeElement)) {
                document.activeElement.blur();
            }
            modal.classList.remove("is-open");
            modal.setAttribute("aria-hidden", "true");
            lockBodyScroll(false);
        }
    });

    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("is-open")) {
            if (document.activeElement && modal.contains(document.activeElement)) {
                document.activeElement.blur();
            }
            modal.classList.remove("is-open");
            modal.setAttribute("aria-hidden", "true");
            lockBodyScroll(false);
        }
    });
}

async function openInviteModal(roundNumber, matchNumber) {
    setupInviteModal();

    const modal    = document.getElementById(CFG.ELEMENTID_INVITE_MODAL);
    const titleEl  = document.getElementById(CFG.ELEMENTID_INVITE_TITLE);
    const imgEl    = document.getElementById(CFG.ELEMENTID_INVITE_IMAGE);
    const fallback = document.getElementById(CFG.ELEMENTID_INVITE_FALLBACK);

    if (!modal || !imgEl) return;

    // Make sure invites are loaded (no-op if already done)
    await Invites.load();

    const invite = Invites.findByRoundMatch(roundNumber, matchNumber);

    // Title
    if (titleEl) {
        if (invite && invite.title) {
            titleEl.textContent = invite.title;
        } else {
            titleEl.textContent = ``;
        }
    }

    // If we don't have an invite or image, just show fallback text
    if (!invite || !invite.image) {
        imgEl.style.display = "none";
        if (fallback) fallback.style.display = "";
    } else {
        const src = invite.image;

        imgEl.onload = () => {
            imgEl.style.display = "";
            if (fallback) fallback.style.display = "none";
        };
        imgEl.onerror = () => {
            imgEl.style.display = "none";
            if (fallback) fallback.style.display = "";
        };

        imgEl.src = src;
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    lockBodyScroll(true);
}

/* ================= Bracket layout ================= */

window.__cards = new Map();

function placeRound(side, roundNumber, roundData, parentRoundData) {
    const column = document.querySelector(
        side === "left"
            ? `#left .round[data-round="${roundNumber}"] .matches`
            : side === "right"
                ? `#right .round[data-round="${roundNumber}"] .matches`
                : `#center .round[data-round="${roundNumber}"] .matches`
    );

    column.innerHTML = "";
    if (!roundData?.length) return;

    roundData.sort((a, b) => a.Match - b.Match);

    const parentSorted = (parentRoundData || []).slice().sort((a, b) => a.Match - b.Match);
    const parentMin = parentSorted.length
        ? Math.min(...parentSorted.map(p => p.Match))
        : null;

    const colTop = () => column.getBoundingClientRect().top;
    let maxBottom = 0;

    roundData.forEach((d, idx) => {
        let y;

        if (roundNumber === 1 || !parentSorted.length) {
            y = idx * (CARD_H + V_GAP);
        } else {
            const wi = withinIdx(d.Match, roundData);
            const pm1 = parentMin + (2 * wi - 2);
            const pm2 = parentMin + (2 * wi - 1);

            const p1 = window.__cards.get(`${roundNumber - 1}|${pm1}`);
            const p2 = window.__cards.get(`${roundNumber - 1}|${pm2}`);

            if (p1 && p2) {
                const r1 = p1.getBoundingClientRect();
                const r2 = p2.getBoundingClientRect();
                const midY = ((r1.top + r1.height / 2) + (r2.top + r2.height / 2)) / 2;
                y = midY - colTop() - CARD_H / 2;
            } else {
                y = idx * (CARD_H + V_GAP);
            }
        }

        /* WRAPPER */
        const wrapper = document.createElement("div");
        wrapper.className = "match-wrapper";
        wrapper.style.position = "absolute";
        wrapper.style.left = "0";
        wrapper.style.right = "0";
        wrapper.style.top = `${y}px`;

        // Apply icon placement=
        if (roundNumber === 1 && side === "left") {
            wrapper.classList.add("icon-left");
        } else if (roundNumber === 1 && side === "right") {
            wrapper.classList.add("icon-right");
        } else {
            wrapper.classList.add("icon-top");
        }

        /* CARD */
        const card = document.createElement("div");
        card.className = "match";

        const slot1 = document.createElement("div");
        slot1.className = "slot";
        slot1.innerHTML = `<span>${d.Drink1}</span>`;

        const slot2 = document.createElement("div");
        slot2.className = "slot";
        slot2.innerHTML = `<span>${d.Drink2}</span>`;

        if (d.Winner !== "TBD") {
            if (d.Winner === d.Drink1) slot1.classList.add("winner");
            if (d.Winner === d.Drink2) slot2.classList.add("winner");
        }

        if (d.Drink1 && d.Drink1 !== "TBD") {
            slot1.style.cursor = "pointer";
            slot1.title = "View recipe";
            slot1.addEventListener("click", () => openRecipeModal(d.Drink1));
        }
        if (d.Drink2 && d.Drink2 !== "TBD") {
            slot2.style.cursor = "pointer";
            slot2.title = "View recipe";
            slot2.addEventListener("click", () => openRecipeModal(d.Drink2));
        }

        /* INVITE ICON — only show if invite exists */
        let inviteBtn = null;
        const inviteData = Invites.findByRoundMatch(roundNumber, d.Match);

        if (inviteData) {
            inviteBtn = document.createElement("button");
            inviteBtn.type = "button";
            inviteBtn.className = "match-invite-btn";
            inviteBtn.title = "View Invitation";
            inviteBtn.innerHTML = "🎫";

            inviteBtn.addEventListener("click", (evt) => {
                evt.stopPropagation();
                openInviteModal(roundNumber, d.Match);
            });

            wrapper.append(inviteBtn);
        }

        /* BUILD DOM */
        card.append(slot1, slot2);
        wrapper.append(card);

        column.appendChild(wrapper);

        window.__cards.set(`${roundNumber}|${d.Match}`, card);

        const bottom = y + CARD_H;
        if (bottom > maxBottom) maxBottom = bottom;
    });

    column.style.minHeight = `${maxBottom + 20}px`;
}

/* ================= Links ================= */
function drawLinks(byRound) {
    const svg = document.getElementById("links");
    const shell = document.getElementById("bracket-shell");

    const shellRect = shell.getBoundingClientRect();
    svg.setAttribute("width", shellRect.width);
    svg.setAttribute("height", shellRect.height);
    svg.innerHTML = "";

    const svgRect = svg.getBoundingClientRect();
    const stroke = getComputedStyle(document.documentElement)
        .getPropertyValue("--line").trim() || "#2b3240";

    function connect(prevRound, prevMatch, curRound, curMatch) {
        const a = window.__cards.get(`${prevRound}|${prevMatch}`);
        const b = window.__cards.get(`${curRound}|${curMatch}`);
        if (!a || !b) return;

        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();

        const leftEl = ra.left <= rb.left ? a : b;
        const rightEl = ra.left <= rb.left ? b : a;

        const rl = leftEl.getBoundingClientRect();
        const rr = rightEl.getBoundingClientRect();

        const x1 = rl.right - svgRect.left;
        const y1 = rl.top + rl.height / 2 - svgRect.top;
        const x2 = rr.left - svgRect.left;
        const y2 = rr.top + rr.height / 2 - svgRect.top;

        const dx = Math.abs(x2 - x1);
        const c = dx * 0.45;

        const d = `M ${x1},${y1} C ${x1 + c},${y1} ${x2 - c},${y2} ${x2},${y2}`;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", stroke);
        path.setAttribute("stroke-width", "2");
        svg.appendChild(path);
    }

    for (let r = 2; r <= 5; r++) {
        const prev = (byRound.get(r - 1) || []).slice().sort((a, b) => a.Match - b.Match);
        const cur = (byRound.get(r) || []).slice().sort((a, b) => a.Match - b.Match);
        if (!prev.length || !cur.length) continue;

        const prevMin = Math.min(...prev.map(d => d.Match));
        cur.forEach(d => {
            const wi = withinIdx(d.Match, cur);
            const pm1 = prevMin + (2 * wi - 2);
            const pm2 = prevMin + (2 * wi - 1);
            connect(r - 1, pm1, r, d.Match);
            connect(r - 1, pm2, r, d.Match);
        });
    }
}

/* ================= Main ================= */
(async function init() {
    try {
        setupRecipeModal();
        setupInviteModal();
        document.getElementById("loading").style.display = "block";

        await Recipes.load();
        await Invites.load();

        const rows = await parseCsv(SHEET_URL);
        const data = rows.map(d => ({
        Round: +d.Round || 0,
        Match: +d.Match || 0,
        Drink1: defaultTbd(d.Drink1),
        Drink2: defaultTbd(d.Drink2),
        Winner: defaultTbd(d.Winner),
        }))

        const byRound = new Map();
        data.forEach(d => {
            if (!byRound.has(d.Round)) byRound.set(d.Round, []);
            byRound.get(d.Round).push(d);
        });

        const r1 = (byRound.get(1) || []).slice().sort((a, b) => a.Match - b.Match);
        const mid = Math.ceil(r1.length / 2);
        const r1Left = r1.slice(0, mid);
        const r1Right = r1.slice(mid);

        window.__cards = new Map();

        // LEFT
        placeRound("left", 1, r1Left, []);
        for (let r = 2; r <= 4; r++) {
            const cur = (byRound.get(r) || []).slice().sort((a, b) => a.Match - b.Match);
            const prev = (byRound.get(r - 1) || []).slice().sort((a, b) => a.Match - b.Match);
            const half = Math.ceil(cur.length / 2);
            placeRound("left", r, cur.slice(0, half), prev.slice(0, Math.ceil(prev.length / 2)));
        }

        // RIGHT
        placeRound("right", 1, r1Right, []);
        for (let r = 2; r <= 4; r++) {
            const cur = (byRound.get(r) || []).slice().sort((a, b) => a.Match - b.Match);
            const prev = (byRound.get(r - 1) || []).slice().sort((a, b) => a.Match - b.Match);
            const half = Math.ceil(cur.length / 2);
            placeRound("right", r, cur.slice(half), prev.slice(Math.ceil(prev.length / 2)));
        }

        // CENTER
        placeRound("center", 5, (byRound.get(5) || []), (byRound.get(4) || []));

        const redraw = () => {
            drawLinks(byRound);
            document.getElementById("loading").style.display = "none";
        };
        requestAnimationFrame(() =>
            requestAnimationFrame(redraw)
        );

        let rid;
        window.addEventListener("resize", () => {
            clearTimeout(rid);
            rid = setTimeout(() => {
                requestAnimationFrame(() =>
                    requestAnimationFrame(() => drawLinks(byRound))
                );
            }, 80);
        });

    } catch (e) {
        console.error(e);
        document.getElementById("loading").textContent = "Failed to load bracket.";
    }
})();
