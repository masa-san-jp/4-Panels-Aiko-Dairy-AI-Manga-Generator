import React, { ChangeEvent } from 'react';

export interface FileUploadProps {
  label: string;
  onFileSelect: (file: File | null) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ label, onFileSelect }) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    onFileSelect(file);
  };

  return (
    <label className="flex flex-col items-center p-4 border rounded-md cursor-pointer hover:bg-zinc-800/20">
      <input type="file" accept="image/*" onChange={handleChange} className="hidden" />
      <span className="text-sm font-medium text-zinc-300">{label}</span>
    </label>
  );
};

export default FileUpload;
