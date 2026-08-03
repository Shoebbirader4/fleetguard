import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Toast, { ToastMessage } from './Toast';

describe('Toast Component', () => {
  let mockOnDismiss: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnDismiss = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should render success toast with green color', () => {
    const toast: ToastMessage = {
      id: '1',
      type: 'success',
      message: 'Operation successful',
    };

    const { container } = render(<Toast toast={toast} onDismiss={mockOnDismiss} />);
    
    expect(screen.getByText('Operation successful')).toBeInTheDocument();
    const toastElement = container.querySelector('[role="alert"]');
    expect(toastElement?.className).toContain('border-green-500');
    expect(toastElement?.className).toContain('text-green-800');
  });

  it('should render error toast with red color', () => {
    const toast: ToastMessage = {
      id: '2',
      type: 'error',
      message: 'Operation failed',
    };

    const { container } = render(<Toast toast={toast} onDismiss={mockOnDismiss} />);
    
    expect(screen.getByText('Operation failed')).toBeInTheDocument();
    const toastElement = container.querySelector('[role="alert"]');
    expect(toastElement?.className).toContain('border-red-500');
    expect(toastElement?.className).toContain('text-red-800');
  });

  it('should render warning toast with yellow color', () => {
    const toast: ToastMessage = {
      id: '3',
      type: 'warning',
      message: 'Warning message',
    };

    const { container } = render(<Toast toast={toast} onDismiss={mockOnDismiss} />);
    
    expect(screen.getByText('Warning message')).toBeInTheDocument();
    const toastElement = container.querySelector('[role="alert"]');
    expect(toastElement?.className).toContain('border-yellow-500');
    expect(toastElement?.className).toContain('text-yellow-800');
  });

  it('should render info toast with blue color', () => {
    const toast: ToastMessage = {
      id: '4',
      type: 'info',
      message: 'Info message',
    };

    const { container } = render(<Toast toast={toast} onDismiss={mockOnDismiss} />);
    
    expect(screen.getByText('Info message')).toBeInTheDocument();
    const toastElement = container.querySelector('[role="alert"]');
    expect(toastElement?.className).toContain('border-blue-500');
    expect(toastElement?.className).toContain('text-blue-800');
  });

  it('should auto-dismiss after 5 seconds by default', () => {
    const toast: ToastMessage = {
      id: '5',
      type: 'success',
      message: 'Auto dismiss test',
    };

    render(<Toast toast={toast} onDismiss={mockOnDismiss} />);
    
    expect(mockOnDismiss).not.toHaveBeenCalled();
    
    // Fast-forward time by 5 seconds
    vi.advanceTimersByTime(5000);
    
    expect(mockOnDismiss).toHaveBeenCalledWith('5');
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('should respect custom duration', () => {
    const toast: ToastMessage = {
      id: '6',
      type: 'success',
      message: 'Custom duration test',
      duration: 3000, // 3 seconds
    };

    render(<Toast toast={toast} onDismiss={mockOnDismiss} />);
    
    expect(mockOnDismiss).not.toHaveBeenCalled();
    
    // Fast-forward time by 3 seconds
    vi.advanceTimersByTime(3000);
    
    expect(mockOnDismiss).toHaveBeenCalledWith('6');
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('should dismiss when close button is clicked', () => {
    const toast: ToastMessage = {
      id: '7',
      type: 'success',
      message: 'Manual dismiss test',
    };

    render(<Toast toast={toast} onDismiss={mockOnDismiss} />);
    
    const closeButton = screen.getByRole('button');
    closeButton.click();
    
    expect(mockOnDismiss).toHaveBeenCalledWith('7');
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });
});
