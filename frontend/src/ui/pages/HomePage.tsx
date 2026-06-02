import {
  ArrowRight,
  Database,
  Network,
  Shield,
  Zap,
  Upload,
  Cpu,
  GitMerge,
  Download,
  KeyRound,
  Scissors,
  Filter,
  Grid3X3,
  Star,
  LockKeyhole,
  FileCheck2,
  Coins,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import premium3d from '../assets/premium-3d.png';

const Homepage = () => {
  const navigate = useNavigate();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12 },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 16, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  const handleStartTraining = () => {
    navigate('/training');
  };

  const features = [
    {
      icon: Database,
      title: 'Decentralized Storage',
      description:
        'Upload datasets and models to Akave/IPFS for secure distributed storage.',
      color: 'text-blue-400',
    },
    {
      icon: Network,
      title: 'Distributed Training',
      description:
        'Share gateway URLs across a peer-to-peer trainer network instead of moving raw payloads.',
      color: 'text-purple-400',
    },
    {
      icon: Shield,
      title: 'Blockchain Security',
      description:
        'Use Hedera logs and cryptographic verification to track training results.',
      color: 'text-emerald-400',
    },
    {
      icon: Zap,
      title: 'Pay-per-Training',
      description:
        'Only pay for successful work with transparent token-based pricing.',
      color: 'text-yellow-400',
    },
  ];

  const steps = [
    {
      icon: Upload,
      title: 'Upload',
      description: 'Dataset and model chunks are pinned to IPFS via Pinata.',
      number: '1',
    },
    {
      icon: Network,
      title: 'Distribute',
      description: 'Gateway URLs are shared across the P2P trainer network.',
      number: '2',
    },
    {
      icon: Cpu,
      title: 'Train',
      description: 'Trainer nodes fetch chunks and train locally on their GPUs.',
      number: '3',
    },
    {
      icon: GitMerge,
      title: 'Aggregate',
      description: 'Weights are aggregated with FedAvg and logged on Hedera.',
      number: '4',
    },
    {
      icon: Download,
      title: 'Deliver',
      description: 'Final trained weights are returned end-to-end on-chain.',
      number: '5',
    },
  ];

  const securityStages = [
    {
      icon: KeyRound,
      number: '01',
      title: 'Cryptographic Admission',
      description:
        'Peer updates are admitted through signature checks, replay protection, and Sybil-resistance controls before they can influence a round.',
      defends: 'Identity forgery, replay attacks, Sybil flooding',
    },
    {
      icon: Scissors,
      number: '02',
      title: 'L2-Norm Clipping',
      description:
        'Gradient magnitude is clipped so a single malicious trainer cannot push the global model with an unbounded update.',
      defends: 'Unbounded poisoning and coordinate manipulation',
    },
    {
      icon: Filter,
      number: '03',
      title: 'Adaptive Cosine Filter',
      description:
        'Each update is compared by direction, using adaptive thresholds that tolerate non-IID data while filtering obvious outliers.',
      defends: 'Sign flips, random noise, optimal poisoning',
    },
    {
      icon: Grid3X3,
      number: '04',
      title: 'P2P Bucketing',
      description:
        'Filtered updates are grouped into randomized buckets, reducing the effective Byzantine fraction before robust aggregation.',
      defends: 'Distributed backdoors and colluding attackers',
    },
    {
      icon: Star,
      number: '05',
      title: 'EMA Trust Mixing',
      description:
        'Trainer reputation evolves over rounds with exponential moving averages, excluding cold or low-trust peers from aggregation.',
      defends: 'Persistent attackers and post-admission Sybils',
    },
  ];

  const securityLayers = [
    {
      icon: LockKeyhole,
      title: 'Encrypted Result URLs',
      description:
        'Trainer weight URLs are encrypted with the ML user RSA-OAEP public key before submission.',
    },
    {
      icon: Coins,
      title: 'Escrowed Payments',
      description:
        'Hedera smart contracts hold the training budget and release rewards when weights are submitted.',
    },
    {
      icon: FileCheck2,
      title: 'Immutable Audit Trail',
      description:
        'Hedera Consensus Service logs progress, failures, and task events for tamper-evident coordination.',
    },
    {
      icon: Database,
      title: 'Content Addressing',
      description:
        'Large datasets and weights move through IPFS or Akave URLs, not raw P2P payloads.',
    },
  ];

  return (
    <main className='flex-1 flex flex-col'>
      <section className='min-h-[85vh] flex flex-col justify-center px-8 relative'>
        <div className='max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center'>
          <motion.div
            variants={containerVariants}
            initial='hidden'
            animate='visible'
            className='flex flex-col items-start text-left max-w-2xl'
          >
            <motion.h1
              variants={itemVariants}
              className='text-5xl md:text-7xl font-bold leading-[1.05] mb-6'
            >
              Forge the Future of AI
              <br />
              <span className='block text-gradient-purple mt-2 pb-1 text-4xl md:text-6xl'>
                On a Trustless Network
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className='text-lg md:text-xl text-text-secondary leading-relaxed mb-10 max-w-lg'
            >
              A decentralized platform for collaborative machine learning.
              Securely launch training jobs, pay with crypto, and receive
              results on-chain.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className='flex flex-col sm:flex-row gap-4 items-center'
            >
              <button
                onClick={handleStartTraining}
                className='px-8 py-4 bg-gradient-to-r from-primary-light to-primary text-white font-medium rounded-xl
                           hover:shadow-[0_0_30px_rgba(217,70,239,0.3)] transition-all duration-300 relative overflow-hidden group flex items-center gap-2'
              >
                <div className='absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-500 ease-in-out' />
                <span className='relative'>Start Training</span>
                <ArrowRight className='w-5 h-5 relative group-hover:translate-x-1 transition-transform' />
              </button>

              <button
                onClick={() => navigate('/history')}
                className='px-8 py-4 glass-pill text-text-secondary hover:text-white font-medium rounded-xl transition-all duration-300'
              >
                View History
              </button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
            className='hidden lg:flex justify-center items-center relative'
          >
            <div className='absolute w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px] animate-pulse-glow' />
            <img
              src={premium3d}
              alt='Abstract 3D Shape'
              className='w-full max-w-[600px] h-auto object-contain relative z-10 animate-float mix-blend-screen'
            />
          </motion.div>
        </div>
      </section>

      <section id='features' className='py-32 px-8 relative z-10 overflow-hidden'>
        <div className='absolute top-1/2 left-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] -translate-y-1/2 -translate-x-1/2 pointer-events-none' />

        <div className='max-w-6xl mx-auto w-full relative z-10'>
          <div className='text-center mb-16'>
            <h2 className='text-4xl md:text-5xl font-bold text-text-primary mb-6'>
              Why Choose DecentraAI?
            </h2>
            <p className='text-xl text-text-secondary max-w-2xl mx-auto'>
              Built on decentralized technologies for secure, efficient AI
              training.
            </p>
          </div>

          <div className='grid md:grid-cols-2 gap-8'>
            {features.map((feature, index) => (
              <div
                key={index}
                className='glass-panel rounded-2xl p-8 hover:bg-surface/50 transition-all duration-300 group'
              >
                <div className='flex items-start gap-6'>
                  <div className='w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-300'>
                    <feature.icon className={`w-7 h-7 ${feature.color}`} />
                  </div>
                  <div className='flex-1'>
                    <h3 className='text-2xl font-bold text-text-primary mb-3'>
                      {feature.title}
                    </h3>
                    <p className='text-lg text-text-secondary leading-relaxed'>
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id='how-it-works'
        className='py-32 px-8 relative z-10 overflow-hidden'
      >
        <div className='absolute top-1/2 right-0 w-[600px] h-[600px] bg-primary-light/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/3 pointer-events-none' />

        <div className='max-w-6xl mx-auto w-full relative z-10'>
          <div className='text-center mb-16'>
            <h2 className='text-4xl md:text-5xl font-bold text-text-primary mb-6'>
              The Workflow
            </h2>
            <p className='text-xl text-text-secondary max-w-2xl mx-auto'>
              From your dataset to trained weights, every step is decentralized
              and verifiable.
            </p>
          </div>

          <div className='grid md:grid-cols-2 lg:grid-cols-5 gap-6'>
            {steps.map((step, index) => (
              <div key={index} className='text-center group'>
                <div className='relative w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/10 group-hover:scale-110 transition-transform duration-300 overflow-hidden'>
                  <div className='absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                  <step.icon className='w-8 h-8 text-primary z-10' />
                  <div className='absolute top-2 right-2 text-white/20 font-bold text-sm leading-none'>
                    {step.number}
                  </div>
                </div>
                <h3 className='text-xl font-bold text-text-primary mb-3'>
                  {step.title}
                </h3>
                <p className='text-text-secondary leading-relaxed'>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id='security' className='px-8 pb-32 relative z-10 overflow-hidden'>
        <div className='max-w-6xl mx-auto w-full'>
          <div className='text-center mb-16'>
            <div className='inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-medium text-primary-light mb-5'>
              <Shield className='w-4 h-4' />
              TrustGossip Security Architecture
            </div>
            <h2 className='text-4xl md:text-5xl font-bold text-text-primary mb-6'>
              Security-First by Design
            </h2>
            <p className='text-xl text-text-secondary max-w-3xl mx-auto'>
              Distro-train protects the full path from peer admission to
              aggregation, storage, payment, and auditability without relying on
              a trusted central aggregator.
            </p>
          </div>

          <div className='grid lg:grid-cols-[0.95fr_1.05fr] gap-8 items-start'>
            <div className='glass-panel rounded-2xl p-8'>
              <div className='flex items-center gap-4 mb-8'>
                <div className='w-14 h-14 rounded-2xl border border-primary/30 bg-primary/15 flex items-center justify-center'>
                  <Shield className='w-7 h-7 text-primary-light' />
                </div>
                <div>
                  <h3 className='text-2xl font-bold text-text-primary'>
                    End-to-End Protection
                  </h3>
                  <p className='text-text-secondary mt-1'>
                    Four platform layers reinforce the ML defense pipeline.
                  </p>
                </div>
              </div>

              <div className='grid gap-4'>
                {securityLayers.map((layer) => (
                  <div
                    key={layer.title}
                    className='rounded-2xl border border-white/10 bg-white/[0.035] p-5 flex gap-4'
                  >
                    <div className='w-11 h-11 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center shrink-0'>
                      <layer.icon className='w-5 h-5 text-primary-light' />
                    </div>
                    <div>
                      <h4 className='font-semibold text-text-primary'>
                        {layer.title}
                      </h4>
                      <p className='text-sm text-text-secondary leading-relaxed mt-1'>
                        {layer.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            <div className='space-y-4'>
              {securityStages.map((stage, index) => (
                <motion.div
                  key={stage.title}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  className='glass-panel rounded-2xl p-5 group hover:border-primary/25 transition-colors'
                >
                  <div className='flex gap-5'>
                    <div className='flex flex-col items-center gap-2 shrink-0'>
                      <div className='w-12 h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center group-hover:bg-primary/20 transition-colors'>
                        <stage.icon className='w-6 h-6 text-primary-light' />
                      </div>
                      <span className='text-xs font-bold text-primary-light bg-primary/10 rounded-full px-2 py-1'>
                        {stage.number}
                      </span>
                    </div>
                    <div className='min-w-0'>
                      <h4 className='text-xl font-bold text-text-primary mb-2'>
                        {stage.title}
                      </h4>
                      <p className='text-text-secondary leading-relaxed'>
                        {stage.description}
                      </p>
                      <p className='mt-3 text-xs font-medium text-primary-light'>
                        Defends against: {stage.defends}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Homepage;
