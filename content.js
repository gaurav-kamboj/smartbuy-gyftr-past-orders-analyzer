// content.js
(function() {
  const ID_PREFIX = "gyftr-analyzer";
  let cachedPayload = null;

  // Inject inpage.js so it runs in the page context (not the isolated content script world)
  function injectInpage() {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('inpage.js');
    s.onload = () => s.remove();
    (document.head || document.documentElement).appendChild(s);
  }

  // Floating UI
  function ensureButton() {
    if (document.getElementById(`${ID_PREFIX}-btn`)) return;
    const btn = document.createElement('button');
    btn.id = `${ID_PREFIX}-btn`;
    btn.textContent = "Analyze Gyftr Orders";
    btn.title = "Analyze current month & last 1 year (IST), grouped by voucher name (status: C only)";
    btn.addEventListener('click', () => {
      if (cachedPayload) {
        renderModal(cachedPayload);
      } else {
        // Ask inpage to fetch; if the page already fetched, our hook may deliver it too.
        window.postMessage({ type: 'GYFTR_FETCH_PAST_ORDERS' }, '*');
        toast("Fetching past orders… If nothing shows, refresh the page.");
      }
    });
    document.body.appendChild(btn);
  }

  function toast(msg, timeout=2500) {
    const el = document.createElement('div');
    el.className = `${ID_PREFIX}-toast`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); }, timeout);
  }

  // Listen for data from inpage.js
  window.addEventListener('message', (ev) => {
    if (ev.source !== window) return;
    const d = ev.data || {};
    if (d.type === 'GYFTR_PAST_ORDERS' || d.type === 'GYFTR_PAST_ORDERS_CAPTURED') {
      if (!d.payload || !d.payload.data) {
        toast("No orders found or not logged in.");
        return;
      }
      cachedPayload = d.payload;
      renderModal(cachedPayload);
    }
  }, false);

  function formatINR(n) {
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
    } catch {
      return `₹${(Math.round(n*100)/100).toLocaleString('en-IN')}`;
    }
  }

  function toISTDate(date) {
    // Convert a UTC Date to an IST "wall clock" Date via timezone formatting
    const s = date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    return new Date(s);
  }

  function isStatusComplete(item) {
    return (item.order_status || "").toUpperCase() === "C";
  }

  function analyze(payload) {
    const rows = Array.isArray(payload?.data) ? payload.data : [];
    const nowIST = toISTDate(new Date());
    const thisMonthIST = nowIST.getMonth();
    const thisYearIST  = nowIST.getFullYear();

    const yearAgoIST = new Date(toISTDate(new Date()));
    yearAgoIST.setFullYear(yearAgoIST.getFullYear() - 1);

    const monthAgg = new Map(); // brand -> agg
    const yearAgg  = new Map();

    let monthTotals = { orders: 0, qty: 0, face: 0, cash: 0 };
    let yearTotals  = { orders: 0, qty: 0, face: 0, cash: 0 };

    for (const it of rows) {
      if (!isStatusComplete(it)) continue;

      const dUTC = new Date(it.order_on);
      if (isNaN(dUTC)) continue;
      const dIST = toISTDate(dUTC);

      const brand = (it.brand_name || "Unknown").trim();
      const qty = Number(it.quantity || 0);
      const face = Number(it.face_value || 0) * qty;
      const cash = Number(it.cash || 0);

      // Current month (IST)
      if (dIST.getFullYear() === thisYearIST && dIST.getMonth() === thisMonthIST) {
        const prev = monthAgg.get(brand) || { orders: 0, qty: 0, face: 0, cash: 0 };
        prev.orders += 1;
        prev.qty    += qty;
        prev.face   += face;
        prev.cash   += cash;
        monthAgg.set(brand, prev);
        monthTotals.orders += 1;
        monthTotals.qty    += qty;
        monthTotals.face   += face;
        monthTotals.cash   += cash;
      }

      // Last 365 days (IST)
      if (dIST >= yearAgoIST && dIST <= nowIST) {
        const prevY = yearAgg.get(brand) || { orders: 0, qty: 0, face: 0, cash: 0 };
        prevY.orders += 1;
        prevY.qty    += qty;
        prevY.face   += face;
        prevY.cash   += cash;
        yearAgg.set(brand, prevY);
        yearTotals.orders += 1;
        yearTotals.qty    += qty;
        yearTotals.face   += face;
        yearTotals.cash   += cash;
      }
    }

    // Convert to arrays & sort by face value desc
    const monthRows = Array.from(monthAgg, ([brand, v]) => ({ brand, ...v }))
      .sort((a,b) => b.face - a.face);
    const yearRows = Array.from(yearAgg, ([brand, v]) => ({ brand, ...v }))
      .sort((a,b) => b.face - a.face);

    return { monthRows, yearRows, monthTotals, yearTotals, nowIST };
  }

  function tableHTML(title, rows, totals) {
    const th = `<thead>
      <tr>
        <th style="text-align:left">Voucher (brand_name)</th>
        <th>Orders</th>
        <th>Qty</th>
        <th>Total Face Value</th>
        <th>Total Cash Paid</th>
      </tr>
    </thead>`;

    const tb = rows.map(r => `<tr>
        <td style="text-align:left">${escapeHtml(r.brand)}</td>
        <td>${r.orders}</td>
        <td>${r.qty}</td>
        <td>${formatINR(r.face)}</td>
        <td>${formatINR(r.cash)}</td>
    </tr>`).join("");

    const tf = `<tfoot><tr class="total">
        <td>Total</td>
        <td>${totals.orders}</td>
        <td>${totals.qty}</td>
        <td>${formatINR(totals.face)}</td>
        <td>${formatINR(totals.cash)}</td>
    </tr></tfoot>`;

    return `<section class="${ID_PREFIX}-section">
      <h3>${escapeHtml(title)}</h3>
      <div class="${ID_PREFIX}-tablewrap">
        <table class="${ID_PREFIX}-table">${th}<tbody>${tb || '<tr><td colspan="5">No data</td></tr>'}</tbody>${tf}</table>
      </div>
    </section>`;
  }

  function escapeHtml(s) {
    return (s ?? "").toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function exportCSV(analysis) {
    function toCSV(rows, label) {
      const header = ["Scope", "Brand", "Orders", "Qty", "TotalFaceValue", "TotalCashPaid"];
      const lines = [header.join(",")];
      for (const r of rows) {
        lines.push([label, r.brand, r.orders, r.qty, r.face, r.cash].join(","));
      }
      return lines.join("\n");
    }
    const m = toCSV(analysis.monthRows, "CurrentMonthIST");
    const y = toCSV(analysis.yearRows, "Last365DaysIST");
    const content = m + "\n" + y;
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "gyftr-past-orders-analysis.csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  function renderModal(payload) {
    const analysis = analyze(payload);

    // Modal shell
    let modal = document.getElementById(`${ID_PREFIX}-modal`);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = `${ID_PREFIX}-modal`;
      modal.innerHTML = `<div class="${ID_PREFIX}-backdrop"></div>
      <div class="${ID_PREFIX}-dialog" role="dialog" aria-modal="true" aria-label="Gyftr Analyzer">
        <header class="${ID_PREFIX}-header">
          <h2>Gyftr Past Orders — Analysis</h2>
          <div class="${ID_PREFIX}-spacer"></div>
          <button id="${ID_PREFIX}-refresh" class="${ID_PREFIX}-btnsmall">Refetch</button>
          <button id="${ID_PREFIX}-export" class="${ID_PREFIX}-btnsmall">Export CSV</button>
          <button id="${ID_PREFIX}-close" class="${ID_PREFIX}-btnsmall" aria-label="Close">✕</button>
        </header>
        <div class="${ID_PREFIX}-content"></div>
      </div>`;
      document.body.appendChild(modal);

      modal.querySelector(`#${ID_PREFIX}-close`).addEventListener('click', () => modal.remove());
      modal.querySelector(`.${ID_PREFIX}-backdrop`).addEventListener('click', () => modal.remove());
      modal.querySelector(`#${ID_PREFIX}-export`).addEventListener('click', () => exportCSV(analysis));
      modal.querySelector(`#${ID_PREFIX}-refresh`).addEventListener('click', () => {
        cachedPayload = null;
        window.postMessage({ type: 'GYFTR_FETCH_PAST_ORDERS' }, '*');
        toast("Refetching…");
      });
    }

    const content = modal.querySelector(`.${ID_PREFIX}-content`);

    const monthStr = analysis.nowIST.toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'long' });
    const htmlMonth = tableHTML(`Current Month (IST) — ${monthStr}`, analysis.monthRows, analysis.monthTotals);
    const htmlYear  = tableHTML(`Last 365 Days (IST)`, analysis.yearRows, analysis.yearTotals);

    content.innerHTML = `
      <p class="${ID_PREFIX}-note">Status considered: <b>C (Complete)</b> only. Timezone: <b>Asia/Kolkata (IST)</b>. Values aggregate <code>face_value × quantity</code> and <code>cash</code> as reported by the API.</p>
      ${htmlMonth}
      ${htmlYear}
      <p class="${ID_PREFIX}-foot">Tip: Names like “Amazon” vs “Amazon Shopping Voucher” are reported as-is by Gyftr and are kept separate.</p>
    `;
  }

  // Kick off
  injectInpage();
  ensureButton();
})();