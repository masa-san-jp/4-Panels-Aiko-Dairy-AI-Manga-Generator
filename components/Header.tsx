import React, { useEffect, useState } from 'react';
import { Sparkles, Key, Settings } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const [isAiStudio, setIsAiStudio] = useState(false);

  useEffect(() => {
    const win = window as any;
    // Check if running in an environment with AI Studio key management
    if (win.aistudio && win.aistudio.openSelectKey) {
      setIsAiStudio(true);
    }
  }, []);

  const handleOpenAiStudioKey = async () => {
    const win = window as any;
    if (win.aistudio && win.aistudio.openSelectKey) {
      await win.aistudio.openSelectKey();
    }
  };

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur flex items-center px-6 justify-between sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
          MangaStudio AI
        </h1>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 ml-2">
          Powered by Gemini 2.5 Flash
        </span>
      </div>
      <div className="flex items-center gap-4">
        {isAiStudio ? (
           <button 
             onClick={handleOpenAiStudioKey}
             className="text-zinc-400 hover:text-white transition-colors text-sm font-medium flex items-center gap-1.5 mr-2"
             title="Manage AI Studio Key"
           >
             <Key className="w-4 h-4" />
             <span className="hidden sm:inline">API Key</span>
           </button>
        ) : (
            <button 
                onClick={onOpenSettings}
                className="text-zinc-400 hover:text-white transition-colors text-sm font-medium flex items-center gap-1.5 mr-2"
                title="Settings & API Key"
            >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
            </button>
        )}
        <a href="#" className="text-zinc-400 hover:text-white transition-colors text-sm font-medium">Documentation</a>
        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
            <span className="text-xs font-bold text-zinc-400">AI</span>
        </div>
      </div>
    </header>
  );
};