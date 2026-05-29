import React from 'react';
import { Upload, Users, Coins, Play } from 'lucide-react';
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
    <div className='mb-8'>
      <div className='flex items-start'>
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = currentPhaseNumber > stepNumber;
          const isCurrent = currentPhaseNumber === stepNumber;

          return (
            <React.Fragment key={index}>
              <div className='flex flex-col items-center'>
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 border ${
                    isActive
                      ? 'bg-primary text-background border-primary'
                      : isCurrent
                      ? 'bg-primary/50 text-background border-primary animate-pulse'
                      : 'bg-surface border-border text-text-secondary'
                  }`}
                >
                  <step.icon className='w-5 h-5' />
                </div>
                <span
                  className={`text-xs mt-2 whitespace-nowrap ${
                    isActive || isCurrent
                      ? 'text-text-primary'
                      : 'text-text-secondary'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div className='flex-1 flex items-center h-10'>
                  <div
                    className={`w-full h-px transition-colors duration-500 ${
                      isActive ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
