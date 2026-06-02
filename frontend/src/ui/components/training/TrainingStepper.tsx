import React from 'react';
import { Check, Upload, Users, Coins, Play } from 'lucide-react';
import {
  useTraining,
  type TrainingPhase,
} from '../../contexts/TrainingContext';

export const TrainingStepper = () => {
  const { currentPhase } = useTraining();

  const getPhaseStep = (phase: TrainingPhase): number => {
    const phases: TrainingPhase[] = [
      'upload',
      'payment',
      'assembling',
      'training',
    ];
    return phases.indexOf(phase) + 1;
  };

  const steps = [
    { icon: Upload, label: 'Upload', phase: 'upload' },
    { icon: Coins, label: 'Payment', phase: 'payment' },
    { icon: Users, label: 'Assemble', phase: 'assembling' },
    { icon: Play, label: 'Training', phase: 'training' },
  ];

  const currentPhaseNumber = getPhaseStep(currentPhase);

  return (
    <div className='rounded-2xl border border-white/10 px-4 py-5'>
      <div className='grid gap-4 md:grid-cols-4'>
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = currentPhaseNumber > stepNumber;
          const isCurrent = currentPhaseNumber === stepNumber;

          return (
            <React.Fragment key={index}>
              <div
                className='relative flex items-center gap-3 md:flex-col md:items-start'
              >
                {index < steps.length - 1 && (
                  <div
                    className={`absolute left-[3.5rem] right-[-1rem] top-5 hidden h-px md:block ${
                      isActive ? 'bg-primary/70' : 'bg-white/10'
                    }`}
                  />
                )}
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-300 ${
                    isActive
                      ? 'border-primary bg-gradient-to-br from-primary-light to-primary text-white shadow-lg shadow-primary/20'
                      : isCurrent
                        ? 'border-primary bg-primary/25 text-white'
                        : 'border-white/10 bg-white/5 text-text-secondary'
                  }`}
                >
                  {isActive ? (
                    <Check className='h-5 w-5' />
                  ) : (
                    <step.icon className='h-5 w-5' />
                  )}
                </div>
                <div className='min-w-0 md:w-full'>
                  <span
                    className={`block text-sm font-semibold ${
                    isActive || isCurrent
                      ? 'text-text-primary'
                      : 'text-text-secondary'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className='mt-1 block text-xs text-text-secondary'>
                    0{stepNumber}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
