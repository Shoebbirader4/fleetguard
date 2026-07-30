import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default medium size', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('div');
    
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('h-5', 'w-5');
    expect(spinner).toHaveClass('animate-spin');
    expect(spinner).toHaveClass('border-blue-600');
  });

  it('renders with small size', () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const spinner = container.querySelector('div');
    
    expect(spinner).toHaveClass('h-4', 'w-4');
  });

  it('renders with large size', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const spinner = container.querySelector('div');
    
    expect(spinner).toHaveClass('h-8', 'w-8');
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingSpinner className="custom-class" />);
    const spinner = container.querySelector('div');
    
    expect(spinner).toHaveClass('custom-class');
  });

  it('has accessible role and label', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('supports dark mode with appropriate colors', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('div');
    
    expect(spinner).toHaveClass('dark:border-blue-400');
  });
});
