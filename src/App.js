import './App.css';
import { useEffect, useState } from 'react';

const RATE_LIMIT = 5;
const WINDOW_MS = 10_000;

function getClientKey() {
  const storageKey = 'rate-limiter-demo-client-key';
  let key = window.localStorage.getItem(storageKey);
  if (!key) {
    // Persist an anonymous identifier so refreshes count against the same demo quota.
    key = window.crypto?.randomUUID?.() || `client-${Date.now()}-${Math.random()}`;
    window.localStorage.setItem(storageKey, key);
  }
  return key;
}

function App() {
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [clientKey] = useState(getClientKey);
  const usage = Math.min((requests.length / RATE_LIMIT) * 100, 100);
  const zone = isRateLimited ? 'blocked' : usage >= 80 ? 'warning' : 'safe';
  const zoneStyles = {
    safe: { label: 'Operating normally', detail: 'Requests are within the limit', text: 'text-teal-700', dot: 'bg-teal-600', badge: 'border-teal-200 bg-teal-50 text-teal-800', bar: 'bg-teal-600' },
    warning: { label: 'Approaching the limit', detail: '80% of this window is used', text: 'text-amber-700', dot: 'bg-amber-500', badge: 'border-amber-200 bg-amber-50 text-amber-800', bar: 'bg-amber-500' },
    blocked: { label: 'Rate limited', detail: 'HTTP 429 · Further requests are blocked', text: 'text-red-700', dot: 'bg-red-600', badge: 'border-red-200 bg-red-50 text-red-800', bar: 'bg-red-600' },
  };
  const activeZone = zoneStyles[zone];

  useEffect(() => {
    // Keep the display in sync as client-side timestamps age out of the window.
    const removeExpiredRequests = () => {
      const now = Date.now();
      setRequests((current) => current.filter((timestamp) => now - timestamp < WINDOW_MS));
    };
    const interval = window.setInterval(removeExpiredRequests, 250);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    // Restore the normal status as soon as a request slot becomes available.
    if (isRateLimited && requests.length < RATE_LIMIT) {
      setIsRateLimited(false);
      setMessage('A request slot is available again.');
    }
  }, [isRateLimited, requests.length]);

  const sendRequest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test', { headers: { 'x-api-key': clientKey } });
      const data = await response.json().catch(() => ({}));
      setIsRateLimited(response.status === 429);
      // Only successful API calls consume a slot in the client-side visualisation.
      if (response.ok) setRequests((current) => [...current, Date.now()]);
      setMessage(data.message || (response.status === 429 ? 'HTTP 429 Too Many Requests' : 'Request completed'));
    } catch (error) {
      setMessage('Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-800">
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <nav className="flex items-center justify-between border-b border-stone-300 pb-5">
          <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-stone-800 text-stone-100"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 16c2-5 4-8 7-8s4 3 5 5 2 3 4 3" /><path d="M4 20h16" /></svg></div><span className="text-base font-semibold tracking-tight">FlowGuard</span></div>
          <span className="text-xs text-stone-500">Local environment</span>
        </nav>
        <section className="py-12 sm:py-16"><div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-end"><h1 className="text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">Rate Limiter</h1><div className={`inline-flex shrink-0 items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs font-medium sm:self-auto ${activeZone.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${activeZone.dot}`} />{activeZone.label}</div></div></section>
        <section className="overflow-hidden rounded-2xl border border-stone-300 bg-[#fffdfa] shadow-[0_12px_35px_rgba(68,58,45,0.07)]">
          <div className="flex flex-col gap-5 border-b border-stone-200 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8"><div><div className="flex items-center gap-2"><span className="rounded bg-sky-100 px-2 py-1 font-mono text-[11px] font-semibold text-sky-800">GET</span><code className="text-sm text-stone-700">/api/test</code></div><p className="mt-2 text-sm text-stone-500">Local API test endpoint</p></div><button onClick={sendRequest} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Sending…' : 'Send request'}<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button></div>
          <div className="grid border-b border-stone-200 sm:grid-cols-3"><Metric label="Requests in window" value={requests.length} note={`${usage}% of 10-second allowance`} /><Metric label="Rate limit" value={<>5 <span className="text-base font-normal text-stone-400">per 10 seconds</span></>} note="Configured threshold" /><div className="border-stone-200 px-6 py-6 sm:border-l sm:px-8"><p className="text-xs font-medium uppercase tracking-wide text-stone-500">Current status</p><div className={`mt-3 flex items-center gap-2 text-lg font-semibold ${activeZone.text}`}><span className={`h-2 w-2 rounded-full ${activeZone.dot}`} />{activeZone.label}</div><p className="mt-2 text-sm text-stone-500">{activeZone.detail}</p></div></div>
          <div className="px-6 py-6 sm:px-8"><div className="mb-2 flex items-center justify-between text-sm"><span className="text-stone-600">Window usage</span><span className={`font-medium ${activeZone.text}`}>{usage}%</span></div><div className="h-2 rounded-full bg-stone-200"><div className={`h-2 rounded-full transition-all duration-500 ${activeZone.bar}`} style={{ width: `${usage}%` }} /></div></div>
          <div className="border-t border-stone-200 bg-stone-50 px-6 py-5 sm:px-8"><div className="mb-2 flex items-center justify-between"><span className="text-sm font-medium text-stone-700">Latest response</span><span className="font-mono text-[11px] uppercase tracking-wider text-stone-400">Live</span></div><div className="min-h-6 font-mono text-sm">{message ? <span className={message.includes('Could not') || isRateLimited ? 'text-red-700' : activeZone.text}>{message}</span> : <span className="text-stone-400">Awaiting your first request</span>}</div></div>
        </section>
        <footer className="mt-7 flex justify-between text-xs text-stone-500"><span>FlowGuard · Rate limit monitor</span><span>localhost:5000</span></footer>
      </main>
    </div>
  );
}

function Metric({ label, value, note }) {
  return <div className="border-b border-stone-200 px-6 py-6 last:border-b-0 sm:border-b-0 sm:border-r sm:px-8"><p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">{value}</p><p className="mt-2 text-sm text-stone-500">{note}</p></div>;
}

export default App;
