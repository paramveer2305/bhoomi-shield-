import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  title?: string;
  description?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', title, description, dismissible, onDismiss, icon, children, ...props }, ref) => {
    const variantClasses = {
      default: 'bg-secondary-100 text-secondary-900 border-border',
      destructive: 'bg-destructive-100 text-destructive-900 border-destructive-200',
      success: 'bg-success-100 text-success-900 border-success-200',
      warning: 'bg-warning-100 text-warning-900 border-warning-200',
      info: 'bg-info-100 text-info-900 border-info-200',
    };

    const defaultIcons = {
      default: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      destructive: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      success: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      warning: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      info: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    };

    const currentVariant = variant in variantClasses ? variant : 'default';

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex gap-3 p-4 rounded-lg border animate-in',
          variantClasses[currentVariant],
          className
        )}
        role="alert"
        {...props}
      >
        <div className="flex-shrink-0 text-foreground/80">{icon || defaultIcons[currentVariant]}</div>
        <div className="flex-1 min-w-0">
          {title && <h4 className="font-medium text-sm">{title}</h4>}
          {description && <p className="text-sm text-foreground/80 mt-1">{description}</p>}
          {children && <div className="mt-2 text-sm">{children}</div>}
        </div>
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 rounded hover:bg-foreground/10 transition-colors text-foreground/50 hover:text-foreground"
            aria-label="Dismiss alert"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

export { Alert };