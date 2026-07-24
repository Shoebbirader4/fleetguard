import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { toast } from '../../components/ToastContainer';
import ConfirmationModal from '../../components/ConfirmationModal';

export default function InspectionChecklistPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<any>(null);
  const [deleteChecklistId, setDeleteChecklistId] = useState<string | null>(null);

  // Fetch inspection checklists
  const { data: checklists, isLoading } = useQuery({
    queryKey: ['inspection-checklists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspection_checklists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Delete checklist mutation
  const deleteChecklistMutation = useMutation({
    mutationFn: async (checklistId: string) => {
      const { error } = await supabase
        .from('inspection_checklists')
        .delete()
        .eq('id', checklistId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-checklists'] });
      setDeleteChecklistId(null);
      toast.success('Checklist deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete checklist: ${error.message}`);
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Inspection Checklists
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Configure inspection checklists for different vehicle types
              </p>
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              + Create Checklist
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Checklists List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="card text-center py-8 text-gray-600 dark:text-gray-400">
              Loading checklists...
            </div>
          ) : checklists && checklists.length > 0 ? (
            checklists.map((checklist) => (
              <div key={checklist.id} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {checklist.checklist_name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {checklist.description || 'No description'}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Vehicle Types: {checklist.vehicle_types?.join(', ') || 'All'}</span>
                      <span>•</span>
                      <span>Items: {checklist.checklist_items?.length || 0}</span>
                      <span>•</span>
                      <span>Created: {formatDate(checklist.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingChecklist(checklist)}
                      className="px-3 py-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteChecklistId(checklist.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Checklist Items Preview */}
                {checklist.checklist_items && checklist.checklist_items.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Checklist Items:
                    </h4>
                    <ul className="space-y-1">
                      {checklist.checklist_items.slice(0, 5).map((item: any, index: number) => (
                        <li key={index} className="text-sm text-gray-600 dark:text-gray-400">
                          {index + 1}. {item.item_name} ({item.item_type})
                        </li>
                      ))}
                      {checklist.checklist_items.length > 5 && (
                        <li className="text-sm text-gray-500 dark:text-gray-500 italic">
                          ... and {checklist.checklist_items.length - 5} more items
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="card text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No inspection checklists configured. Create your first checklist to get started.
              </p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                + Create Checklist
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Modal Placeholder */}
      {(createModalOpen || editingChecklist) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              {editingChecklist ? 'Edit Checklist' : 'Create New Checklist'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Checklist creation/editing form will be implemented here with drag-and-drop item reordering.
            </p>
            <button
              onClick={() => {
                setCreateModalOpen(false);
                setEditingChecklist(null);
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteChecklistId}
        onClose={() => setDeleteChecklistId(null)}
        onConfirm={() => deleteChecklistId && deleteChecklistMutation.mutate(deleteChecklistId)}
        title="Delete Inspection Checklist?"
        message="Are you sure you want to delete this checklist? This action cannot be undone. Any inspections using this checklist will no longer have access to it."
        type="danger"
        confirmText="Delete Checklist"
        isLoading={deleteChecklistMutation.isPending}
      />
    </div>
  );
}
