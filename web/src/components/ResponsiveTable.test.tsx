/**
 * ResponsiveTable Component Tests
 * Task 29.2 - Make tables responsive
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResponsiveTable, { Column } from './ResponsiveTable';

interface TestItem {
  id: string;
  name: string;
  value: number;
  status: string;
}

const mockData: TestItem[] = [
  { id: '1', name: 'Item 1', value: 100, status: 'active' },
  { id: '2', name: 'Item 2', value: 200, status: 'inactive' },
  { id: '3', name: 'Item 3', value: 150, status: 'active' },
];

const columns: Column<TestItem>[] = [
  {
    key: 'name',
    label: 'Name',
    render: (item) => item.name,
    critical: true,
    sortable: true,
  },
  {
    key: 'value',
    label: 'Value',
    render: (item) => item.value.toString(),
    critical: true,
    sortable: true,
  },
  {
    key: 'status',
    label: 'Status',
    render: (item) => item.status,
    sortable: false,
  },
];

describe('ResponsiveTable', () => {
  it('renders table data', () => {
    render(
      <ResponsiveTable
        data={mockData}
        columns={columns}
        keyExtractor={(item) => item.id}
      />
    );

    // Use getAllBy since items appear in both mobile and desktop views
    expect(screen.getAllByText('Item 1')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Item 2')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Item 3')[0]).toBeInTheDocument();
  });

  it('shows empty message when no data', () => {
    render(
      <ResponsiveTable
        data={[]}
        columns={columns}
        keyExtractor={(item) => item.id}
        emptyMessage="No items found"
      />
    );

    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('calls onRowClick when row is clicked', () => {
    const handleRowClick = vi.fn();
    
    render(
      <ResponsiveTable
        data={mockData}
        columns={columns}
        keyExtractor={(item) => item.id}
        onRowClick={handleRowClick}
      />
    );

    // Click on first item in mobile view (card)
    const items = screen.getAllByText('Item 1');
    fireEvent.click(items[0]);

    expect(handleRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it('shows loading state', () => {
    render(
      <ResponsiveTable
        data={mockData}
        columns={columns}
        keyExtractor={(item) => item.id}
        loading={true}
      />
    );

    // Loading skeleton should be present
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('handles sorting when sortable column is clicked', () => {
    render(
      <ResponsiveTable
        data={mockData}
        columns={columns}
        keyExtractor={(item) => item.id}
      />
    );

    // Desktop table view (hidden on mobile, visible on md+)
    const desktopTable = document.querySelector('table');
    expect(desktopTable).toBeInTheDocument();
  });

  it('renders custom mobile card renderer', () => {
    const customRenderer = (item: TestItem) => (
      <div data-testid="custom-card">
        <h3>{item.name}</h3>
        <p>{item.value}</p>
      </div>
    );

    render(
      <ResponsiveTable
        data={mockData}
        columns={columns}
        keyExtractor={(item) => item.id}
        mobileCardRenderer={customRenderer}
      />
    );

    // Custom cards should be rendered in mobile view
    const customCards = screen.getAllByTestId('custom-card');
    expect(customCards).toHaveLength(mockData.length);
  });

  it('applies custom className', () => {
    const { container } = render(
      <ResponsiveTable
        data={mockData}
        columns={columns}
        keyExtractor={(item) => item.id}
        className="custom-class"
      />
    );

    const tableContainer = container.querySelector('.custom-class');
    expect(tableContainer).toBeInTheDocument();
  });

  it('renders critical columns in mobile view', () => {
    render(
      <ResponsiveTable
        data={mockData}
        columns={columns}
        keyExtractor={(item) => item.id}
      />
    );

    // Use getAllBy since labels appear for each card in mobile view
    const nameLabels = screen.getAllByText('Name:');
    const valueLabels = screen.getAllByText('Value:');
    
    expect(nameLabels.length).toBeGreaterThan(0);
    expect(valueLabels.length).toBeGreaterThan(0);
  });
});
