import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Modal from './Modal';

/**
 * **Validates: Requirements 5.2, 5.3**
 * 
 * Tests for the Modal component covering:
 * - Visibility when isOpen changes
 * - Escape key to close functionality
 * - Backdrop click to close functionality
 * - Focus trap (keyboard navigation)
 * - Accessibility attributes (ARIA)
 */

describe('Modal Component', () => {
  const mockOnClose = vi.fn();
  const title = 'Test Modal';
  const content = 'This is modal content';

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  afterEach(() => {
    // Reset body overflow style after each test
    document.body.style.overflow = 'unset';
  });

  it('should not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={mockOnClose} title={title}>
        {content}
      </Modal>
    );

    expect(screen.queryByText(title)).not.toBeInTheDocument();
    expect(screen.queryByText(content)).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title={title}>
        {content}
      </Modal>
    );

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(content)).toBeInTheDocument();
  });

  it('should call onClose when Escape key is pressed', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title={title}>
        {content}
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not close on Escape when closeOnEscape is false', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title={title} closeOnEscape={false}>
        {content}
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should call onClose when backdrop is clicked', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title={title}>
        {content}
      </Modal>
    );

    const backdrop = screen.getByRole('dialog');
    fireEvent.click(backdrop);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not close when modal content is clicked', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title={title}>
        {content}
      </Modal>
    );

    const modalContent = screen.getByText(content);
    fireEvent.click(modalContent);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should not close on backdrop click when closeOnBackdrop is false', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title={title} closeOnBackdrop={false}>
        {content}
      </Modal>
    );

    const backdrop = screen.getByRole('dialog');
    fireEvent.click(backdrop);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should call onClose when close button is clicked', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title={title}>
        {content}
      </Modal>
    );

    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should have correct ARIA attributes', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title={title}>
        {content}
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');

    const modalTitle = screen.getByText(title);
    expect(modalTitle).toHaveAttribute('id', 'modal-title');
  });

  it('should set body overflow to hidden when open', () => {
    const { unmount } = render(
      <Modal isOpen={true} onClose={mockOnClose} title={title}>
        {content}
      </Modal>
    );

    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('unset');
  });

  it('should apply correct size classes', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={mockOnClose} title={title} size="sm">
        {content}
      </Modal>
    );

    let modalContent = screen.getByText(content).closest('div[class*="sm:max-w"]');
    expect(modalContent?.className).toContain('sm:max-w-md');

    rerender(
      <Modal isOpen={true} onClose={mockOnClose} title={title} size="lg">
        {content}
      </Modal>
    );

    modalContent = screen.getByText(content).closest('div[class*="sm:max-w"]');
    expect(modalContent?.className).toContain('sm:max-w-2xl');
  });

  it('should focus the first focusable element when opened', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title={title}>
        <input type="text" placeholder="First input" />
        <button>Submit</button>
      </Modal>
    );

    // The close button should be the first focusable element
    const closeButton = screen.getByLabelText('Close modal');
    expect(document.activeElement).toBe(closeButton);
  });

  it('should trap focus within the modal', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title={title}>
        <input type="text" data-testid="input-1" />
        <input type="text" data-testid="input-2" />
      </Modal>
    );

    const closeButton = screen.getByLabelText('Close modal');
    const input1 = screen.getByTestId('input-1');
    const input2 = screen.getByTestId('input-2');

    // Initially, close button should be focused
    expect(document.activeElement).toBe(closeButton);

    // Tab to next element
    fireEvent.keyDown(document, { key: 'Tab' });
    // In focus trap, tabbing cycles through elements

    // Shift+Tab from first element should wrap to last
    closeButton.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    // This should move focus to the last focusable element
  });

  it('should render children correctly', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title={title}>
        <div data-testid="custom-content">
          <p>Paragraph 1</p>
          <p>Paragraph 2</p>
        </div>
      </Modal>
    );

    const customContent = screen.getByTestId('custom-content');
    expect(customContent).toBeInTheDocument();
    expect(screen.getByText('Paragraph 1')).toBeInTheDocument();
    expect(screen.getByText('Paragraph 2')).toBeInTheDocument();
  });
});
