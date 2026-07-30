import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole, USER_ROLES } from '../types/user';

/**
 * WelcomePage Component
 * 
 * Displays a personalized welcome message to newly signed-up users
 * Shows role-specific information and quick links to relevant features
 * 
 * Requirements: 1.5, 7.4
 */
export default function WelcomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roleInfo, setRoleInfo] = useState<{ label: string; description: string } | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Get role information
    const role = USER_ROLES.find((r) => r.value === user.role);
    if (role) {
      setRoleInfo({ label: role.label, description: role.description });
    }
  }, [user, navigate]);

  if (!user || !roleInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Role-specific features and quick links
  const getRoleSpecificContent = (role: UserRole) => {
    switch (role) {
      case 'company_owner':
        return {
          features: [
            'Manage your entire fleet and team',
            'Access financial reports and analytics',
            'Invite and manage team members',
            'Configure system settings and permissions',
          ],
          quickLinks: [
            { label: 'View Dashboard', path: '/dashboard', icon: '📊' },
            { label: 'Manage Team', path: '/team', icon: '👥' },
            { label: 'Fleet Overview', path: '/vehicles', icon: '🚛' },
            { label: 'Analytics', path: '/analytics', icon: '📈' },
          ],
        };

      case 'fleet_manager':
        return {
          features: [
            'Oversee vehicle operations and assignments',
            'Manage drivers and schedules',
            'Monitor maintenance activities',
            'Track fleet performance metrics',
          ],
          quickLinks: [
            { label: 'View Dashboard', path: '/dashboard', icon: '📊' },
            { label: 'Vehicles', path: '/vehicles', icon: '🚛' },
            { label: 'Drivers', path: '/drivers', icon: '👤' },
            { label: 'Work Orders', path: '/work-orders', icon: '🔧' },
          ],
        };

      case 'workshop_manager':
        return {
          features: [
            'Manage work orders and repairs',
            'Assign tasks to mechanics',
            'Track maintenance schedules',
            'Manage vendors and parts inventory',
          ],
          quickLinks: [
            { label: 'View Dashboard', path: '/dashboard', icon: '📊' },
            { label: 'Work Orders', path: '/work-orders', icon: '🔧' },
            { label: 'Inventory', path: '/inventory', icon: '📦' },
            { label: 'Vendors', path: '/vendors', icon: '🏪' },
          ],
        };

      case 'maintenance_engineer':
        return {
          features: [
            'Plan and schedule maintenance activities',
            'Create preventive maintenance plans',
            'Monitor vehicle health and performance',
            'Generate maintenance reports',
          ],
          quickLinks: [
            { label: 'View Dashboard', path: '/dashboard', icon: '📊' },
            { label: 'Work Orders', path: '/work-orders', icon: '🔧' },
            { label: 'Vehicles', path: '/vehicles', icon: '🚛' },
            { label: 'Analytics', path: '/analytics', icon: '📈' },
          ],
        };

      case 'mechanic':
        return {
          features: [
            'View and complete assigned work orders',
            'Access repair procedures and documentation',
            'Update work order status and notes',
            'Check parts availability',
          ],
          quickLinks: [
            { label: 'My Work Orders', path: '/dashboard', icon: '🔧' },
            { label: 'All Work Orders', path: '/work-orders', icon: '📋' },
            { label: 'Inventory', path: '/inventory', icon: '📦' },
          ],
        };

      case 'driver':
        return {
          features: [
            'View your assigned vehicles',
            'Report vehicle issues',
            'Check maintenance schedules',
            'Update vehicle odometer readings',
          ],
          quickLinks: [
            { label: 'My Dashboard', path: '/dashboard', icon: '📊' },
            { label: 'My Vehicles', path: '/vehicles', icon: '🚛' },
            { label: 'Settings', path: '/settings', icon: '⚙️' },
          ],
        };

      case 'inspector':
        return {
          features: [
            'Conduct vehicle inspections',
            'Document inspection findings',
            'Monitor compliance status',
            'Generate inspection reports',
          ],
          quickLinks: [
            { label: 'View Dashboard', path: '/dashboard', icon: '📊' },
            { label: 'Vehicles', path: '/vehicles', icon: '🚛' },
            { label: 'Documents', path: '/documents', icon: '📄' },
            { label: 'Analytics', path: '/analytics', icon: '📈' },
          ],
        };

      case 'accountant':
        return {
          features: [
            'Access financial reports',
            'Track maintenance costs',
            'Manage purchase orders',
            'Generate cost analysis',
          ],
          quickLinks: [
            { label: 'View Dashboard', path: '/dashboard', icon: '📊' },
            { label: 'Purchase Orders', path: '/inventory/purchase-orders', icon: '🛒' },
            { label: 'Analytics', path: '/analytics', icon: '📈' },
            { label: 'Work Orders', path: '/work-orders', icon: '🔧' },
          ],
        };

      case 'auditor':
        return {
          features: [
            'Review system activities and changes',
            'Access audit logs',
            'Generate compliance reports',
            'Monitor system usage',
          ],
          quickLinks: [
            { label: 'View Dashboard', path: '/dashboard', icon: '📊' },
            { label: 'Audit Logs', path: '/audit-logs', icon: '📝' },
            { label: 'Analytics', path: '/analytics', icon: '📈' },
          ],
        };

      default:
        return {
          features: ['Access your dashboard', 'View system information'],
          quickLinks: [{ label: 'View Dashboard', path: '/dashboard', icon: '📊' }],
        };
    }
  };

  const content = getRoleSpecificContent(user.role);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-6">
            <svg
              className="w-10 h-10 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to FleetGuard AI!
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">
            Hi {user.full_name}, you're all set!
          </p>
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-full">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Your role: {roleInfo.label}
            </span>
          </div>
        </div>

        {/* Role Information Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            What you can do as a {roleInfo.label}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{roleInfo.description}</p>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Key Features:</h3>
          <ul className="space-y-3 mb-8">
            {content.features.map((feature, index) => (
              <li key={index} className="flex items-start">
                <svg
                  className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">{feature}</span>
              </li>
            ))}
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Links:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {content.quickLinks.map((link, index) => (
              <Link
                key={index}
                to={link.path}
                className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors"
              >
                <span className="text-2xl mr-3">{link.icon}</span>
                <span className="font-medium text-gray-900 dark:text-white">{link.label}</span>
                <svg
                  className="w-5 h-5 ml-auto text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            ))}
          </div>
        </div>

        {/* Get Started Button */}
        <div className="text-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg rounded-lg shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Get Started
            <svg
              className="w-6 h-6 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>

        {/* Help Section */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Need help getting started? Check out our resources or contact support.
          </p>
          <div className="flex justify-center space-x-6">
            <Link
              to="/settings"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Settings
            </Link>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <a
              href="mailto:support@fleetguard.ai"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
