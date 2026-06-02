import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import TitleBar from './TitleBar';

const Layout = () => {
  return (
    <div className='flex flex-col h-screen bg-background font-sans text-text-primary'>
      <TitleBar />
      <div className='relative flex flex-1 overflow-hidden'>
        <div className='pointer-events-none absolute inset-0 bg-mesh-grid opacity-60' />
        <Sidebar />
        <main className='relative flex-1 overflow-y-auto no-scrollbar'>
          <div className='mx-auto w-full max-w-[1440px] px-6 py-6 lg:px-10 lg:py-8'>
            <Outlet />
          </div>
          <Toaster
            richColors
            theme='dark'
            toastOptions={{
              classNames: {
                toast: 'bg-surface border-border text-text-primary',
                title: 'text-text-primary',
                description: 'text-text-secondary',
                actionButton: 'bg-primary text-background',
                cancelButton: 'bg-surface hover:bg-background',
                success: '[&>svg]:text-green-500',
                error: '[&>svg]:text-red-500',
                loading: '!bg-surface !border-primary !text-text-primary',
              },
            }}
          />
        </main>
      </div>
    </div>
  );
};

export default Layout;
