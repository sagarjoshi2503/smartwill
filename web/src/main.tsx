import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import ForwardLegacy from './App';
import { initAnalytics } from './utils/analytics';
import './index.css';

initAnalytics();

// <Analytics/>/<SpeedInsights/> fetch /_vercel/insights/script.js and
// /_vercel/speed-insights/script.js — routes that only exist on an actual
// Vercel deployment. This same build artifact also runs on AKS and local
// Docker (see web/CLAUDE.md), where those paths 404 and spam the console.
// Gated behind a build arg set only for the Vercel build, same pattern as
// VITE_GA_MEASUREMENT_ID gating Google Analytics below.
const onVercel = import.meta.env.VITE_ENABLE_VERCEL_ANALYTICS === 'true';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ForwardLegacy />
    {onVercel && <Analytics />}
    {onVercel && <SpeedInsights />}
  </React.StrictMode>
);
