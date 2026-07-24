import { useNavigate, useLocation } from 'react-router-dom';

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'users', label: 'User Management', path: '/settings/users' },
    { id: 'checklists', label: 'Inspection Checklists', path: '/settings/checklists' },
    { id: 'notifications', label: 'Notification Preferences', path: '/settings/notifications' },
    { id: 'appearance', label: 'Appearance', path: '/settings/appearance' },
  ];

  const activeTab = tabs.find((tab) => location.pathname.startsWith(tab.path))?.id || 'users';

  const handleTabClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage your system configuration and preferences
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="card mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.path)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content Placeholder */}
        <div className="card">
          <p className="text-gray-600 dark:text-gray-400">
            Please select a tab or navigate to a specific settings page.
          </p>
          <div className="mt-4 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.path)}
                className="block w-full text-left px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                → {tab.label}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
