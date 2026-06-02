import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, Save, Shield, Key, Lock, Settings } from 'lucide-react';

const SettingsPage = () => {
  const { settings, saveSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState(settings);
  const [isLoading, setIsLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState({
    pinataApiKey: false,
    pinataSecretKey: false,
  });
  const [errors, setErrors] = useState({
    pinataApiKey: '',
    pinataSecretKey: '',
  });
  const navigate = useNavigate();

  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'pinataApiKey':
        return value.trim() === '' ? 'Pinata API Key is required' : '';
      case 'pinataSecretKey':
        return value.trim() === '' ? 'Pinata Secret Key is required' : '';
      default:
        return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalSettings((prev) => ({ ...prev, [name]: value }));

    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const toggleVisibility = (field: keyof typeof showCredentials) => {
    setShowCredentials((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const validateForm = () => {
    const newErrors = {
      pinataApiKey: validateField(
        'pinataApiKey',
        localSettings.pinataApiKey
      ),
      pinataSecretKey: validateField(
        'pinataSecretKey',
        localSettings.pinataSecretKey
      ),
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    setIsLoading(true);

    try {
      await saveSettings(localSettings);
      toast.success('Settings saved successfully!');
      setTimeout(() => navigate('/training'), 1000);
    } catch (error) {
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-full space-y-6'>
      <section className='dashboard-panel rounded-3xl p-6 lg:p-8'>
        <div className='flex items-start gap-4'>
          <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/35 bg-gradient-to-br from-primary-light/35 to-primary/15'>
            <Settings className='h-7 w-7 text-primary-light' />
          </div>
          <div>
            <h1 className='text-3xl font-bold text-text-primary'>Settings</h1>
            <p className='mt-2 max-w-xl text-sm leading-relaxed text-text-secondary'>
              Manage credentials used by the decentralized storage pipeline.
              Values are saved locally for this desktop app.
            </p>
          </div>
        </div>
      </section>

      <div className='grid max-w-5xl gap-6 lg:grid-cols-[1fr_360px]'>
        <div className='order-2 lg:order-2'>
          <div className='rounded-3xl border border-primary/20 bg-primary/10 p-5'>
            <div className='flex items-start gap-3'>
              <Shield className='mt-0.5 h-5 w-5 text-primary-light' />
              <div>
                <h3 className='font-medium text-text-primary'>
                  Secure Credentials Storage
                </h3>
                <p className='mt-1 text-sm text-text-secondary'>
                  Your API credentials are stored locally and never sent to
                  external servers.
                </p>
              </div>
            </div>
          </div>
          <div className='mt-4 rounded-3xl border border-white/10 bg-white/[0.035] p-5'>
            <h3 className='mb-2 font-medium text-text-primary'>
              Need help getting your credentials?
            </h3>
            <p className='mb-3 text-sm text-text-secondary'>
              Sign up at Pinata.cloud and generate your API Key and Secret Key
              from the API Keys section of your dashboard.
            </p>
            <a
              href='https://docs.pinata.cloud/account-management/api-keys'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-2 text-sm font-medium text-primary-light hover:text-primary'
            >
              Go to Pinata Documentation
              <svg
                className='h-3 w-3'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
                />
              </svg>
            </a>
          </div>
        </div>

        <div className='order-1 dashboard-panel overflow-hidden rounded-3xl'>
          <div className='p-6 border-b border-white/10 bg-primary/5'>
            <h2 className='text-lg font-semibold text-text-primary'>
              Pinata Credentials
            </h2>
            <p className='text-text-secondary text-sm mt-1'>
              Configure your Pinata API credentials to enable IPFS file storage
              and retrieval.
            </p>
          </div>

          <form onSubmit={handleSubmit} className='p-6'>
            <div className='space-y-6'>
              <div>
                <label className='flex items-center gap-2 text-sm font-medium text-text-primary mb-3'>
                  <Key className='w-4 h-4' />
                  Pinata API Key
                </label>
                <div className='relative'>
                  <input
                    type={showCredentials.pinataApiKey ? 'text' : 'password'}
                    name='pinataApiKey'
                    value={localSettings.pinataApiKey}
                    onChange={handleChange}
                    className={`dashboard-input w-full ${
                      errors.pinataApiKey ? 'border-red-500' : 'border-border'
                    } rounded-2xl p-3 pr-12 text-text-primary focus:outline-none`}
                    placeholder='Enter your Pinata API Key'
                  />
                  <button
                    type='button'
                    onClick={() => toggleVisibility('pinataApiKey')}
                    className='absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors'
                  >
                    {showCredentials.pinataApiKey ? (
                      <EyeOff className='w-4 h-4' />
                    ) : (
                      <Eye className='w-4 h-4' />
                    )}
                  </button>
                </div>
                {errors.pinataApiKey && (
                  <p className='text-red-500 text-sm mt-1'>
                    {errors.pinataApiKey}
                  </p>
                )}
              </div>

              <div>
                <label className='flex items-center gap-2 text-sm font-medium text-text-primary mb-3'>
                  <Lock className='w-4 h-4' />
                  Pinata Secret Key
                </label>
                <div className='relative'>
                  <input
                    type={
                      showCredentials.pinataSecretKey ? 'text' : 'password'
                    }
                    name='pinataSecretKey'
                    value={localSettings.pinataSecretKey}
                    onChange={handleChange}
                    className={`dashboard-input w-full ${
                      errors.pinataSecretKey
                        ? 'border-red-500'
                        : 'border-border'
                    } rounded-2xl p-3 pr-12 text-text-primary focus:outline-none`}
                    placeholder='Enter your Pinata Secret Key'
                  />
                  <button
                    type='button'
                    onClick={() => toggleVisibility('pinataSecretKey')}
                    className='absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors'
                  >
                    {showCredentials.pinataSecretKey ? (
                      <EyeOff className='w-4 h-4' />
                    ) : (
                      <Eye className='w-4 h-4' />
                    )}
                  </button>
                </div>
                {errors.pinataSecretKey && (
                  <p className='text-red-500 text-sm mt-1'>
                    {errors.pinataSecretKey}
                  </p>
                )}
              </div>
            </div>

            <div className='flex gap-3 mt-8'>
              <button
                type='submit'
                disabled={isLoading}
                className={`flex-1 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-medium transition-all ${
                  isLoading
                    ? 'bg-primary/20 text-text-secondary cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary-light to-primary text-white hover:shadow-[0_0_24px_rgba(217,70,239,0.24)] active:scale-[0.98]'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className='w-4 h-4 border-2 border-text-secondary/30 border-t-text-secondary rounded-full animate-spin' />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className='w-4 h-4' />
                    Save Credentials
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default SettingsPage;
