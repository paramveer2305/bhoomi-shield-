import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'destructive'
    | 'info'
    | 'outline'
    | 'risk-low'
    | 'risk-medium'
    | 'risk-high'
    | 'risk-critical'
    | 'status-verified'
    | 'status-pending'
    | 'status-disputed'
    | 'status-in-review'
    | 'role-citizen'
    | 'role-patwari'
    | 'role-tehsildar'
    | 'role-officer'
    | 'role-admin';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  dot?: boolean;
  dotColor?: string;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      icon,
      dot,
      dotColor,
      children,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      primary: 'badge-primary',
      secondary: 'badge-secondary',
      success: 'badge-success',
      warning: 'badge-warning',
      destructive: 'badge-destructive',
      info: 'badge-info',
      outline: 'badge-outline',
      'risk-low': 'badge-risk-low',
      'risk-medium': 'badge-risk-medium',
      'risk-high': 'badge-risk-high',
      'risk-critical': 'badge-risk-critical',
      'status-verified': 'badge-status-verified',
      'status-pending': 'badge-status-pending',
      'status-disputed': 'badge-status-disputed',
      'status-in-review': 'badge-status-in-review',
      'role-citizen': 'badge-role-citizen',
      'role-patwari': 'badge-role-patwari',
      'role-tehsildar': 'badge-role-tehsildar',
      'role-officer': 'badge-role-officer',
      'role-admin': 'badge-role-admin',
    };

    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-0.5 text-xs',
      lg: 'px-3 py-1 text-sm',
    };

    const dotColors = {
      success: 'bg-success',
      warning: 'bg-warning',
      destructive: 'bg-destructive',
      info: 'bg-info',
      primary: 'bg-primary',
      secondary: 'bg-secondary',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 font-medium transition-all duration-200',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full flex-shrink-0',
              dotColor || dotColors[variant as keyof typeof dotColors] || 'bg-current'
            )}
          />
        )}
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };

// Helper function to get risk badge variant
export const getRiskBadgeVariant = (riskLevel: string): BadgeProps['variant'] => {
  switch (riskLevel?.toUpperCase()) {
    case 'LOW':
      return 'risk-low';
    case 'MEDIUM':
      return 'risk-medium';
    case 'HIGH':
      return 'risk-high';
    case 'CRITICAL':
      return 'risk-critical';
    default:
      return 'secondary';
  }
};

// Helper function to get status badge variant
export const getStatusBadgeVariant = (status: string): BadgeProps['variant'] => {
  switch (status?.toUpperCase()) {
    case 'VERIFIED':
      return 'status-verified';
    case 'PENDING_VERIFICATION':
    case 'REQUIRES_VERIFICATION':
      return 'status-pending';
    case 'DISPUTED':
      return 'status-disputed';
    case 'IN_REVIEW':
      return 'status-in-review';
    default:
      return 'secondary';
  }
};

// Helper function to get role badge variant
export const getRoleBadgeVariant = (role: string): BadgeProps['variant'] => {
  switch (role?.toLowerCase()) {
    case 'citizen':
      return 'role-citizen';
    case 'patwari':
      return 'role-patwari';
    case 'tehsildar':
      return 'role-tehsildar';
    case 'officer':
      return 'role-officer';
    case 'admin':
      return 'role-admin';
    default:
      return 'secondary';
  }
};