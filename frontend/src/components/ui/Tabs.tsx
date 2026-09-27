import React, { createContext, useContext, useState } from 'react';
import { cn } from '../../utils/cn';

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within Tabs');
  }
  return context;
};

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ value, onValueChange, children, className }) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
};

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export const TabsList: React.FC<TabsListProps> = ({ children, className }) => {
  return (
    <div
      role="tablist"
      aria-label="Tabs"
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md bg-secondary-100 p-1 text-secondary-500',
        className
      )}
    >
      {children}
    </div>
  );
};

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, children, disabled = false, className }) => {
  const { value: currentValue, onValueChange } = useTabs();
  const isActive = currentValue === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled}
      data-state={isActive ? 'active' : 'inactive'}
      onClick={() => !disabled && onValueChange(value)}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        isActive
          ? 'bg-white text-foreground shadow-sm'
          : 'hover:text-foreground hover:bg-secondary-200',
        className
      )}
    >
      {children}
    </button>
  );
};

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({ value, children, className }) => {
  const { value: currentValue } = useTabs();

  if (currentValue !== value) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      className={cn('mt-4 ring-offset-background focus:outline-none', className)}
    >
      {children}
    </div>
  );
};