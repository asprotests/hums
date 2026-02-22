import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Skeleton,
  TableSkeleton,
  CardSkeleton,
  DashboardStatsSkeleton,
  StudentDashboardSkeleton,
  FormSkeleton,
  ProfileSkeleton,
  ListSkeleton,
  ScheduleSkeleton,
  GradesSkeleton,
  PageHeaderSkeleton,
} from './skeletons';

describe('Skeleton Components', () => {
  describe('Skeleton (base)', () => {
    it('should render with animation class', () => {
      const { container } = render(<Skeleton />);
      expect(container.firstChild).toHaveClass('animate-pulse');
    });

    it('should accept custom className', () => {
      const { container } = render(<Skeleton className="w-full h-4" />);
      expect(container.firstChild).toHaveClass('w-full');
      expect(container.firstChild).toHaveClass('h-4');
    });
  });

  describe('TableSkeleton', () => {
    it('should render default 5 rows', () => {
      const { container } = render(<TableSkeleton />);
      // Header + 5 rows
      const skeletonElements = container.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(5);
    });

    it('should render custom number of rows', () => {
      const { container } = render(<TableSkeleton rows={3} />);
      const skeletonElements = container.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(3);
    });
  });

  describe('CardSkeleton', () => {
    it('should render card structure', () => {
      const { container } = render(<CardSkeleton />);
      expect(container.firstChild).toHaveClass('rounded-lg');
      expect(container.firstChild).toHaveClass('border');
    });

    it('should accept custom className', () => {
      const { container } = render(<CardSkeleton className="max-w-md" />);
      expect(container.firstChild).toHaveClass('max-w-md');
    });
  });

  describe('DashboardStatsSkeleton', () => {
    it('should render 4 stat cards', () => {
      const { container } = render(<DashboardStatsSkeleton />);
      const cards = container.querySelectorAll('.rounded-lg.border');
      expect(cards.length).toBe(4);
    });

    it('should have grid layout', () => {
      const { container } = render(<DashboardStatsSkeleton />);
      expect(container.firstChild).toHaveClass('grid');
    });
  });

  describe('StudentDashboardSkeleton', () => {
    it('should render welcome section with avatar', () => {
      const { container } = render(<StudentDashboardSkeleton />);
      const avatar = container.querySelector('.rounded-full');
      expect(avatar).toBeInTheDocument();
    });

    it('should include stats skeleton', () => {
      const { container } = render(<StudentDashboardSkeleton />);
      const gridElements = container.querySelectorAll('.grid');
      expect(gridElements.length).toBeGreaterThan(0);
    });
  });

  describe('FormSkeleton', () => {
    it('should render default 4 fields', () => {
      const { container } = render(<FormSkeleton />);
      // Each field has label + input skeleton
      const skeletonElements = container.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThanOrEqual(8);
    });

    it('should render custom number of fields', () => {
      const { container } = render(<FormSkeleton fields={2} />);
      const skeletonElements = container.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThanOrEqual(4);
    });

    it('should have submit buttons', () => {
      const { container } = render(<FormSkeleton />);
      const buttonArea = container.querySelector('.flex.justify-end');
      expect(buttonArea).toBeInTheDocument();
    });
  });

  describe('ProfileSkeleton', () => {
    it('should render large avatar', () => {
      const { container } = render(<ProfileSkeleton />);
      const avatar = container.querySelector('.h-24.w-24.rounded-full');
      expect(avatar).toBeInTheDocument();
    });

    it('should render detail cards', () => {
      const { container } = render(<ProfileSkeleton />);
      const cards = container.querySelectorAll('.rounded-lg.border');
      expect(cards.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('ListSkeleton', () => {
    it('should render default 5 items', () => {
      const { container } = render(<ListSkeleton />);
      const items = container.querySelectorAll('.rounded-lg.border.bg-white');
      expect(items.length).toBe(5);
    });

    it('should render custom number of items', () => {
      const { container } = render(<ListSkeleton items={3} />);
      const items = container.querySelectorAll('.rounded-lg.border.bg-white');
      expect(items.length).toBe(3);
    });

    it('should render avatar for each item', () => {
      const { container } = render(<ListSkeleton items={2} />);
      const avatars = container.querySelectorAll('.rounded-full');
      expect(avatars.length).toBe(2);
    });
  });

  describe('ScheduleSkeleton', () => {
    it('should render 5 day sections', () => {
      const { container } = render(<ScheduleSkeleton />);
      const daySections = container.querySelectorAll('.rounded-lg.border.bg-white');
      expect(daySections.length).toBe(5);
    });

    it('should have time slots for each day', () => {
      const { container } = render(<ScheduleSkeleton />);
      const skeletonElements = container.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(10);
    });
  });

  describe('GradesSkeleton', () => {
    it('should render summary cards', () => {
      const { container } = render(<GradesSkeleton />);
      const summaryCards = container.querySelectorAll('.grid.gap-4.md\\:grid-cols-3 > div');
      expect(summaryCards.length).toBe(3);
    });

    it('should render grades table', () => {
      const { container } = render(<GradesSkeleton />);
      const tableContainer = container.querySelector('.rounded-lg.border.bg-white');
      expect(tableContainer).toBeInTheDocument();
    });
  });

  describe('PageHeaderSkeleton', () => {
    it('should render title skeleton', () => {
      const { container } = render(<PageHeaderSkeleton />);
      const titleSkeleton = container.querySelector('.h-8');
      expect(titleSkeleton).toBeInTheDocument();
    });

    it('should render action button skeleton', () => {
      const { container } = render(<PageHeaderSkeleton />);
      const buttonSkeleton = container.querySelector('.h-10.w-32');
      expect(buttonSkeleton).toBeInTheDocument();
    });

    it('should have flex layout with justify-between', () => {
      const { container } = render(<PageHeaderSkeleton />);
      expect(container.firstChild).toHaveClass('flex');
      expect(container.firstChild).toHaveClass('justify-between');
    });
  });
});
