import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from '@/components/ui/Avatar';

describe('Avatar', () => {
  it('renders up to two uppercase initials from the name', () => {
    render(<Avatar name="Ada Lovelace" />);
    expect(screen.getByText('AL')).toBeInTheDocument();
  });

  it('handles a single-word name', () => {
    render(<Avatar name="madonna" />);
    expect(screen.getByText('M')).toBeInTheDocument();
  });
});
