import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

describe('Pagination', () => {
  it('renders nav with aria label', () => {
    render(<Pagination />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders content list', () => {
    render(
      <Pagination>
        <PaginationContent />
      </Pagination>,
    );
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('renders pagination items', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem data-testid="item" />
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByTestId('item')).toBeInTheDocument();
  });

  it('renders pagination link', () => {
    render(<PaginationLink href="/page/2">2</PaginationLink>);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders active pagination link', () => {
    render(
      <PaginationLink isActive href="/page/2">
        2
      </PaginationLink>,
    );
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders previous button', () => {
    render(<PaginationPrevious />);
    expect(screen.getByText('Previous')).toBeInTheDocument();
  });

  it('renders next button', () => {
    render(<PaginationNext />);
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('renders ellipsis', () => {
    render(<PaginationEllipsis />);
    expect(screen.getByText('More pages')).toBeInTheDocument();
  });

  it('applies custom className to nav', () => {
    const { container } = render(<Pagination className="custom-class" />);
    expect(container.querySelector('nav')).toHaveClass('custom-class');
  });
});
