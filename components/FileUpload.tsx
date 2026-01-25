import React, { useRef, useState } from 'react';
import { Upload, X, FileImage } from 'lucide-react';

interface FileUploadProps {
  label: string;
  onFileSelect: (file: File | null) => void;
  accept?: string;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ label, onFileSelect, accept = "image/*", className = "" }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileSelect(file);
      
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileName(null);
    setPreview(null);
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <span className="text-xs font-medium text-zinc-400">{label}</span>
      <div 
        onClick={() => inputRef.current?.click()}
        className={`relative group cursor-pointer border border-dashed rounded-lg transition-all overflow-hidden ${
          preview ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-600'
        }`}
      >
        <input 
          ref={inputRef}
          type="file" 
          accept={accept} 
          className="hidden" 
          onChange={handleChange} 
        />
        
        {preview ? (
          <div className="relative h-24 w-full">
             <img src={preview} alt="Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-black/70 text-white text-xs px-2 py-1 rounded">Change</span>
             </div>
             <button 
              onClick={handleClear}
              className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-500/80 rounded-full text-white transition-colors"
             >
               <X className="w-3 h-3" />
             </button>
             <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                <p className="text-xs text-zinc-200 truncate">{fileName}</p>
             </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-zinc-500 group-hover:text-zinc-400">
            <Upload className="w-5 h-5 mb-2" />
            <span className="text-xs text-center px-2">Click to upload</span>
          </div>
        )}
      </div>
    </div>
  );
};
