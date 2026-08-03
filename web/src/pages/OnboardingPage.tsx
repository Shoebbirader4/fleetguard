import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface OnboardingData {
  companySize: string;
  fleetSize: string;
  primaryUseCase: string;
}

/**
 * OnboardingPage Component
 * 
 * Multi-step onboarding wizard for first-time company owners
 * Collects company details and preferences to personalize the experience
 * 
 * Requirements: 7.3, 7.5
 */
export default function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    companySize: '',
    fleetSize: '',
    primaryUseCase: '',
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Only allow company owners to access onboarding
    if (user.role !== 'company_owner') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleInputChange = (field: keyof OnboardingData, value: string) => {
    setOnboardingData(prev => ({
      ...prev,
      [field]: value,
    }));
    setError('');
  };

  const handleNext = () => {
    // Validate current step
    if (currentStep === 1 && !onboardingData.companySize) {
      setError('Please select your company size');
      return;
    }
    if (currentStep === 1 && !onboardingData.fleetSize) {
      setError('Please enter your fleet size');
      return;
    }
    if (currentStep === 2 && !onboardingData.primaryUseCase) {
      setError('Please select your primary use case');
      return;
    }

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      setError('');
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  const handleSkipToDashboard = () => {
    navigate('/dashboard');
  };

  const handleFinish = async () => {
    setLoading(true);
    setError('');

    try {
      if (!user) {
        throw new Error('User not found');
      }

      // Save onboarding data to tenant settings
      // We'll store this as JSON in a settings field or create a separate onboarding_data table
      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.tenantId);

      if (updateError) {
        console.error('Failed to update tenant:', updateError);
      }

      // Optionally: Save onboarding preferences to user metadata or a settings table
      // For now, we'll just log the data
      console.log('Onboarding data:', onboardingData);

      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding');
      console.error('Onboarding error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalSteps = 3;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to FleetGuard AI!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Let's set up your account in just a few steps
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Step {currentStep} of {totalSteps}
            </span>
            <button
              onClick={handleSkipToDashboard}
              className="text-sm font-normal leading-normal text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              Skip to Dashboard →
            </button>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded-lg mb-6 text-sm font-normal leading-normal">
              {error}
            </div>
          )}

          {/* Step 1: Company Details */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Tell us about your company
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This helps us personalize your experience
              </p>

              <div className="space-y-6">
                {/* Company Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Company Size
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { value: '1-10', label: '1-10 employees', icon: '👤' },
                      { value: '11-50', label: '11-50 employees', icon: '👥' },
                      { value: '51-200', label: '51-200 employees', icon: '👨‍👩‍👧‍👦' },
                      { value: '200+', label: '200+ employees', icon: '🏢' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleInputChange('companySize', option.value)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          onboardingData.companySize === option.value
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{option.icon}</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {option.label}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fleet Size */}
                <div>
                  <label htmlFor="fleetSize" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    How many vehicles do you manage?
                  </label>
                  <input
                    id="fleetSize"
                    type="number"
                    min="1"
                    value={onboardingData.fleetSize}
                    onChange={(e) => handleInputChange('fleetSize', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., 25"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Primary Use Case */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                What's your primary use case?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We'll customize your dashboard based on your selection
              </p>

              <div className="space-y-4">
                {[
                  {
                    value: 'logistics',
                    label: 'Logistics & Transportation',
                    description: 'Fleet management for delivery and transport services',
                    icon: '🚚',
                  },
                  {
                    value: 'construction',
                    label: 'Construction Equipment',
                    description: 'Heavy equipment and machinery maintenance',
                    icon: '🏗️',
                  },
                  {
                    value: 'public_transport',
                    label: 'Public Transportation',
                    description: 'Bus and shuttle services',
                    icon: '🚌',
                  },
                  {
                    value: 'service_fleet',
                    label: 'Service Fleet',
                    description: 'Field service vehicles and mobile operations',
                    icon: '🔧',
                  },
                  {
                    value: 'other',
                    label: 'Other',
                    description: 'Custom fleet management needs',
                    icon: '🚗',
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleInputChange('primaryUseCase', option.value)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      onboardingData.primaryUseCase === option.value
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <div className="flex items-start">
                      <span className="text-3xl mr-4">{option.icon}</span>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white mb-1">
                          {option.label}
                        </div>
                        <div className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                          {option.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Quick Setup Preferences */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                You're all set!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Here's what you can do next:
              </p>

              <div className="space-y-4">
                <div className="flex items-start p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
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
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white mb-1">
                      Add your vehicles
                    </div>
                    <div className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                      Start by adding vehicles to your fleet
                    </div>
                  </div>
                </div>

                <div className="flex items-start p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <svg
                    className="w-6 h-6 text-blue-500 mr-3 flex-shrink-0 mt-0.5"
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
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white mb-1">
                      Invite your team
                    </div>
                    <div className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                      Add team members and assign roles
                    </div>
                  </div>
                </div>

                <div className="flex items-start p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                  <svg
                    className="w-6 h-6 text-purple-500 mr-3 flex-shrink-0 mt-0.5"
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
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white mb-1">
                      Set up maintenance schedules
                    </div>
                    <div className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                      Create work orders and schedule maintenance
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                    You can always access settings and customize your preferences from the dashboard.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="px-6 py-2 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </span>
              ) : currentStep === totalSteps ? (
                'Complete Setup'
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
            Need help?{' '}
            <a
              href="mailto:support@fleetguard.ai"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
