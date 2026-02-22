import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  ComingSoon,
  AccessDenied,
} from './empty-state';

// Mock Lucide icons to avoid rendering issues in tests
vi.mock('lucide-react', () => ({
  FileQuestion: () => <span data-testid="file-question-icon" />,
  Search: () => <span data-testid="search-icon" />,
  Users: () => <span data-testid="users-icon" />,
  BookOpen: () => <span data-testid="book-icon" />,
  Calendar: () => <span data-testid="calendar-icon" />,
  DollarSign: () => <span data-testid="dollar-icon" />,
  ClipboardList: () => <span data-testid="clipboard-icon" />,
  Bell: () => <span data-testid="bell-icon" />,
  Mail: () => <span data-testid="mail-icon" />,
  FolderOpen: () => <span data-testid="folder-icon" />,
}));

describe('Empty State Components', () => {
  describe('EmptyState (base)', () => {
    it('should render title', () => {
      render(<EmptyState title="No items found" />);
      expect(screen.getByText('No items found')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      render(
        <EmptyState
          title="No items"
          description="There are no items to display"
        />
      );
      expect(screen.getByText('There are no items to display')).toBeInTheDocument();
    });

    it('should render action button when provided', () => {
      const onClick = vi.fn();
      render(
        <EmptyState
          title="No items"
          action={<button onClick={onClick}>Add Item</button>}
        />
      );

      const button = screen.getByRole('button', { name: 'Add Item' });
      expect(button).toBeInTheDocument();

      fireEvent.click(button);
      expect(onClick).toHaveBeenCalled();
    });

    it('should render ReactNode icon', () => {
      render(
        <EmptyState
          title="Custom"
          icon={<span data-testid="custom-icon">🎉</span>}
        />
      );
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <EmptyState title="Test" className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should render default icon when none provided', () => {
      render(<EmptyState title="Test" />);
      expect(screen.getByTestId('file-question-icon')).toBeInTheDocument();
    });
  });

  describe('ErrorState', () => {
    it('should display default error message', () => {
      render(<ErrorState />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should display custom error message', () => {
      render(
        <ErrorState
          title="Custom error"
          description="Custom description"
        />
      );
      expect(screen.getByText('Custom error')).toBeInTheDocument();
      expect(screen.getByText('Custom description')).toBeInTheDocument();
    });

    it('should show Try Again button when onRetry provided', () => {
      const onRetry = vi.fn();
      render(<ErrorState onRetry={onRetry} />);

      const button = screen.getByRole('button', { name: /Try Again/i });
      fireEvent.click(button);
      expect(onRetry).toHaveBeenCalled();
    });
  });

  describe('LoadingState', () => {
    it('should display default loading message', () => {
      render(<LoadingState />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should display custom loading message', () => {
      render(<LoadingState message="Fetching data..." />);
      expect(screen.getByText('Fetching data...')).toBeInTheDocument();
    });

    it('should have spinning animation', () => {
      const { container } = render(<LoadingState />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('ComingSoon', () => {
    it('should display feature name', () => {
      render(<ComingSoon feature="Advanced Analytics" />);
      expect(screen.getByText('Coming Soon')).toBeInTheDocument();
      expect(screen.getByText(/Advanced Analytics is under development/)).toBeInTheDocument();
    });

    it('should have rocket emoji', () => {
      render(<ComingSoon feature="Test" />);
      expect(screen.getByText('🚀')).toBeInTheDocument();
    });
  });

  describe('AccessDenied', () => {
    it('should display access denied message', () => {
      render(<AccessDenied />);
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/You don't have permission/)).toBeInTheDocument();
    });

    it('should have lock emoji', () => {
      render(<AccessDenied />);
      expect(screen.getByText('🔒')).toBeInTheDocument();
    });
  });
});
