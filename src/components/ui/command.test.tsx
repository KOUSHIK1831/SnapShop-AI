import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator, CommandShortcut } from './command';

describe('Command', () => {
  it('renders command component', () => {
    render(<Command data-testid="cmd" />);
    expect(screen.getByTestId('cmd')).toBeInTheDocument();
  });

  it('renders input with search icon', () => {
    render(<Command><CommandInput placeholder="Search..." /></Command>);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders list', () => {
    render(<Command><CommandList data-testid="list" /></Command>);
    expect(screen.getByTestId('list')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<Command><CommandEmpty>No results</CommandEmpty></Command>);
    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('renders group with heading', () => {
    render(<Command><CommandGroup heading="Group 1"><CommandItem>Item 1</CommandItem></CommandGroup></Command>);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  it('renders separator', () => {
    render(<Command><CommandSeparator data-testid="sep" /></Command>);
    expect(screen.getByTestId('sep')).toBeInTheDocument();
  });

  it('renders shortcut', () => {
    render(<CommandShortcut>⌘K</CommandShortcut>);
    expect(screen.getByText('⌘K')).toBeInTheDocument();
  });
});
