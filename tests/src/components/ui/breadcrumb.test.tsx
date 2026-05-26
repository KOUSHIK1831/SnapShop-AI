import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from '@/components/ui/breadcrumb';

describe('Breadcrumb', () => {
  it('renders nav with aria label', () => {
    render(<Breadcrumb />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders list', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList />
      </Breadcrumb>,
    );
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('renders items', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem data-testid="item" />
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByTestId('item')).toBeInTheDocument();
  });

  it('renders link', () => {
    render(<BreadcrumbLink href="/">Home</BreadcrumbLink>);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('renders asChild slot', () => {
    render(
      <BreadcrumbLink asChild>
        <a href="/">Child</a>
      </BreadcrumbLink>,
    );
    expect(screen.getByText('Child')).toBeInTheDocument();
  });

  it('renders current page', () => {
    render(<BreadcrumbPage>Current</BreadcrumbPage>);
    expect(screen.getByText('Current')).toBeInTheDocument();
  });

  it('renders separator', () => {
    const { container } = render(<BreadcrumbSeparator />);
    expect(container.querySelector('li')).toBeInTheDocument();
  });

  it('renders ellipsis', () => {
    render(<BreadcrumbEllipsis />);
    expect(screen.getByText('More')).toBeInTheDocument();
  });
});
