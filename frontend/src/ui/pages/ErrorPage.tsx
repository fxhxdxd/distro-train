import { Link } from 'react-router-dom';
import { SearchX, Home } from 'lucide-react';

const ErrorPage = () => {
  return (
    <div className='relative flex flex-col items-center justify-center h-screen bg-background text-center p-4 overflow-hidden'>
      <div className='absolute w-[420px] h-[420px] bg-primary/20 rounded-full blur-[120px]' />
      <div className='relative glass-panel rounded-2xl p-10 max-w-xl'>
        <div className='w-20 h-20 bg-gradient-to-br from-primary-light/30 to-primary/20 rounded-2xl flex items-center justify-center mx-auto border border-primary/30'>
          <SearchX className='text-primary-light' size={44} />
        </div>
        <h1 className='text-4xl font-bold text-text-primary mt-6 mb-2'>
          Oops! Page Not Found
        </h1>
        <p className='text-lg text-text-secondary mb-8'>
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          to='/'
          className='inline-flex items-center gap-2 bg-gradient-to-r from-primary-light to-primary text-white font-semibold py-3 px-5 rounded-lg hover:shadow-[0_0_24px_rgba(217,70,239,0.24)] transition-all'
        >
          <Home size={20} />
          Go to Homepage
        </Link>
      </div>
    </div>
  );
};

export default ErrorPage;
