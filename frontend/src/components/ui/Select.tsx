import React, { useState, useRef, useEffect, useId } from 'react';
import { cn } from '../../utils/cn';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { createPortal } from 'react-dom';

// Simple Select implementation using native select with custom styling
// This avoids the complexity of custom dropdowns while providing consistent UI

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  'aria-label'?: string;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onValueChange,
  placeholder,
  disabled = false,
  className,
  children,
  'aria-label': ariaLabel
}) => {
  return (
    <div className={cn('w-full', className)}>
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          'flex h-10 w-full appearance-none items-center rounded-md border border-border bg-background',
          'px-3 py-2 text-sm ring-offset-background',
          'placeholder:text-secondary-400',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'hover:border-primary-500',
          'bg-no-repeat bg-right pr-10',
          'bg-[url("data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3e%3cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3e%3c/svg%3e")]'
        )}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {children}
      </select>
    </div>
  );
};

interface SelectTriggerProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export const SelectTrigger: React.FC<SelectTriggerProps> = ({
  value,
  onValueChange,
  placeholder,
  disabled = false,
  className,
  'aria-label': ariaLabel
}) => {
  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      aria-label={ariaLabel}
    >
      {/* Children will be passed through */}
    </Select>
  );
};

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

export const SelectContent: React.FC<SelectContentProps> = ({ children, className }) => {
  return <>{children}</>;
};

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const SelectItem: React.FC<SelectItemProps> = ({ value, children, disabled = false, className }) => {
  return (
    <option value={value} disabled={disabled} className={className}>
      {children}
    </option>
  );
};

interface SelectValueProps {
  placeholder?: string;
  children?: React.ReactNode;
}

export const SelectValue: React.FC<SelectValueProps> = ({ placeholder, children }) => {
  return <>{children || placeholder}</>;
};

// For compatibility with the PersonnelManager usage
export default Select;