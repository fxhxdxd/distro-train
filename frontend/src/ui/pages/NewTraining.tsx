import React, { useEffect } from 'react';
import { Brain, Cpu, Database, Network, ShieldCheck } from 'lucide-react';
import { useTraining } from '../contexts/TrainingContext';
import { TrainingStepper } from '../components/training/TrainingStepper';
import { UploadPhase } from '../components/training/UploadPhase';
import { AssemblingPhase } from '../components/training/AssemblingPhase';
import { PaymentPhase } from '../components/training/PaymentPhase';
import { TrainingProgressPhase } from '../components/training/TrainingProgressPhase';
import { CompletedPhase } from '../components/training/CompletedPhase';

const NewTrainingPage = () => {
  const { currentPhase, resetTraining } = useTraining();

  const phaseLabel =
    currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1);

  const summaryCards = [
    {
      label: 'Storage',
      value: 'IPFS/Akave',
      icon: Database,
    },
    {
      label: 'Settlement',
      value: 'Hedera',
      icon: ShieldCheck,
    },
    {
      label: 'Network',
      value: 'P2P trainers',
      icon: Network,
    },
    {
      label: 'Phase',
      value: phaseLabel,
      icon: Cpu,
    },
  ];

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
    <div className='min-h-full space-y-6'>
      <section className='dashboard-panel overflow-hidden rounded-3xl'>
        <div className='flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8'>
          <div className='flex items-start gap-4'>
            <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/35 bg-gradient-to-br from-primary-light/35 to-primary/15 shadow-[0_0_30px_rgba(168,85,247,0.2)]'>
              <Brain className='h-7 w-7 text-primary-light' />
            </div>
            <div>
              <div className='mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary-light'>
                <span className='h-1.5 w-1.5 rounded-full bg-emerald-300' />
                Secure training pipeline
              </div>
              <h1 className='text-3xl font-bold text-text-primary lg:text-4xl'>
                New Training Job
              </h1>
              <p className='mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary lg:text-base'>
                Upload your dataset and training script, initialize escrow, and
                launch a distributed federated round across the P2P network.
              </p>
            </div>
          </div>
          <div className='grid grid-cols-2 gap-3 lg:w-[440px]'>
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className='rounded-2xl border border-white/10 bg-white/[0.035] p-4'
              >
                <div className='mb-3 flex items-center justify-between'>
                  <span className='text-xs text-text-secondary'>
                    {card.label}
                  </span>
                  <card.icon className='h-4 w-4 text-primary-light' />
                </div>
                <p className='text-sm font-semibold text-text-primary'>
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className='mx-auto grid w-full max-w-6xl gap-6'>
        <TrainingStepper />
        <div className='space-y-6'>{renderCurrentPhase()}</div>
      </div>
    </div>
  );
};

export default NewTrainingPage;
