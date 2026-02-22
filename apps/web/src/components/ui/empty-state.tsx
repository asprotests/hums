import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  FileQuestion,
  Search,
  Users,
  BookOpen,
  Calendar,
  DollarSign,
  ClipboardList,
  Bell,
  Mail,
  FolderOpen,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: ReactNode | LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Generic empty state component
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const IconComponent = typeof Icon === 'function' ? Icon : null;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
    >
      {IconComponent ? (
        <IconComponent className="mb-4 h-12 w-12 text-gray-400" />
      ) : Icon ? (
        <div className="mb-4">{Icon}</div>
      ) : (
        <FileQuestion className="mb-4 h-12 w-12 text-gray-400" />
      )}

      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        {title}
      </h3>

      {description && (
        <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/**
 * No search results empty state
 */
export function NoSearchResults({
  query,
  onClear,
}: {
  query: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={`No items match "${query}". Try adjusting your search or filters.`}
      action={
        onClear && (
          <Button variant="outline" onClick={onClear}>
            Clear Search
          </Button>
        )
      }
    />
  );
}

/**
 * No data empty state
 */
export function NoData({
  entity,
  onAdd,
  addLabel,
}: {
  entity: string;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <EmptyState
      icon={FolderOpen}
      title={`No ${entity} found`}
      description={`There are no ${entity.toLowerCase()} to display yet.`}
      action={
        onAdd && (
          <Button onClick={onAdd}>
            {addLabel || `Add ${entity.slice(0, -1)}`}
          </Button>
        )
      }
    />
  );
}

/**
 * No students empty state
 */
export function NoStudents({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="No students found"
      description="There are no students matching your criteria."
      action={
        onAdd && (
          <Button onClick={onAdd}>Add Student</Button>
        )
      }
    />
  );
}

/**
 * No courses empty state
 */
export function NoCourses({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={BookOpen}
      title="No courses found"
      description="There are no courses available. Add courses to get started."
      action={
        onAdd && (
          <Button onClick={onAdd}>Add Course</Button>
        )
      }
    />
  );
}

/**
 * No schedule empty state
 */
export function NoSchedule() {
  return (
    <EmptyState
      icon={Calendar}
      title="No classes scheduled"
      description="You don't have any classes scheduled for this period."
    />
  );
}

/**
 * No payments empty state
 */
export function NoPayments() {
  return (
    <EmptyState
      icon={DollarSign}
      title="No payments found"
      description="There are no payment records to display."
    />
  );
}

/**
 * No enrollments empty state
 */
export function NoEnrollments({ onEnroll }: { onEnroll?: () => void }) {
  return (
    <EmptyState
      icon={ClipboardList}
      title="Not enrolled in any courses"
      description="You are not currently enrolled in any courses for this semester."
      action={
        onEnroll && (
          <Button onClick={onEnroll}>Browse Courses</Button>
        )
      }
    />
  );
}

/**
 * No notifications empty state
 */
export function NoNotifications() {
  return (
    <EmptyState
      icon={Bell}
      title="No notifications"
      description="You're all caught up! No new notifications."
    />
  );
}

/**
 * No messages empty state
 */
export function NoMessages() {
  return (
    <EmptyState
      icon={Mail}
      title="No messages"
      description="Your inbox is empty. Messages will appear here."
    />
  );
}

/**
 * Error state component
 */
export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred while loading this content.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <span className="text-2xl">!</span>
        </div>
      }
      title={title}
      description={description}
      action={
        onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Try Again
          </Button>
        )
      }
    />
  );
}

/**
 * Loading state component (for use when not using skeletons)
 */
export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

/**
 * Coming soon state
 */
export function ComingSoon({ feature }: { feature: string }) {
  return (
    <EmptyState
      icon={
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <span className="text-2xl">🚀</span>
        </div>
      }
      title="Coming Soon"
      description={`${feature} is under development and will be available soon.`}
    />
  );
}

/**
 * Access denied state
 */
export function AccessDenied() {
  return (
    <EmptyState
      icon={
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
          <span className="text-2xl">🔒</span>
        </div>
      }
      title="Access Denied"
      description="You don't have permission to view this content. Please contact your administrator."
    />
  );
}
