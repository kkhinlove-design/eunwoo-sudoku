'use client';

import { useState, useEffect } from 'react';

interface TimerProps {
  running: boolean;
  onTick?: (seconds: number) => void;
}

export default function Timer({ running, onTick }: TimerProps) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setSeconds(prev => {
        const next = prev + 1;
        onTick?.(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, onTick]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="flex items-center gap-2 text-lg font-bold text-purple-600">
      <span>&#9201;</span>
      <span>{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
    </div>
  );
}
