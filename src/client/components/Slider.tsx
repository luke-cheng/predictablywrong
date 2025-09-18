import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface SliderProps {
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  locked?: boolean;
  className?: string;
}

export const Slider = ({
  value,
  onChange,
  min = -10,
  max = 10,
  label,
  locked = false,
  className = '',
}: SliderProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(parseInt(e.target.value));
    }
  };

  // Calculate the position of the thumb as a percentage for locked mode
  const range = max - min;
  const percentage = ((value - min) / range) * 100;


  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <div className="flex items-center space-x-1"></div>
      </div>

      <div className="relative px-2.5">
        {locked ? (
          // Locked mode: Static thumb indicator
          <div className="w-full h-3 rounded-lg relative overflow-hidden bg-gradient-to-r from-blue-400 to-orange-600">
            {/* Locked line indicator */}
            <div
              className="absolute top-1/2 transform -translate-y-1/2 w-0.5 h-6 bg-white shadow-lg"
              style={{
                left: `calc(${percentage}% - 1px)`,
                cursor: 'default',
              }}
            />
          </div>
        ) : (
          // Interactive mode: Range input with gradient background
          <div className="relative">
            {/* Gradient background */}
            <div className="w-full h-3 rounded-lg absolute top-0 left-0 pointer-events-none bg-gradient-to-r from-blue-400 to-orange-600" />
            {/* Range input */}
            <input
              type="range"
              min={min}
              max={max}
              value={value}
              onChange={handleChange}
              className="w-full h-3 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:focus:ring-blue-400 slider-custom relative z-10"
              style={{
                background: 'transparent',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
              }}
            />
          </div>
        )}

        {/* Value markers with arrows */}
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <div className="flex flex-col items-center">
            <ChevronDown className="w-4 h-4 text-blue-400" />
            <span>Nah</span>
          </div>
          <div className="flex flex-col items-center">
            <ChevronUp className="w-4 h-4 text-orange-600" />
            <span>Yay</span>
          </div>
        </div>
      </div>
    </div>
  );
};
