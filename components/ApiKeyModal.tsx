import React, { useState } from 'react';

export interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [key, setKey] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('apiKey', key);
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">
          ×
        </button>
        <h2 className="text-lg font-semibold mb-4">API Key設定</h2>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="w-full border rounded p-2 mb-4"
          placeholder="Enter your API key"
        />
        <button onClick={handleSave} className="w-full bg-indigo-500 text-white py-2 rounded">
          保存
        </button>
      </div>
    </div>
  );
};

export default ApiKeyModal;
