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
    <div className='relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] px-5 py-6'>
      <div className='pointer-events-none absolute inset-x-8 top-1/2 hidden h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent md:block' />
      <div className='relative grid gap-4 md:grid-cols-4'>
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = currentPhaseNumber > stepNumber;
          const isCurrent = currentPhaseNumber === stepNumber;

          return (
            <React.Fragment key={index}>
              <div
                className='group relative flex items-center gap-4 md:flex-col md:items-center md:text-center'
              >
                {index < steps.length - 1 && (
                  <div
                    className={`absolute left-[calc(50%+2.25rem)] right-[calc(-50%+2.25rem)] top-6 hidden h-[2px] rounded-full md:block ${
                      isActive
                        ? 'bg-gradient-to-r from-primary-light to-primary'
                        : 'bg-white/10'
                    }`}
                  />
                )}
                <div
                  className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-all duration-300 md:mb-3 ${
                    isActive
                      ? 'border-primary bg-gradient-to-br from-primary-light to-primary text-white shadow-[0_0_32px_rgba(168,85,247,0.3)]'
                      : isCurrent
                        ? 'border-primary/70 bg-primary/25 text-white shadow-[0_0_30px_rgba(217,70,239,0.18)]'
                        : 'border-white/10 bg-[#0d0618] text-text-secondary group-hover:border-primary/30 group-hover:text-primary-light'
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
                  <span
                    className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      isActive || isCurrent
                        ? 'bg-primary/15 text-primary-light'
                        : 'bg-white/5 text-text-secondary'
                    }`}
                  >
                    0{stepNumber}
                  </span>
                  <div
                    className={`mx-auto mt-3 hidden h-1 w-10 rounded-full md:block ${
                      isCurrent
                        ? 'bg-primary-light'
                        : isActive
                          ? 'bg-primary/60'
                          : 'bg-transparent'
                    }`}
                  />
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
