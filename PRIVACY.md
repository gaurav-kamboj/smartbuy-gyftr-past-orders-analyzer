# Privacy Policy — Gyftr Past Orders Analyzer

**Short version:** This extension does not collect, transmit, or sell any personal data. All processing happens locally in your browser, and data never leaves your device except for requests made directly to `gyftr.com` to fetch your own order history.

## What the extension does
- Runs only on: `https://www.gyftr.com/instantvouchers/mytransactions`.
- Reads the page's own API response for your past orders, or calls the same endpoint with your existing session (cookies) using `fetch`.
- Computes totals for the current month and last 365 days and shows the results in a local popup UI.
- Optional: lets you export a CSV file locally.

## Data handling
- **Data accessed:** Order history payload returned by `gyftr.com` (which may include your email/phone as part of the API response) and non-HttpOnly cookies only as needed to make the same API request the page makes.
- **Data storage:** No persistent storage of personal data. The extension does not store your data beyond the current page session.
- **Data transmission:** No data is sent to any third-party server. Requests are made only to `gyftr.com` to fetch your own data.
- **No analytics, no ads, no tracking.**

## Permissions
- **host_permissions:** Limited to `https://www.gyftr.com/*` so the extension can read the transactions page and its API response.
- **activeTab/scripting:** Used to inject the in-page script on the transactions page only.

## Contact
For questions or issues, please open a GitHub issue or email the developer.