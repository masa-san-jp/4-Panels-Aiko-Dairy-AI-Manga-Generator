import React from 'react';
import { LayoutTemplate } from 'lucide-react';

export interface HeaderProps {
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  return (
    <header className="flex items-center justify-between p-4 bg-zinc-800/50">
      <h1 className="text-xl font-semibold text-indigo-400 flex items-center gap-2">
        <LayoutTemplate className="w-6 h-6" />
        Manga Studio AI
      </h1>
      <button
        onClick={onOpenSettings}
        className="p-2 rounded bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
      >
        Settings
      </button>
    </header>
  );
};

export default Header;
