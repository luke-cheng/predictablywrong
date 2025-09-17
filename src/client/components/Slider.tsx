import React from 'react';
import { ChevronUp, ChevronDown, Lock } from 'lucide-react';

interface SliderProps {
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  disabled?: boolean;
  locked?: boolean;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  onChange,
  min = -10,
  max = 10,
  label,
  disabled = false,
  locked = false,
  className = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(parseInt(e.target.value));
    }
  };

  // Calculate the position of the thumb as a percentage for locked mode
  const range = max - min;
  const percentage = ((value - min) / range) * 100;


  const getSliderBackground = () => {
    return `linear-gradient(to right, 
      #9580FF 0%, 
      #9580FF 30%, 
      #A080FF 40%, 
      #B080FF 45%, 
      #C080FF 47.5%, 
      #D080FF 49%, 
      #E080FF 49.5%, 
      #F080FF 49.75%, 
      #FF80FF 50%, 
      #FF80E0 50.25%, 
      #FF80C0 50.5%, 
      #FF80A0 51%, 
      #FF8080 52.5%, 
      #FF8060 55%, 
      #FF8040 60%, 
      #FF4500 70%, 
      #FF4500 100%)`;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <div className="flex items-center space-x-1"></div>
      </div>

      <div className="relative">
        {locked ? (
          // Locked mode: Static thumb indicator
          <div
            className="w-full h-3 rounded-lg relative overflow-hidden"
            style={{
              background: getSliderBackground(),
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* Locked thumb indicator */}
            <div
              className="absolute top-1/2 transform -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow-lg bg-white"
              style={{
                left: `calc(${percentage}% - 10px)`,
                cursor: 'default',
              }}
            >
              {/* Lock icon inside thumb */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="w-2.5 h-2.5 text-gray-600" />
              </div>
            </div>
          </div>
        ) : (
          // Interactive mode: Range input with gradient background
          <div className="relative">
            {/* Gradient background */}
            <div
              className="w-full h-3 rounded-lg absolute top-0 left-0 pointer-events-none"
              style={{
                background: getSliderBackground(),
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
              }}
            />
            {/* Range input */}
            <input
              type="range"
              min={min}
              max={max}
              value={value}
              onChange={handleChange}
              disabled={disabled}
              className="w-full h-3 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:focus:ring-blue-400 slider-custom relative z-10"
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
            <ChevronDown className="w-4 h-4" style={{ color: '#9580FF' }} />
            <span>Nah</span>
          </div>
          <div className="flex flex-col items-center">
            <ChevronUp className="w-4 h-4" style={{ color: '#FF4500' }} />
            <span>Yay</span>
          </div>
        </div>
      </div>
    </div>
  );
};
