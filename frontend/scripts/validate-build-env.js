const value = process.env.EXPO_PUBLIC_API_URL;
let origin;
try { origin = new URL(value); } catch { /* Report a single configuration error below. */ }
if (!origin || origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) {
  console.error('Set EXPO_PUBLIC_API_URL to the HTTPS Render API origin, without /api, credentials, a query or a fragment.');
  process.exit(1);
}
console.log('Public API origin configuration validated.');
