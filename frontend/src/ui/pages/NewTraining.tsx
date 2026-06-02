import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Coins,
  Cpu,
  Database,
  Network,
  Play,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useTraining } from '../contexts/TrainingContext';
import { TrainingStepper } from '../components/training/TrainingStepper';
import { UploadPhase } from '../components/training/UploadPhase';
import { AssemblingPhase } from '../components/training/AssemblingPhase';
import { PaymentPhase } from '../components/training/PaymentPhase';
import { TrainingProgressPhase } from '../components/training/TrainingProgressPhase';
import { CompletedPhase } from '../components/training/CompletedPhase';

const NewTrainingPage = () => {
  const { currentPhase, resetTraining } = useTraining();
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);

  const guideStorageKey = 'decentraai-training-dashboard-guide-seen';

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

  const guideSteps = [
    {
      title: 'Upload your assets',
      eyebrow: 'Step 01',
      icon: Upload,
      description:
        'Start by naming the project, selecting the dataset, and attaching the Python training script. The files remain local until you submit this step.',
      detail:
        'After submission, the app prepares the assets for decentralized storage and records the training job context.',
    },
    {
      title: 'Approve the training budget',
      eyebrow: 'Step 02',
      icon: Coins,
      description:
        'Review the HBAR budget and approve payment from your connected wallet. This initializes the training round on Hedera.',
      detail:
        'The budget breakdown shows trainer rewards, network fees, and platform fee before you proceed.',
    },
    {
      title: 'Assemble trainer nodes',
      eyebrow: 'Step 03',
      icon: Users,
      description:
        'The dashboard waits for eligible trainer nodes to join the round, then shows their peer IDs, network role, and readiness.',
      detail:
        'You can copy round and peer identifiers without leaving the workflow.',
    },
    {
      title: 'Launch and track training',
      eyebrow: 'Step 04',
      icon: Play,
      description:
        'Once the network is ready, launch final training. You can safely move to history while logs, weights, and status continue updating.',
      detail:
        'Completed jobs can be inspected later for logs, submitted weights, verification, and aggregation.',
    },
  ];

  useEffect(() => {
    if (currentPhase === 'completed') {
      resetTraining();
    }
  }, []);

  useEffect(() => {
    if (!window.localStorage.getItem(guideStorageKey)) {
      setIsGuideOpen(true);
    }
  }, []);

  const closeGuide = () => {
    window.localStorage.setItem(guideStorageKey, 'true');
    setIsGuideOpen(false);
    setGuideStep(0);
  };

  const openGuide = () => {
    setGuideStep(0);
    setIsGuideOpen(true);
  };

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
              <button
                type='button'
                onClick={openGuide}
                className='mt-4 inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-sm font-medium text-primary-light transition-colors hover:bg-primary/15 hover:text-white'
              >
                <Sparkles className='h-4 w-4' />
                How this dashboard works
              </button>
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

      {isGuideOpen && (
        <div className='fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xl'>
          <div className='relative w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#090214] shadow-[0_40px_140px_rgba(0,0,0,0.65)]'>
            <div className='pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/30 blur-[110px]' />
            <div className='pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-primary-light/20 blur-[120px]' />

            <button
              type='button'
              onClick={closeGuide}
              className='absolute right-5 top-5 z-10 rounded-xl border border-white/10 bg-white/5 p-2 text-text-secondary transition-colors hover:bg-white/10 hover:text-white'
              aria-label='Close guide'
            >
              <X className='h-5 w-5' />
            </button>

            <div className='relative grid gap-0 lg:grid-cols-[320px_1fr]'>
              <aside className='border-b border-white/10 bg-white/[0.025] p-6 lg:border-b-0 lg:border-r'>
                <div className='mb-8'>
                  <div className='mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary-light'>
                    <Sparkles className='h-3.5 w-3.5' />
                    First run guide
                  </div>
                  <h2 className='text-3xl font-bold text-text-primary'>
                    Training dashboard, decoded.
                  </h2>
                  <p className='mt-3 text-sm leading-relaxed text-text-secondary'>
                    Four steps take you from local files to verifiable
                    distributed training results.
                  </p>
                </div>

                <div className='space-y-3'>
                  {guideSteps.map((step, index) => (
                    <button
                      key={step.title}
                      type='button'
                      onClick={() => setGuideStep(index)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                        guideStep === index
                          ? 'border-primary/40 bg-primary/15 text-white'
                          : 'border-white/10 bg-white/[0.025] text-text-secondary hover:bg-white/[0.045]'
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                          guideStep === index
                            ? 'border-primary/40 bg-primary/20 text-primary-light'
                            : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <step.icon className='h-5 w-5' />
                      </div>
                      <div>
                        <span className='block text-xs'>{step.eyebrow}</span>
                        <span className='block text-sm font-semibold'>
                          {step.title}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </aside>

              <section className='p-6 lg:p-8'>
                <div className='mb-8 flex items-center justify-between gap-4'>
                  <div className='flex items-center gap-3'>
                    {guideSteps.map((step, index) => (
                      <button
                        key={step.title}
                        type='button'
                        onClick={() => setGuideStep(index)}
                        className={`h-2.5 rounded-full transition-all ${
                          guideStep === index
                            ? 'w-10 bg-primary-light'
                            : 'w-2.5 bg-white/15 hover:bg-white/25'
                        }`}
                        aria-label={`Show ${step.title}`}
                      />
                    ))}
                  </div>
                  <span className='rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-text-secondary'>
                    {guideSteps[guideStep].eyebrow}
                  </span>
                </div>

                <div className='mb-8 flex h-20 w-20 items-center justify-center rounded-3xl border border-primary/30 bg-gradient-to-br from-primary-light/30 to-primary/10 shadow-[0_0_48px_rgba(168,85,247,0.28)]'>
                  {React.createElement(guideSteps[guideStep].icon, {
                    className: 'h-9 w-9 text-primary-light',
                  })}
                </div>

                <h3 className='text-4xl font-bold text-text-primary'>
                  {guideSteps[guideStep].title}
                </h3>
                <p className='mt-4 max-w-2xl text-lg leading-relaxed text-text-secondary'>
                  {guideSteps[guideStep].description}
                </p>

                <div className='mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-5'>
                  <div className='mb-3 flex items-center gap-2 text-sm font-semibold text-primary-light'>
                    <ShieldCheck className='h-4 w-4' />
                    What to watch for
                  </div>
                  <p className='text-sm leading-relaxed text-text-secondary'>
                    {guideSteps[guideStep].detail}
                  </p>
                </div>

                <div className='mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  <button
                    type='button'
                    onClick={closeGuide}
                    className='rounded-xl px-4 py-3 text-sm font-medium text-text-secondary transition-colors hover:text-white'
                  >
                    Skip guide
                  </button>
                  <div className='flex gap-3'>
                    <button
                      type='button'
                      onClick={() => setGuideStep((step) => Math.max(0, step - 1))}
                      disabled={guideStep === 0}
                      className='inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-text-primary transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40'
                    >
                      <ArrowLeft className='h-4 w-4' />
                      Back
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        if (guideStep === guideSteps.length - 1) {
                          closeGuide();
                          return;
                        }
                        setGuideStep((step) => step + 1);
                      }}
                      className='inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-light to-primary px-5 py-3 text-sm font-semibold text-white transition-all hover:shadow-[0_0_24px_rgba(217,70,239,0.24)]'
                    >
                      {guideStep === guideSteps.length - 1
                        ? 'Start dashboard'
                        : 'Next step'}
                      <ArrowRight className='h-4 w-4' />
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewTrainingPage;
