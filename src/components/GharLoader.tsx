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
}

export const GharLoader: React.FC<GharLoaderProps> = ({
  fullscreen = false,
  className = '',
}) => {
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % SOAP_QUOTES.length);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  const content = (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      {/* 4 BLACK BUBBLES - SMALL TO BIG (LEFT TO RIGHT) */}
      <div className="flex items-center gap-3 py-3">
        {/* Bubble 1: Smallest */}
        <div className="w-2 h-2 rounded-full bg-neutral-900 animate-bubble-1" />
        {/* Bubble 2: Medium-Small */}
        <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 animate-bubble-2" />
        {/* Bubble 3: Medium-Large */}
        <div className="w-3.5 h-3.5 rounded-full bg-neutral-900 animate-bubble-3" />
        {/* Bubble 4: Largest */}
        <div className="w-4.5 h-4.5 rounded-full bg-neutral-900 animate-bubble-4" />
      </div>

      {/* Rotating Zomato-Style Witty Lines (Clean, No Card Background) */}
      <div className="space-y-1 max-w-sm px-4 pt-1">
        <p
          key={quoteIndex}
          className="text-xs sm:text-sm font-semibold text-neutral-800 animate-quote-fade min-h-[22px]"
        >
          {SOAP_QUOTES[quoteIndex]}
        </p>
        <div className="text-[10px] font-medium text-neutral-400">
          Handmade with pure cold-pressed extracts
        </div>
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="min-h-screen w-full bg-[#fbfbfd]/80 backdrop-blur-md flex items-center justify-center p-4 fixed inset-0 z-50">
        {content}
      </div>
    );
  }

  return content;
};
