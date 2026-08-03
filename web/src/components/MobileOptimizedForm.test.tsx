/**
 * MobileOptimizedForm Component Tests
 * Task 29.3 - Optimize forms for mobile
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MobileOptimizedForm, {
  FormField,
  SelectField,
  TextareaField,
  FormActions,
} from './MobileOptimizedForm';

describe('MobileOptimizedForm', () => {
  it('renders form with title and subtitle', () => {
    render(
      <MobileOptimizedForm
        onSubmit={vi.fn()}
        title="Test Form"
        subtitle="Test subtitle"
      >
        <div>Form content</div>
      </MobileOptimizedForm>
    );

    expect(screen.getByText('Test Form')).toBeInTheDocument();
    expect(screen.getByText('Test subtitle')).toBeInTheDocument();
  });

  it('calls onSubmit when form is submitted', () => {
    const handleSubmit = vi.fn((e) => e.preventDefault());

    render(
      <MobileOptimizedForm onSubmit={handleSubmit}>
        <button type="submit">Submit</button>
      </MobileOptimizedForm>
    );

    fireEvent.click(screen.getByText('Submit'));
    expect(handleSubmit).toHaveBeenCalled();
  });
});

describe('FormField', () => {
  it('renders input with label', () => {
    render(
      <FormField
        label="Test Field"
        name="test"
        value=""
        onChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Test Field')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(
      <FormField
        label="Test Field"
        name="test"
        value=""
        onChange={vi.fn()}
        required
      />
    );

    const asterisk = document.querySelector('.text-red-500');
    expect(asterisk).toBeInTheDocument();
    expect(asterisk?.textContent).toBe('*');
  });

  it('displays error message', () => {
    render(
      <FormField
        label="Test Field"
        name="test"
        value=""
        onChange={vi.fn()}
        error="This field is required"
      />
    );

    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('displays helper text', () => {
    render(
      <FormField
        label="Test Field"
        name="test"
        value=""
        onChange={vi.fn()}
        helperText="Enter your name"
      />
    );

    expect(screen.getByText('Enter your name')).toBeInTheDocument();
  });

  it('calls onChange when value changes', () => {
    const handleChange = vi.fn();

    render(
      <FormField
        label="Test Field"
        name="test"
        value=""
        onChange={handleChange}
      />
    );

    const input = screen.getByLabelText('Test Field') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'new value' } });

    expect(handleChange).toHaveBeenCalledWith('new value');
  });

  it('supports different input types', () => {
    render(
      <FormField
        label="Email"
        name="email"
        type="email"
        value=""
        onChange={vi.fn()}
      />
    );

    const input = screen.getByLabelText('Email') as HTMLInputElement;
    expect(input.type).toBe('email');
  });

  it('applies minimum height for touch targets', () => {
    render(
      <FormField
        label="Test Field"
        name="test"
        value=""
        onChange={vi.fn()}
      />
    );

    const input = screen.getByLabelText('Test Field') as HTMLInputElement;
    expect(input.className).toContain('min-h-[44px]');
  });
});

describe('SelectField', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3', disabled: true },
  ];

  it('renders select with options', () => {
    render(
      <SelectField
        label="Test Select"
        name="test"
        value=""
        onChange={vi.fn()}
        options={options}
      />
    );

    expect(screen.getByLabelText('Test Select')).toBeInTheDocument();
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('shows placeholder when provided', () => {
    render(
      <SelectField
        label="Test Select"
        name="test"
        value=""
        onChange={vi.fn()}
        options={options}
        placeholder="Choose an option"
      />
    );

    expect(screen.getByText('Choose an option')).toBeInTheDocument();
  });

  it('disables specific options', () => {
    render(
      <SelectField
        label="Test Select"
        name="test"
        value=""
        onChange={vi.fn()}
        options={options}
      />
    );

    const select = screen.getByLabelText('Test Select') as HTMLSelectElement;
    const disabledOption = Array.from(select.options).find(
      (opt) => opt.value === 'option3'
    );

    expect(disabledOption?.disabled).toBe(true);
  });
});

describe('TextareaField', () => {
  it('renders textarea with label', () => {
    render(
      <TextareaField
        label="Test Textarea"
        name="test"
        value=""
        onChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Test Textarea')).toBeInTheDocument();
  });

  it('sets custom rows', () => {
    render(
      <TextareaField
        label="Test Textarea"
        name="test"
        value=""
        onChange={vi.fn()}
        rows={10}
      />
    );

    const textarea = screen.getByLabelText('Test Textarea') as HTMLTextAreaElement;
    expect(textarea.rows).toBe(10);
  });
});

describe('FormActions', () => {
  it('renders submit button', () => {
    render(<FormActions />);
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('renders cancel button when onCancel is provided', () => {
    render(<FormActions onCancel={vi.fn()} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const handleCancel = vi.fn();
    render(<FormActions onCancel={handleCancel} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(handleCancel).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<FormActions isSubmitting={true} />);
    expect(screen.getByText('Submitting...')).toBeInTheDocument();
  });

  it('disables submit button when submitDisabled is true', () => {
    render(<FormActions submitDisabled={true} />);
    
    const submitButton = screen.getByText('Submit');
    expect(submitButton).toBeDisabled();
  });

  it('uses custom labels', () => {
    render(
      <FormActions
        submitLabel="Save Changes"
        cancelLabel="Go Back"
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Go Back')).toBeInTheDocument();
  });

  it('applies minimum height for touch targets', () => {
    render(<FormActions />);
    
    const submitButton = screen.getByText('Submit');
    expect(submitButton.className).toContain('min-h-[44px]');
  });
});
