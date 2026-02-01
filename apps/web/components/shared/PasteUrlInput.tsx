import { useState } from 'react';

interface PasteUrlInputProps {
  onSubmit?: (url: string) => void;
  isLoading?: boolean;
}

export default function PasteUrlInput({ onSubmit, isLoading = false }: PasteUrlInputProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = () => {
    if (url.trim() && onSubmit) {
      onSubmit(url.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Paste a recipe URL here..."
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder-gray-500"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!url.trim() || isLoading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          {isLoading ? 'Extracting...' : 'Extract Recipe'}
        </button>
      </div>
    </div>
  );
}