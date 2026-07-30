import { useState } from 'react';
import Modal from './Modal';

/**
 * Example usage of the Modal component
 * 
 * This file demonstrates various use cases for the shared Modal component.
 */

export function BasicModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Open Basic Modal
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Basic Modal">
        <p>This is a basic modal with default settings.</p>
        <p className="mt-2">Click the backdrop, press Escape, or click the X button to close.</p>
      </Modal>
    </div>
  );
}

export function FormModalExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    setIsOpen(false);
  };

  return (
    <div>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Open Form Modal
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="User Information" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Submit
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function LargeContentModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Open Large Modal
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Terms and Conditions" size="xl">
        <div className="space-y-4">
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
            labore et dolore magna aliqua.
          </p>
          <p>
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
            commodo consequat.
          </p>
          <p>
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur.
          </p>
          <p>
            Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim
            id est laborum.
          </p>

          <div className="flex justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Accept
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function NoBackdropCloseModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Open Modal (No Backdrop Close)
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Important Notice"
        closeOnBackdrop={false}
        closeOnEscape={false}
      >
        <div className="space-y-4">
          <p className="text-yellow-600 dark:text-yellow-400">
            ⚠️ This modal can only be closed by clicking the X button or the Close button below.
          </p>
          <p>Backdrop clicks and Escape key are disabled for this modal.</p>

          <div className="flex justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function ConfirmationModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirm = () => {
    console.log('Action confirmed');
    setIsOpen(false);
  };

  return (
    <div>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
      >
        Delete Item
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Confirm Deletion" size="sm">
        <div className="space-y-4">
          <p>Are you sure you want to delete this item? This action cannot be undone.</p>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Component that demonstrates all examples
export default function ModalExamples() {
  return (
    <div className="space-y-4 p-8">
      <h1 className="mb-6 text-2xl font-bold">Modal Component Examples</h1>

      <div className="space-y-4">
        <BasicModalExample />
        <FormModalExample />
        <LargeContentModalExample />
        <NoBackdropCloseModalExample />
        <ConfirmationModalExample />
      </div>
    </div>
  );
}
