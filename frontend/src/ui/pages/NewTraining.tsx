import React, { useEffect } from 'react';
import { Brain } from 'lucide-react';
import { useTraining } from '../contexts/TrainingContext';
import { TrainingStepper } from '../components/training/TrainingStepper';
import { UploadPhase } from '../components/training/UploadPhase';
import { AssemblingPhase } from '../components/training/AssemblingPhase';
import { PaymentPhase } from '../components/training/PaymentPhase';
import { TrainingProgressPhase } from '../components/training/TrainingProgressPhase';
import { CompletedPhase } from '../components/training/CompletedPhase';

const NewTrainingPage = () => {
  const { currentPhase, resetTraining } = useTraining();

  useEffect(() => {
    if (currentPhase === 'completed') {
      resetTraining();
    }
  }, []);

  const renderCurrentPhase = () => {
    switch (currentPhase) {
      case 'upload':
        return <UploadPhase />;
      case 'assembling':
        return <AssemblingPhase />;
      case 'payment':
        return <PaymentPhase />;
      case 'training':
        return <TrainingProgressPhase />;
      case 'completed':
        return <CompletedPhase />;
      default:
        return <UploadPhase />;
    }
  };

  return (
    <div className='min-h-full'>
      <div className='glass-panel rounded-xl p-5 mb-6'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 bg-gradient-to-br from-primary-light/30 to-primary/20 rounded-lg flex items-center justify-center border border-primary/30'>
            <Brain className='w-5 h-5 text-primary-light' />
          </div>
          <div>
            <h1 className='text-2xl font-bold text-text-primary'>
              New Training Job
            </h1>
            <p className='text-sm text-text-secondary mt-0.5'>
              Decentralized federated training across the P2P network.
            </p>
          </div>
        </div>
      </div>

      <div className='max-w-4xl mx-auto'>
        <TrainingStepper />
        <div className='space-y-6'>{renderCurrentPhase()}</div>
      </div>
    </div>
  );
};

export default NewTrainingPage;
