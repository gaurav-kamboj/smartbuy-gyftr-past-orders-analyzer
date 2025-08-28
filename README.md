# Gyftr Past Orders Analyzer (Chrome Extension)

Analyze your Gyftr HDFC SmartBuy past orders directly on the
`https://www.gyftr.com/instantvouchers/mytransactions` page.

## What it does

- Fetches `userpastorders` (the same call the page makes).
- Considers only **status `C` (Complete)** orders.
- Computes **Current Month (IST)** and **Last 365 Days (IST)** totals.
- Groups by voucher **brand_name** (e.g., "Amazon", "Myntra", "Amazon Shopping Voucher").
- Shows both **Total Face Value** (`face_value × quantity`) and **Total Cash Paid** (`cash`).
- Lets you **Export CSV** with both scopes.

Everything runs in your browser; nothing is sent to any third-party server.

> Note: The extension tries to capture the page's own API response. It can also make
> a direct fetch using cookies if available. You must be logged in for it to work.

## Install (Developer Mode)

1. Download and unzip this folder.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked** and choose the unzipped folder.
5. Visit `https://www.gyftr.com/instantvouchers/mytransactions` (log in if needed).
6. Click the floating **“Analyze Gyftr Orders”** button.

## Security note

- The code does **not** store your SmartBuy tokens anywhere; it only reads them
  transiently if required to make the call. All computation stays local.
- Never share your tokens or cookies in public.