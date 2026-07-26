import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import SmartWill from './App';
import { initAnalytics } from './utils/analytics';
import './index.css';

initAnalytics();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SmartWill />
    <Analytics />
    <SpeedInsights />
  </React.StrictMode>
);
