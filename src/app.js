import * as CFG from "./config.js";

// --- Config (fallbacks ok for GH Pages)
const SHEET_URL = CFG.SHEET_URL;
const RECIPES_URL = CFG.RECIPES_URL ?? "./assets/data/recipes.json";

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
const CARD_H = 84;   // --card-h
const V_GAP = 16;   // --v-gap

function withinIdx(matchNum, arr) {
    const min = Math.min(...arr.map(d => d.Match));
    return matchNum - min + 1; // 1-based
}

/* ================= Recipe store + modal ================= */
const Recipes = {
    map: new Map(),
    async load(url = RECIPES_URL) {
        if (this.map.size) return this.map;
        try {
            const res = await fetch(url, { cache: "no-store" });
            const json = await res.json();
            Object.keys(json).forEach(name => this.map.set(name.toLowerCase(), json[name]));
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

// Create a simple modal if one wasn't added in HTML
function setupModal() {
    let modal = document.getElementById(CFG.ELEMENTID_RECIPE_MODAL);

    // Always (re)attach close handlers, even if modal came from HTML
    modal.addEventListener("click", (e) => {
        // close if clicking backdrop, the × button, or outside the panel
        if (e.target.hasAttribute("data-close") || e.target === modal) {
            // remove focus before hiding modal
            if (document.activeElement && modal.contains(document.activeElement)) {
                document.activeElement.blur();
            }

            modal.classList.remove("is-open");
            modal.setAttribute("aria-hidden", "true");
        }
    });

    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            // remove focus before hiding modal
            if (document.activeElement && modal.contains(document.activeElement)) {
                document.activeElement.blur();
            }
            modal.classList.remove("is-open");
            modal.setAttribute("aria-hidden", "true");
        }
    });
}


function openRecipeModal(drinkName) {
    setupModal();
    const modal = document.getElementById(CFG.ELEMENTID_RECIPE_MODAL);
    const title = document.getElementById(CFG.ELEMENTID_RECIPE_TITLE);
    const img = document.getElementById(CFG.ELEMENTID_RECIPE_PHOOTO);
    const ul = document.getElementById(CFG.ELEMENTID_RECIPE_INGREDIENTS);
    const ol = document.getElementById(CFG.ELEMENTID_RECIPE_INSTRUCTIONS);
    const ingredients_title = document.getElementById(CFG.ELEMENTID_INGREDIENTS_TITLE);
    const instructions_title = document.getElementById(CFG.ELEMENTID_INSTRUCTIONS_TITLE);
    const notes = document.getElementById(CFG.ELEMENTID_RECIPE_NOTES);

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
        const ings = Array.isArray(r.ingredients) ? r.ingredients : (r.ingredients ? String(r.ingredients).split(/\n+/) : []);
        const steps = Array.isArray(r.instructions) ? r.instructions : (r.instructions ? String(r.instructions).split(/\n+/) : []);
        ul.innerHTML = ings.map(i => `<li>${i}</li>`).join("");
        ol.innerHTML = steps.map(s => `<li>${s}</li>`).join("");
        notes.textContent = r.notes || "";
        notes.style.display = r.notes ? "" : "none";
    } else {
        img.removeAttribute("src");
        img.alt = "";
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
}

/* ================= Bracket layout ================= */

// We store the actual card elements for geometry lookups
// Key: `${round}|${match}`  →  HTMLElement
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
    const parentMin = parentSorted.length ? Math.min(...parentSorted.map(p => p.Match)) : null;

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

        const card = document.createElement("div");
        card.className = "match";
        card.style.top = `${y}px`;

        const slot1 = document.createElement("div");
        slot1.className = "slot";
        slot1.innerHTML = `<span>${d.Drink1}</span>`;

        const slot2 = document.createElement("div");
        slot2.className = "slot";
        slot2.innerHTML = `<span>${d.Drink2}</span>`;

        // highlight real winner only (never TBD)
        if (d.Winner !== "TBD") {
            if (d.Winner === d.Drink1) slot1.classList.add("winner");
            if (d.Winner === d.Drink2) slot2.classList.add("winner");
        }

        // Make slots clickable for recipes (ignore TBD)
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

        card.append(slot1, slot2);
        column.appendChild(card);

        // store
        window.__cards.set(`${roundNumber}|${d.Match}`, card);

        const bottom = y + CARD_H;
        if (bottom > maxBottom) maxBottom = bottom;
    });

    column.style.minHeight = `${maxBottom + 20}px`;
}

/* ================= Links (curves) ================= */
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

        // draw from leftmost to rightmost (works on both arms)
        const leftEl = ra.left <= rb.left ? a : b;
        const rightEl = ra.left <= rb.left ? b : a;

        const rl = leftEl.getBoundingClientRect();
        const rr = rightEl.getBoundingClientRect();

        const x1 = rl.right - svgRect.left;
        const y1 = rl.top + rl.height / 2 - svgRect.top;
        const x2 = rr.left - svgRect.left;
        const y2 = rr.top + rr.height / 2 - svgRect.top;

        const dx = Math.abs(x2 - x1);
        const c = dx * 0.45; // curve strength

        const d = `M ${x1},${y1} C ${x1 + c},${y1} ${x2 - c},${y2} ${x2},${y2}`;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", stroke);
        path.setAttribute("stroke-width", "2");
        svg.appendChild(path);
    }

    // R1→R2, R2→R3, R3→R4, R4→R5
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
        setupModal();
        document.getElementById("loading").style.display = "block";

        await Recipes.load();           // preload recipe map (safe if file missing)

        const rows = await parseCsv(SHEET_URL);
        const data = rows.map(d => ({
            Round: +d.Round || 0,
            Match: +d.Match || 0,
            Drink1: defaultTbd(d.Drink1),
            Drink2: defaultTbd(d.Drink2),
            Winner: defaultTbd(d.Winner),
        }));

        const byRound = new Map();
        data.forEach(d => {
            if (!byRound.has(d.Round)) byRound.set(d.Round, []);
            byRound.get(d.Round).push(d);
        });

        // Split R1 into arms
        const r1 = (byRound.get(1) || []).slice().sort((a, b) => a.Match - b.Match);
        const mid = Math.ceil(r1.length / 2);
        const r1Left = r1.slice(0, mid);
        const r1Right = r1.slice(mid);

        // Reset geometry registry
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

        // CENTER (Championship)
        placeRound("center", 5, (byRound.get(5) || []), (byRound.get(4) || []));

        // Draw links after layout settles
        const redraw = () => {
            drawLinks(byRound);
            document.getElementById("loading").style.display = "none";
        };
        requestAnimationFrame(() => requestAnimationFrame(redraw));

        // Keep lines aligned on resize
        let rid;
        window.addEventListener("resize", () => {
            clearTimeout(rid);
            rid = setTimeout(() => {
                requestAnimationFrame(() => requestAnimationFrame(() => drawLinks(byRound)));
            }, 80);
        });

    } catch (e) {
        console.error(e);
        document.getElementById("loading").textContent = "Failed to load bracket.";
    }
})();
