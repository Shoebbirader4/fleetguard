/**
 * Accessibility Test Page
 * 
 * Demonstration page for testing all accessibility features.
 * This page is for testing purposes and can be removed in production.
 * 
 * Task 30 - Implement accessibility features
 * Requirements: 5.2, 5.8
 */

import { useState } from 'react';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Textarea from '../components/Textarea';
import Modal from '../components/Modal';
import IconButton from '../components/IconButton';
import Tooltip from '../components/Tooltip';
import { toast } from '../components/ToastContainer';

export default function AccessibilityTestPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.role) newErrors.role = 'Role is required';
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      toast.success('Form submitted successfully!');
      setFormData({ name: '', email: '', role: '', message: '' });
    } else {
      toast.error('Please fix form errors');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Accessibility Features Test
        </h1>
        <p className="text-base font-normal leading-normal text-gray-600 dark:text-gray-400">
          This page demonstrates all accessibility features including keyboard navigation, 
          screen reader support, focus indicators, and tooltips.
        </p>
      </header>

      {/* Keyboard Navigation Section */}
      <section className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Keyboard Navigation
        </h2>
        <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400 mb-4">
          Try navigating this page using Tab (forward), Shift+Tab (backward), and Escape (close modals).
        </p>
        
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => toast.success('Primary button clicked')}>
            Primary Button
          </Button>
          <Button variant="secondary" onClick={() => toast.info('Secondary button clicked')}>
            Secondary Button
          </Button>
          <Button variant="danger" onClick={() => toast.warning('Danger button clicked')}>
            Danger Button
          </Button>
          <Button variant="success" onClick={() => toast.success('Success button clicked')}>
            Success Button
          </Button>
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            Open Modal (Escape to close)
          </Button>
        </div>
      </section>

      {/* Icon Buttons with Tooltips */}
      <section className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Icon Buttons with Tooltips
        </h2>
        <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400 mb-4">
          Hover or focus on icon buttons to see tooltips. All icon buttons have ARIA labels.
        </p>
        
        <div className="flex flex-wrap gap-3 items-center">
          <IconButton
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            }
            label="Edit"
            variant="ghost"
            onClick={() => toast.info('Edit clicked')}
          />
          <IconButton
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            }
            label="Delete"
            variant="danger"
            onClick={() => toast.warning('Delete clicked')}
          />
          <IconButton
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            }
            label="Download"
            variant="secondary"
            onClick={() => toast.info('Download clicked')}
          />
          <IconButton
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            }
            label="Share"
            variant="primary"
            onClick={() => toast.success('Share clicked')}
          />
        </div>
      </section>

      {/* Form with Accessibility */}
      <section className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Accessible Form
        </h2>
        <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400 mb-4">
          All form fields have proper labels, ARIA attributes, and error announcements for screen readers.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            required
            helperText="Enter your full name as it appears on official documents"
          />
          
          <Input
            label="Email Address"
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            required
            helperText="We'll never share your email with anyone else"
          />
          
          <Select
            label="Role"
            id="role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            error={errors.role}
            required
            helperText="Select your primary role in the organization"
          >
            <option value="">Select a role...</option>
            <option value="company_owner">Company Owner</option>
            <option value="fleet_manager">Fleet Manager</option>
            <option value="mechanic">Mechanic</option>
            <option value="driver">Driver</option>
          </Select>
          
          <Textarea
            label="Message"
            id="message"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            rows={4}
            helperText="Optional: Share any additional information"
          />
          
          <div className="flex gap-3">
            <Button type="submit" variant="primary">
              Submit Form
            </Button>
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => {
                setFormData({ name: '', email: '', role: '', message: '' });
                setErrors({});
                toast.info('Form reset');
              }}
            >
              Reset
            </Button>
          </div>
        </form>
      </section>

      {/* Focus Indicators */}
      <section className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Focus Indicators
        </h2>
        <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400 mb-4">
          All interactive elements have visible focus rings with sufficient contrast (blue ring in light mode).
        </p>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Tooltip content="This is a helpful tooltip">
              <span className="text-sm font-normal leading-normal text-gray-700 dark:text-gray-300 cursor-help underline decoration-dotted">
                Hover or focus here for a tooltip
              </span>
            </Tooltip>
          </div>
          
          <div className="flex gap-2">
            <a
              href="#keyboard-navigation"
              className="text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1"
            >
              Internal Link
            </a>
            <span className="text-gray-400">|</span>
            <button
              type="button"
              className="text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1"
              onClick={() => toast.info('Text button clicked')}
            >
              Text Button
            </button>
          </div>
        </div>
      </section>

      {/* Screen Reader Support */}
      <section className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Screen Reader Support
        </h2>
        <ul className="list-disc list-inside space-y-2 text-sm font-normal leading-normal text-gray-700 dark:text-gray-300">
          <li>Semantic HTML elements (header, main, nav, section, article)</li>
          <li>ARIA labels for icon buttons and interactive elements</li>
          <li>ARIA live regions for dynamic content updates (toasts)</li>
          <li>Associated form labels with input elements using htmlFor</li>
          <li>Error messages announced by screen readers with role="alert"</li>
          <li>Skip link to main content (try pressing Tab from the top)</li>
          <li>Proper heading hierarchy (h1, h2, h3)</li>
        </ul>
      </section>

      {/* Test Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Test Modal"
        closeOnEscape
        closeOnBackdrop
      >
        <div className="space-y-4">
          <p className="text-sm font-normal leading-normal text-gray-700 dark:text-gray-300">
            This modal demonstrates keyboard navigation and focus trapping.
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm font-normal leading-normal text-gray-700 dark:text-gray-300">
            <li>Press Tab to move forward through focusable elements</li>
            <li>Press Shift+Tab to move backward</li>
            <li>Press Escape to close the modal</li>
            <li>Focus is trapped within the modal while open</li>
            <li>Focus returns to the trigger button when closed</li>
          </ul>
          
          <div className="flex gap-3 pt-4">
            <Input
              label="Test Input"
              placeholder="Try tabbing through..."
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button variant="primary" onClick={() => setModalOpen(false)}>
              Close Modal
            </Button>
            <Button variant="secondary" onClick={() => toast.info('Action in modal')}>
              Another Action
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
