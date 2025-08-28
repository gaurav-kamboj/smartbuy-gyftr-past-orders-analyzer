// inpage.js (runs in page context)
(function() {
  const API = 'https://www.gyftr.com/smartbuyapi/hdfc/api/v1/order/userpastorders';

  // Helper to read non-HttpOnly cookies (best-effort)
  function readCookie(name) {
    const match = document.cookie.match(new RegExp('(^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  // Capture the page's own call to the API (no tokens needed in our code)
  const origFetch = window.fetch;
  window.fetch = async function(input, init) {
    const url = (typeof input === 'string') ? input : (input && input.url) || '';
    const res = await origFetch.apply(this, arguments);
    try {
      if (url.includes('/smartbuyapi/hdfc/api/v1/order/userpastorders')) {
        const clone = res.clone();
        clone.json().then(data => {
          window.postMessage({ type: 'GYFTR_PAST_ORDERS_CAPTURED', payload: data }, '*');
        }).catch(() => {});
      }
    } catch(e) {}
    return res;
  };

  // On demand fetch (uses cookies if accessible; otherwise relies on page capture)
  window.addEventListener('message', async (ev) => {
    const d = ev.data || {};
    if (d.type !== 'GYFTR_FETCH_PAST_ORDERS') return;

    try {
      const user_id = readCookie('smartbuy_token') || readCookie('smartbuy_user') || "";
      const txn_token = readCookie('smartbuy_txn_token') || "";

      const headers = {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      };
      if (user_id) headers['user_id'] = user_id;

      const body = JSON.stringify({ user_id, txn_token });

      const resp = await fetch(API, {
        method: 'POST',
        headers,
        body,
        credentials: 'include',
        cache: 'no-cache',
        mode: 'cors'
      });

      const json = await resp.json();
      window.postMessage({ type: 'GYFTR_PAST_ORDERS', payload: json }, '*');
    } catch (e) {
      window.postMessage({ type: 'GYFTR_PAST_ORDERS', payload: { code: 500, error: String(e), data: [] } }, '*');
    }
  }, false);
})();