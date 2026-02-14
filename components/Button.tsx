import React from 'react';

export interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ onClick, children, className='', variant='primary', isLoading=false }) => {
  const base = 'px-4 py-2 rounded-md font-medium transition-colors';
  const primary = 'bg-indigo-500 text-white hover:bg-indigo-600';
  const secondary = 'bg-gray-200 text-gray-800 hover:bg-gray-300';
  const disabled = 'opacity-50 cursor-not-allowed';

  return (
    <button
      onClick={onClick}
      className={`${base} ${variant=== 'primary' ? primary : secondary} ${className}`}
      disabled={isLoading}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
};

export default Button;
