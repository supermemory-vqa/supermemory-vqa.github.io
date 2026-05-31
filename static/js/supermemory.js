/* SuperMemory-VQA project page interactions:
   1. reveal-on-scroll + count-up animations
   2. interactive (filter / search / sortable) benchmarking leaderboard */

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ----- Reveal on scroll -----
   Enable the hidden/animated state only now that JS is confirmed running. If
   anything below fails, content stays visible because `.js-reveal` is absent. */
const revealEls = document.querySelectorAll(".reveal");

function revealAll() {
  revealEls.forEach(el => el.classList.add("is-visible"));
}

if (!("IntersectionObserver" in window) || reducedMotion) {
  document.documentElement.classList.add("js-reveal");
  revealAll();
} else {
  document.documentElement.classList.add("js-reveal");
  const revealObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -6% 0px" }
  );
  revealEls.forEach(el => revealObserver.observe(el));
  // Safety net: if the observer never fires (e.g. odd layout/rendering), make
  // sure nothing stays hidden.
  window.addEventListener("load", () => {
    setTimeout(revealAll, 1200);
  });
}

/* ----- Count-up stats ----- */
function formatCount(value, decimals) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function animateCount(element) {
  const target = Number(element.dataset.count);
  const decimals = Number(element.dataset.decimals || 0);
  const duration = 900;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = formatCount(target * eased, decimals);
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      element.textContent = formatCount(target, decimals);
    }
  }
  requestAnimationFrame(step);
}

const statObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        statObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.45 }
);

document.querySelectorAll(".stat-value").forEach(stat => {
  if (reducedMotion) {
    stat.textContent = formatCount(Number(stat.dataset.count), Number(stat.dataset.decimals || 0));
  } else {
    statObserver.observe(stat);
  }
});

/* ----- Leaderboard ----- */
(() => {
  const DATA = [
    // Open-source models
    { category: "open", model: "Qwen-3-VL 8B", vr_ans: 75.0, vr_acc: 41.8, vr_mrr: 63.8, eb_ans: 44.5, eb_acc: 38.8, eb_mrr: 61.0 },
    { category: "open", model: "Qwen-3-VL 30B", vr_ans: 56.6, vr_acc: 45.5, vr_mrr: 65.7, eb_ans: 44.2, eb_acc: 39.1, eb_mrr: 61.8 },
    { category: "open", model: "InternVL-3.5 8B", vr_ans: 81.7, vr_acc: 41.0, vr_mrr: 63.3, eb_ans: 61.4, eb_acc: 39.8, eb_mrr: 61.8 },
    { category: "open", model: "InternVL-3.5 30B", vr_ans: 77.7, vr_acc: 42.3, vr_mrr: 63.7, eb_ans: 28.5, eb_acc: 27.3, eb_mrr: 53.4 },
    { category: "open", model: "Gemma-4-E4B IT", vr_ans: 40.3, vr_acc: 35.3, vr_mrr: 58.2, eb_ans: 30.9, eb_acc: 36.4, eb_mrr: 58.2 },
    { category: "open", model: "Gemma-4 31B", vr_ans: 67.2, vr_acc: 45.6, vr_mrr: 65.5, eb_ans: 43.9, eb_acc: 41.5, eb_mrr: 62.2 },
    // Closed-source models
    { category: "closed", model: "Gemini-3-Flash", vr_ans: 83.9, vr_acc: 61.0, vr_mrr: 76.0, eb_ans: 71.2, eb_acc: 54.1, eb_mrr: 71.6 },
    { category: "closed", model: "Gemini-3.1-Pro", vr_ans: 67.4, vr_acc: 53.2, vr_mrr: 70.7, eb_ans: 43.5, eb_acc: 42.6, eb_mrr: 64.2 },
    { category: "closed", model: "GPT-5.4-mini", vr_ans: 77.6, vr_acc: 47.8, vr_mrr: 67.4, eb_ans: 75.0, eb_acc: 46.0, eb_mrr: 66.1 },
    { category: "closed", model: "GPT-5.4", vr_ans: 78.3, vr_acc: 52.3, vr_mrr: 69.5, eb_ans: 71.7, eb_acc: 48.0, eb_mrr: 67.2 }
  ];

  const METRIC_KEYS = ["vr_ans", "vr_acc", "vr_mrr", "eb_ans", "eb_acc", "eb_mrr"];

  const state = { filter: "all", query: "", sortKey: "vr_acc", sortDir: "desc" };
  let tableBody, searchInput, filterBtns, ths;

  const colMax = {};
  METRIC_KEYS.forEach(k => {
    colMax[k] = Math.max(...DATA.map(r => r[k]));
  });

  function computeRanks() {
    const tmp = [...DATA].sort((a, b) => b.vr_acc - a.vr_acc);
    tmp.forEach((r, i) => { r.__rank = i + 1; });
  }

  function getFiltered() {
    const q = state.query.trim().toLowerCase();
    return DATA.filter(row => {
      const okFilter = state.filter === "all" || row.category === state.filter;
      const okQuery = !q || row.model.toLowerCase().includes(q);
      return okFilter && okQuery;
    });
  }

  function sortRows(rows) {
    const dir = state.sortDir === "asc" ? 1 : -1;
    return rows.sort((a, b) => {
      if (state.sortKey === "model") return dir * a.model.localeCompare(b.model);
      return dir * (a[state.sortKey] - b[state.sortKey]);
    });
  }

  function rankClass(r) {
    if (r === 1) return "rank rank-1";
    if (r === 2) return "rank rank-2";
    if (r === 3) return "rank rank-3";
    return "rank rank-other";
  }

  function fmt(x) {
    return Number.isFinite(x) ? x.toFixed(1) : "\u2014";
  }

  function tagFor(category) {
    return category === "closed"
      ? '<span class="tag dark">Closed-source</span>'
      : '<span class="tag">Open-source</span>';
  }

  function render() {
    if (!tableBody) return;
    const sorted = sortRows([...getFiltered()]);

    if (!sorted.length) {
      tableBody.innerHTML = `<tr><td colspan="7" style="padding:24px;color:var(--muted);">No results</td></tr>`;
      return;
    }

    tableBody.innerHTML = sorted.map(r => `
      <tr>
        <td class="model-cell">
          <div class="model-inline">
            <span class="${rankClass(r.__rank)}">${r.__rank}</span>
            <span>
              <span class="model-name">${r.model}</span>
              <span class="model-tags">${tagFor(r.category)}</span>
            </span>
          </div>
        </td>
        <td class="metric-group${r.vr_ans === colMax.vr_ans ? " best" : ""}">${fmt(r.vr_ans)}</td>
        <td class="${r.vr_acc === colMax.vr_acc ? "best" : ""}">${fmt(r.vr_acc)}</td>
        <td class="${r.vr_mrr === colMax.vr_mrr ? "best" : ""}">${fmt(r.vr_mrr)}</td>
        <td class="metric-group${r.eb_ans === colMax.eb_ans ? " best" : ""}">${fmt(r.eb_ans)}</td>
        <td class="${r.eb_acc === colMax.eb_acc ? "best" : ""}">${fmt(r.eb_acc)}</td>
        <td class="${r.eb_mrr === colMax.eb_mrr ? "best" : ""}">${fmt(r.eb_mrr)}</td>
      </tr>
    `).join("");
  }

  function setSortHeaderUI() {
    if (!ths) return;
    ths.forEach(th => th.classList.remove("sort-asc", "sort-desc"));
    const active = ths.find(th => th.dataset.sort === state.sortKey);
    if (active) active.classList.add(state.sortDir === "asc" ? "sort-asc" : "sort-desc");
  }

  function bind() {
    filterBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        filterBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.filter = btn.dataset.filter || "all";
        render();
      });
    });

    if (searchInput) {
      searchInput.addEventListener("input", e => {
        state.query = e.target.value || "";
        render();
      });
    }

    ths.forEach(th => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (!key) return;
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        } else {
          state.sortKey = key;
          state.sortDir = key === "model" ? "asc" : "desc";
        }
        setSortHeaderUI();
        render();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    computeRanks();
    tableBody = document.getElementById("tableBody");
    searchInput = document.getElementById("searchInput");
    filterBtns = Array.from(document.querySelectorAll(".filter-btn"));
    ths = Array.from(document.querySelectorAll("th.sortable"));
    bind();
    setSortHeaderUI();
    render();
  });
})();
