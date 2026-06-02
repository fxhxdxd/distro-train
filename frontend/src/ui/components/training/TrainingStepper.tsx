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
    <div className='relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] p-4'>
      <div className='relative grid gap-4 md:grid-cols-4'>
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = currentPhaseNumber > stepNumber;
          const isCurrent = currentPhaseNumber === stepNumber;

          return (
            <React.Fragment key={index}>
              <div
                className={`group relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${
                  isActive
                    ? 'border-primary/35 bg-gradient-to-br from-primary/16 to-primary-light/8 shadow-[0_18px_42px_rgba(168,85,247,0.12)]'
                    : isCurrent
                      ? 'border-primary/60 bg-gradient-to-br from-primary/25 via-primary-light/10 to-white/[0.035] shadow-[0_0_34px_rgba(217,70,239,0.18)]'
                      : 'border-white/10 bg-[#0d0618]/80 hover:border-primary/25 hover:bg-white/[0.04]'
                }`}
              >
                {index < steps.length - 1 && (
                  <div
                    className={`absolute left-[calc(100%+0.25rem)] top-1/2 hidden h-[2px] w-4 rounded-full md:block ${
                      isActive
                        ? 'bg-gradient-to-r from-primary-light to-primary'
                        : 'bg-white/10'
                    }`}
                  />
                )}
                <div className='pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent' />
                <div className='relative flex items-start justify-between gap-3'>
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-all duration-300 ${
                      isActive
                        ? 'border-primary bg-gradient-to-br from-primary-light to-primary text-white shadow-[0_0_32px_rgba(168,85,247,0.3)]'
                        : isCurrent
                          ? 'border-primary/70 bg-primary/25 text-white shadow-[0_0_30px_rgba(217,70,239,0.18)]'
                          : 'border-white/10 bg-white/5 text-text-secondary group-hover:border-primary/30 group-hover:text-primary-light'
                    }`}
                  >
                    {isActive ? (
                      <Check className='h-5 w-5' />
                    ) : (
                      <step.icon className='h-5 w-5' />
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      isActive || isCurrent
                        ? 'bg-primary/15 text-primary-light'
                        : 'bg-white/5 text-text-secondary'
                    }`}
                  >
                    0{stepNumber}
                  </span>
                </div>
                <div className='relative mt-5'>
                  <span
                    className={`block text-base font-semibold ${
                      isActive || isCurrent
                        ? 'text-text-primary'
                        : 'text-text-secondary'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className='mt-1 block text-xs text-text-secondary'>
                    {isActive
                      ? 'Completed'
                      : isCurrent
                        ? 'Current step'
                        : 'Pending'}
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
