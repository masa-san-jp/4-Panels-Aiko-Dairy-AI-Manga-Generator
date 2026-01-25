import React, { useState, useEffect } from 'react';
import { X, Key, Check, Trash2, ExternalLink } from 'lucide-react';
import { saveApiKey, removeApiKey, getStoredApiKey } from '../services/geminiService';
import { Button } from './Button';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredApiKey();
      if (stored) {
        setKey(stored);
        setSaved(true);
      } else {
        setSaved(false);
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    if (key.trim()) {
      saveApiKey(key.trim());
      setSaved(true);
      setTimeout(onClose, 500);
    }
  };

  const handleRemove = () => {
    removeApiKey();
    setKey('');
    setSaved(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-zinc-800 rounded-lg text-indigo-400">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">API Configuration</h2>
            <p className="text-xs text-zinc-400">Enter your Google Gemini API Key</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">API Key</label>
            <div className="relative">
              <input
                type="password"
                value={key}
                onChange={(e) => {
                    setKey(e.target.value);
                    setSaved(false);
                }}
                placeholder="AIzaSy..."
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-600 font-mono text-sm"
              />
              {saved && (
                <div className="absolute right-3 top-2.5 text-emerald-500">
                  <Check className="w-5 h-5" />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-500">
             <span>Your key is stored locally in your browser.</span>
             <a 
               href="https://aistudio.google.com/app/apikey" 
               target="_blank" 
               rel="noopener noreferrer"
               className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
             >
               Get API Key <ExternalLink className="w-3 h-3" />
             </a>
          </div>

          <div className="pt-4 flex gap-3">
            {saved ? (
                <Button 
                    variant="danger" 
                    onClick={handleRemove}
                    className="flex-1"
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Key
                </Button>
            ) : (
                <div className="flex-1"></div>
            )}
            <Button 
                onClick={handleSave} 
                className="flex-1"
                disabled={!key.trim()}
            >
                {saved ? 'Saved' : 'Save Key'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
