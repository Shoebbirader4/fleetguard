/**
 * DashboardCustomizer Component Tests
 * 
 * Tests for task 25.3 - Drag-and-drop functionality for widget reordering
 * Requirements: 8.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '../../test/test-utils';
import DashboardCustomizer from './DashboardCustomizer';
import * as useDashboardHook from '../../hooks/useDashboard';
import * as useAuthHook from '../../hooks/useAuth';
import { DashboardWidget } from '../../types/dashboard';

// Mock the hooks
vi.mock('../../hooks/useDashboard');
vi.mock('../../hooks/useAuth');

describe('DashboardCustomizer - Drag-and-Drop', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    fullName: 'Test User',
    role: 'fleet_manager',
    tenantId: 'tenant-1',
  };

  const mockWidgets: DashboardWidget[] = [
    {
      id: 'widget-1',
      type: 'fleet-overview',
      title: 'Fleet Overview',
      order: 0,
      visible: true,
      size: 'large',
    },
    {
      id: 'widget-2',
      type: 'vehicle-status',
      title: 'Vehicle Status',
      order: 1,
      visible: true,
      size: 'medium',
    },
    {
      id: 'widget-3',
      type: 'maintenance-alerts',
      title: 'Maintenance Alerts',
      order: 2,
      visible: true,
      size: 'medium',
    },
  ];

  const mockDashboardLayout = {
    user_id: 'user-1',
    role: 'fleet_manager',
    widgets: mockWidgets,
    updated_at: new Date().toISOString(),
  };

  const mockUpdateLayout = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mocks
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      updateProfile: vi.fn(),
    });

    vi.mocked(useDashboardHook.useDashboardLayout).mockReturnValue({
      data: mockDashboardLayout,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(useDashboardHook.useUpdateDashboardLayout).mockReturnValue({
      mutate: mockUpdateLayout,
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as any);
  });

  it('renders customizer with all widgets', () => {
    renderWithProviders(
      <DashboardCustomizer isOpen={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('Customize Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Fleet Overview')).toBeInTheDocument();
    expect(screen.getByText('Vehicle Status')).toBeInTheDocument();
    expect(screen.getByText('Maintenance Alerts')).toBeInTheDocument();
  });

  it('displays drag handles for each widget', () => {
    renderWithProviders(
      <DashboardCustomizer isOpen={true} onClose={mockOnClose} />
    );

    // Check for drag handle buttons (Bars3Icon)
    const dragHandles = screen.getAllByTitle('Drag to reorder');
    expect(dragHandles).toHaveLength(3);
  });

  it('displays up/down buttons for reordering', () => {
    renderWithProviders(
      <DashboardCustomizer isOpen={true} onClose={mockOnClose} />
    );

    // Check for move up buttons
    const moveUpButtons = screen.getAllByTitle('Move up');
    expect(moveUpButtons).toHaveLength(3);

    // Check for move down buttons
    const moveDownButtons = screen.getAllByTitle('Move down');
    expect(moveDownButtons).toHaveLength(3);
  });

  it('moves widget up when up button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DashboardCustomizer isOpen={true} onClose={mockOnClose} />
    );

    // Get all move up buttons
    const moveUpButtons = screen.getAllByTitle('Move up');
    
    // Click the second widget's move up button (should move it to position 0)
    await user.click(moveUpButtons[1]);

    // The Save Changes button should now be enabled (hasChanges = true)
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    expect(saveButton).not.toBeDisabled();
  });

  it('moves widget down when down button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DashboardCustomizer isOpen={true} onClose={mockOnClose} />
    );

    // Get all move down buttons
    const moveDownButtons = screen.getAllByTitle('Move down');
    
    // Click the first widget's move down button (should move it to position 1)
    await user.click(moveDownButtons[0]);

    // The Save Changes button should now be enabled (hasChanges = true)
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    expect(saveButton).not.toBeDisabled();
  });

  it('disables first widget move up button', () => {
    renderWithProviders(
      <DashboardCustomizer isOpen={true} onClose={mockOnClose} />
    );

    const moveUpButtons = screen.getAllByTitle('Move up');
    
    // First widget's move up button should be disabled
    expect(moveUpButtons[0]).toBeDisabled();
  });

  it('disables last widget move down button', () => {
    renderWithProviders(
      <DashboardCustomizer isOpen={true} onClose={mockOnClose} />
    );

    const moveDownButtons = screen.getAllByTitle('Move down');
    
    // Last widget's move down button should be disabled
    expect(moveDownButtons[2]).toBeDisabled();
  });

  it('toggles widget visibility', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DashboardCustomizer isOpen={true} onClose={mockOnClose} />
    );

    // Find and click the visibility toggle for the first widget
    const visibilityToggles = screen.getAllByTitle('Hide widget');
    await user.click(visibilityToggles[0]);

    // Check that the button now shows "Show widget"
    await waitFor(() => {
      expect(screen.getByTitle('Show widget')).toBeInTheDocument();
    });

    // The Save Changes button should be enabled
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    expect(saveButton).not.toBeDisabled();
  });

  it('saves changes and closes modal on save', async () => {
    const user = userEvent.setup();
    
    // Mock successful save
    mockUpdateLayout.mockImplementation((data, options) => {
      if (options?.onSuccess) {
        options.onSuccess(data, data, undefined);
      }
    });

    renderWithProviders(
      <DashboardCustomizer isOpen={true} onClose={mockOnClose} />
    );

    // Make a change (toggle visibility)
    const visibilityToggles = screen.getAllByTitle('Hide widget');
    await user.click(visibilityToggles[0]);

    // Click save
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    await user.click(saveButton);

    // Verify updateLayout was called
    await waitFor(() => {
      expect(mockUpdateLayout).toHaveBeenCalled();
    });

    // Verify onClose was called
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('resets to default layout when reset button is clicked', async () => {
    const user = userEvent.setup();
    
    // Mock window.confirm to return true
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithProviders(
      <DashboardCustomizer isOpen={true} onClose={mockOnClose} />
    );

    // Click reset button
    const resetButton = screen.getByRole('button', { name: /Reset to Default/i });
    await user.click(resetButton);

    // The Save Changes button should be enabled (changes were made)
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    expect(saveButton).not.toBeDisabled();

    // Verify confirm was called
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('reset your dashboard')
    );
  });

  it('shows loading state while fetching dashboard layout', () => {
    vi.mocked(useDashboardHook.useDashboardLayout).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithProviders(
      <DashboardCustomizer isOpen={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('Loading widgets...')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = renderWithProviders(
      <DashboardCustomizer isOpen={false} onClose={mockOnClose} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('confirms before closing if there are unsaved changes', async () => {
    const user = userEvent.setup();
    
    // Mock window.confirm to return false (user cancels)
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderWithProviders(
      <DashboardCustomizer isOpen={true} onClose={mockOnClose} />
    );

    // Make a change
    const visibilityToggles = screen.getAllByTitle('Hide widget');
    await user.click(visibilityToggles[0]);

    // Try to close
    const closeButton = screen.getByLabelText('Close customizer');
    await user.click(closeButton);

    // Verify confirm was called
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('unsaved changes')
    );

    // Verify onClose was NOT called (user canceled)
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
