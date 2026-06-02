import React from 'react';
import { Link } from 'react-router-dom';
import { useTraining } from '../../contexts/TrainingContext';
import { Rocket, History } from 'lucide-react';

export const TrainingProgressPhase = () => {
  const { trainerCount } = useTraining();
  return (
    <div className='dashboard-panel rounded-3xl p-8'>
      <div className='text-center flex flex-col items-center'>
        <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15'>
          <Rocket className='h-8 w-8 text-primary-light' />
        </div>
        <h2 className='text-2xl font-bold text-text-primary mb-3'>
          Training Launched Successfully!
        </h2>
        <p className='text-text-secondary mb-4 max-w-lg'>
          Your training job has been submitted to the network and is now being
          processed by{' '}
          <span className='font-bold text-primary'>
            {trainerCount} trainer nodes
          </span>
          .
        </p>
        <p className='text-text-secondary mb-8 max-w-lg'>
          You can now safely leave this page. The final status and model weights
          will appear on the Training History page upon completion.
        </p>
        <Link
          to='/history'
          className='flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-light to-primary px-6 py-3 font-semibold text-white transition-all hover:shadow-[0_0_24px_rgba(217,70,239,0.24)]'
        >
          <History className='w-5 h-5' />
          Go to Training History
        </Link>
      </div>
    </div>
  );
};
