import { ReactNode } from 'react';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { Lock } from 'lucide-react';

interface ReadOnlyWrapperProps {
  section: string;
  children: ReactNode;
  fallback?: ReactNode;
  showBadge?: boolean;
}

/**
 * Wrapper component that renders children in read-only mode if the user
 * has read-only access to the specified section.
 *
 * @param section - The section identifier (e.g., 'staff/plaque-orders')
 * @param children - The content to render
 * @param fallback - Optional fallback content if user has no access
 * @param showBadge - Whether to show a "Read Only" badge
 */
export function ReadOnlyWrapper({ section, children, fallback, showBadge = true }: ReadOnlyWrapperProps) {
  const { hasReadOnlyAccess, hasWriteAccess, loading } = useStaffPermissions();

  if (loading) {
    return <div className="animate-pulse bg-muted h-24 rounded-lg" />;
  }

  // If user has write access, render children normally
  if (hasWriteAccess(section)) {
    return <>{children}</>;
  }

  // If user has read-only access, render with read-only styling
  if (hasReadOnlyAccess(section)) {
    return (
      <div className="relative group">
        {showBadge && (
          <div className="absolute top-0 right-0 z-10 bg-amber-500/90 text-amber-950 px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-md">
            <Lock className="h-3 w-3" />
            Read Only
          </div>
        )}
        <div className="opacity-75 pointer-events-none select-none">
          {children}
        </div>
      </div>
    );
  }

  // If user has no access, render fallback or nothing
  return <>{fallback || null}</>;
}

interface ReadOnlyButtonProps {
  section: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Button wrapper that disables the button if user has read-only access.
 */
export function ReadOnlyButton({ section, children, onClick, disabled, className }: ReadOnlyButtonProps) {
  const { hasWriteAccess, loading } = useStaffPermissions();

  if (loading) {
    return <div className="animate-pulse bg-muted h-10 w-24 rounded" />;
  }

  const isReadOnly = !hasWriteAccess(section);

  return (
    <button
      onClick={isReadOnly ? undefined : onClick}
      disabled={disabled || isReadOnly}
      className={className}
      title={isReadOnly ? 'Read-only access - you cannot perform this action' : undefined}
    >
      {children}
    </button>
  );
}

interface ReadOnlyInputProps {
  section: string;
  children: ReactNode;
  disabled?: boolean;
}

/**
 * Input wrapper that disables inputs if user has read-only access.
 */
export function ReadOnlyInput({ section, children, disabled }: ReadOnlyInputProps) {
  const { hasWriteAccess, loading } = useStaffPermissions();

  if (loading) {
    return <div className="animate-pulse bg-muted h-10 w-full rounded" />;
  }

  const isReadOnly = !hasWriteAccess(section);

  return (
    <div className={isReadOnly ? 'opacity-60 pointer-events-none' : ''}>
      {children}
    </div>
  );
}
