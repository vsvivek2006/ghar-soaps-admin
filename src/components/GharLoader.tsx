'use client';

import React, { useState, useEffect } from 'react';

const SOAP_QUOTES = [
  'Scenting fresh batches of saffron & sandalwood...',
  'Lathering up the organic cold-pressed coconut milk...',
  'Curing ayurvedic bars with pure magic & zero nasties...',
  'Polishing the golden glow for your skin...',
  'Handcrafting chemical-free bubbles for a silky bath...',
  'Infusing fresh botanical essences & essential oils...',
  'Gathering pure goat milk & wild honey extracts...',
  'Filtering out harsh synthetic chemicals...',
  'Giving the handmade bars a warm herbal hug...',
  'Almost ready with pure artisan freshness...',
];

interface GharLoaderProps {
  fullscreen?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  customTitle?: string;
}

export const GharLoader: React.FC<GharLoaderProps> = ({
  fullscreen = false,
  className = '',
  size = 'md',
  customTitle,
}) => {
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % SOAP_QUOTES.length);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  const bubbleSizeClass =
    size === 'sm'
      ? 'w-2.5 h-2.5'
      : size === 'lg'
      ? 'w-4 h-4'
      : 'w-3.5 h-3.5';

  const content = (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      {/* 4 BUBBLES - TRANSFORM WAVE FROM LEFT TO RIGHT */}
      <div className="flex items-center gap-3.5 py-4">
        {/* Bubble 1: Golden Amber */}
        <div
          className={`${bubbleSizeClass} rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 shadow-md shadow-amber-500/30 animate-bubble-1`}
        />
        {/* Bubble 2: Saffron Glow */}
        <div
          className={`${bubbleSizeClass} rounded-full bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-400 shadow-md shadow-orange-500/30 animate-bubble-2`}
        />
        {/* Bubble 3: Warm Sandalwood */}
        <div
          className={`${bubbleSizeClass} rounded-full bg-gradient-to-tr from-amber-700 via-amber-600 to-yellow-400 shadow-md shadow-amber-600/30 animate-bubble-3`}
        />
        {/* Bubble 4: Pure Herbal Emerald */}
        <div
          className={`${bubbleSizeClass} rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-300 shadow-md shadow-emerald-500/30 animate-bubble-4`}
        />
      </div>

      {/* Rotating Zomato-Style Witty Lines */}
      <div className="space-y-1.5 max-w-sm px-4">
        {customTitle && (
          <div className="text-[11px] font-bold uppercase tracking-widest text-amber-900/70">
            {customTitle}
          </div>
        )}
        <p
          key={quoteIndex}
          className="text-xs sm:text-sm font-semibold text-neutral-700 animate-quote-fade min-h-[22px]"
        >
          {SOAP_QUOTES[quoteIndex]}
        </p>
        <div className="flex items-center justify-center gap-1.5 text-[10px] font-medium text-neutral-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Ghar Soaps 100% Pure & Handmade</span>
        </div>
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="min-h-screen w-full bg-[#fbfbfd]/90 backdrop-blur-xl flex items-center justify-center p-4 fixed inset-0 z-50">
        <div className="p-8 rounded-3xl bg-white/80 border border-neutral-200/60 shadow-xl max-w-md w-full">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
