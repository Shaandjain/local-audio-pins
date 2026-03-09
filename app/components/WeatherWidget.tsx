'use client';

import { useState, useEffect, useRef } from 'react';

interface WeatherWidgetProps {
  locationName?: string | null;
}

interface WeatherData {
  temp: number;
  windSpeed: number;
  description: string;
}

export default function WeatherWidget({ locationName }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Simulate weather data (in a real app, this would call a weather API)
  useEffect(() => {
    // Generate plausible weather based on time of day
    const hour = new Date().getHours();
    const baseTemp = hour >= 6 && hour <= 18 ? 22 : 15;
    const variation = Math.random() * 8 - 4;
    const temp = Math.round(baseTemp + variation);
    const windSpeed = Math.round(5 + Math.random() * 15);

    const descriptions = ['Clear sky', 'Partly cloudy', 'Sunny', 'Light breeze', 'Fair'];
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];

    setWeather({ temp, windSpeed, description });
  }, [locationName]);

  // Draw warm gradient gauge arc
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !weather) return;

    const ratio = window.devicePixelRatio || 1;
    const size = 80;
    canvas.width = size * ratio;
    canvas.height = size * ratio;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const cx = size / 2;
    const cy = size / 2;
    const radius = 32;
    const startAngle = 0.75 * Math.PI;
    const endAngle = 2.25 * Math.PI;

    // Background arc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Temperature progress (0-40 range mapped to arc)
    const tempNormalized = Math.max(0, Math.min(1, weather.temp / 40));
    const progressAngle = startAngle + (endAngle - startAngle) * tempNormalized;

    // Warm gradient (yellow to orange)
    const gradient = ctx.createLinearGradient(0, size, size, 0);
    gradient.addColorStop(0, '#facc15');
    gradient.addColorStop(0.5, '#f59e0b');
    gradient.addColorStop(1, '#ef4444');

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, progressAngle);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();
  }, [weather]);

  if (!weather) return null;

  return (
    <div
      className="glass-card p-4"
      style={{ width: '180px' }}
    >
      <span className="section-label">Weather</span>

      <div className="flex items-center gap-2 mt-3">
        {/* Gauge */}
        <div className="relative flex-shrink-0">
          <canvas ref={canvasRef} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-heading text-2xl text-foreground">{weather.temp}</span>
            <span className="text-xs text-muted ml-0.5 mt-1">C</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted truncate">{weather.description}</p>

          {/* Wind */}
          <div className="flex items-center gap-1.5 mt-2">
            <svg className="w-3.5 h-3.5 text-muted-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v.01M16.5 9a4.5 4.5 0 10-9 0M3.75 13.5h16.5M5.25 16.5h13.5M6.75 19.5h10.5" />
            </svg>
            <span className="text-xs font-mono text-muted-light">{weather.windSpeed} km/h</span>
          </div>
        </div>
      </div>
    </div>
  );
}
