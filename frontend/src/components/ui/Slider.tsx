import React, { forwardRef, useRef, useEffect, useState } from 'react';
import { cn } from '../../utils/cn';

export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onValueChange: (value: number) => void;
  disabled?: boolean;
  showValue?: boolean;
  className?: string;
}

const Slider = forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      min = 0,
      max = 100,
      step = 1,
      value,
      onValueChange,
      disabled = false,
      showValue = false,
      ...props
    },
    ref
  ) => {
    const thumbRef = useRef<HTMLDivElement>(null);
    const [thumbPosition, setThumbPosition] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const percentage = ((value - min) / (max - min)) * 100;

    // Update thumb position for value display
    useEffect(() => {
      if (thumbRef.current) {
        const thumbWidth = thumbRef.current.offsetWidth;
        const trackWidth = thumbRef.current.parentElement?.offsetWidth || 0;
        const position = (percentage / 100) * trackWidth - thumbWidth / 2;
        setThumbPosition(position);
      }
    }, [percentage, value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Math.round(parseFloat(e.target.value) / step) * step;
      const clampedValue = Math.max(min, Math.min(max, newValue));
      onValueChange(clampedValue);
    };

    const handleMouseDown = () => {
      if (!disabled) setIsDragging(true);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    return (
      <div className={cn('relative w-full', className)}>
        <div className="relative">
          <input
            ref={ref}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleChange}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            disabled={disabled}
            className={cn(
              'slider w-full h-2 bg-secondary-200 rounded-lg appearance-none cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'hover:!bg-secondary-300'
            )}
            style={{
              // Custom thumb via webkit
            } as React.CSSProperties}
            {...props}
          />

          {/* Custom styled track for better visual feedback */}
          <div
            className="absolute inset-0 h-2 bg-secondary-200 rounded-lg pointer-events-none"
            aria-hidden="true"
          >
            <div
              className="h-full bg-primary-600 rounded-lg pointer-events-none transition-all duration-100"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Thumb */}
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-100',
              'w-5 h-5 bg-white border-2 border-primary-600 rounded-full shadow-md',
              'hover:scale-110 active:scale-105',
              disabled && 'opacity-50'
            )}
            style={{
              left: `calc(${percentage}% - 12px)`,
            }}
            aria-hidden="true"
          >
            <div className="w-full h-full bg-primary-600 rounded-full opacity-0 group-hover:opacity-100" />
          </div>
        </div>

        {showValue && (
          <div
            ref={thumbRef}
            className={cn(
              'absolute -top-8 left-0 transform -translate-x-1/2 transition-transform duration-100',
              'whitespace-nowrap'
            )}
            style={{ left: `${percentage}%`, transform: `translateX(-50%)` }}
            aria-live="polite"
            aria-label={`Current value: ${value}`}
          >
            <span className="bg-primary-900 text-white text-xs font-medium px-2 py-0.5 rounded">
              {value}
            </span>
          </div>
        )}
      </div>
    );
  }
);

Slider.displayName = 'Slider';

export { Slider };