"use client";

import { useState } from 'react';

interface UrlInputProps {
  onSubmit: (url: string, fastMode?: boolean) => void;
}

export default function UrlInput({ onSubmit }: UrlInputProps) {
  const [url, setUrl] = useState('');
  const [fastMode, setFastMode] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim(), fastMode);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
      <div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter TikTok, YouTube, or Instagram URL"
          className="w-full px-4 py-2 border border-white/20 rounded-lg focus:ring-2 focus:ring-[#FF3A25] focus:border-transparent bg-[#1e1f26] text-white placeholder-white/50"
          required
        />
      </div>
      
      {/* Fast Mode Toggle */}
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="fastMode"
          checked={fastMode}
          onChange={(e) => setFastMode(e.target.checked)}
          className="w-4 h-4 text-[#FF3A25] bg-[#14151a] border-white/20 rounded focus:ring-[#FF3A25]"
        />
        <label htmlFor="fastMode" className="flex flex-col">
          <span className="text-sm font-medium text-white">
            Fast Mode (Captions Only)
          </span>
          <span className="text-xs text-white/70">
            Skip audio/video analysis for faster results
          </span>
        </label>
      </div>
      
      <button
        type="submit"
        className="w-full bg-[#FF3A25] text-white py-2 px-4 rounded-lg hover:bg-[#FF3A25]/90 focus:ring-2 focus:ring-[#FF3A25] focus:ring-offset-2 transition-colors"
      >
        {fastMode ? 'Extract Recipe (Fast)' : 'Extract Recipe (Full Analysis)'}
      </button>
    </form>
  );
}