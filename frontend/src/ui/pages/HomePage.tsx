import {
  ArrowRight,
  Upload,
  Network,
  Cpu,
  GitMerge,
  Download,
  BookText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TitleBar from '../components/TitleBar';
import { motion, type Variants } from 'framer-motion';

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

  const steps = [
    {
      icon: Upload,
      title: 'Upload',
      description: 'Dataset & model chunked and pinned to IPFS via Pinata.',
    },
    {
      icon: Network,
      title: 'Distribute',
      description: 'Gateway URLs shared across the P2P trainer network.',
    },
    {
      icon: Cpu,
      title: 'Train',
      description: 'Trainer nodes fetch chunks and train locally on their GPUs.',
    },
    {
      icon: GitMerge,
      title: 'Aggregate',
      description: 'Weights aggregated via FedAvg and logged on Hedera.',
    },
    {
      icon: Download,
      title: 'Deliver',
      description: 'Final trained weights returned to you, end-to-end on-chain.',
    },
  ];

  return (
    <div className='flex flex-col h-screen bg-background'>
      <div className='fixed top-0 left-0 right-0 z-50'>
        <TitleBar />
      </div>

      <div
        className='flex-1 relative overflow-y-auto no-scrollbar'
        style={{ paddingTop: '48px' }}
      >
        <div className='relative min-h-full flex flex-col'>
          {/* Hero */}
          <section className='flex items-center justify-center px-8 min-h-[calc(100vh-48px)]'>
            <motion.div
              variants={containerVariants}
              initial='hidden'
              animate='visible'
              className='max-w-3xl mx-auto text-center'
            >
              <motion.h1
                variants={itemVariants}
                className='text-6xl md:text-8xl font-semibold tracking-tight text-text-primary mb-6'
              >
                DecentraAI
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className='text-lg md:text-xl text-text-secondary max-w-xl mx-auto leading-relaxed mb-12'
              >
                Decentralized federated learning. Train models on a trustless
                peer-to-peer network.
              </motion.p>

              <motion.div
                variants={itemVariants}
                className='flex flex-col sm:flex-row gap-4 items-center justify-center'
              >
                <button
                  onClick={() => navigate('/training')}
                  className='group px-6 py-3 bg-primary text-background font-medium rounded-md
                             hover:bg-primary/90 transition-colors duration-200 flex items-center gap-2'
                >
                  <span>Start Training</span>
                  <ArrowRight className='w-4 h-4 group-hover:translate-x-0.5 transition-transform' />
                </button>

                <a
                  href='https://github.com'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='px-6 py-3 text-text-secondary font-medium rounded-md
                             border border-border hover:border-text-secondary hover:text-text-primary
                             transition-colors duration-200 flex items-center gap-2'
                >
                  <BookText className='w-4 h-4' />
                  <span>Read Docs</span>
                </a>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className='mt-20 text-xs uppercase tracking-widest text-text-secondary'
              >
                How it works ↓
              </motion.div>
            </motion.div>
          </section>

          {/* Workflow */}
          <section className='px-8 py-24 border-t border-border'>
            <div className='max-w-6xl mx-auto'>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className='text-center mb-16'
              >
                <h2 className='text-3xl md:text-4xl font-semibold text-text-primary mb-3'>
                  The Workflow
                </h2>
                <p className='text-base text-text-secondary max-w-xl mx-auto'>
                  From your dataset to trained weights — every step
                  decentralized and verifiable.
                </p>
              </motion.div>

              <div className='grid md:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-2 relative'>
                {steps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.08 }}
                    className='relative flex flex-col items-center text-center lg:px-3'
                  >
                    <div className='w-14 h-14 rounded-full bg-surface border border-border flex items-center justify-center mb-5'>
                      <step.icon className='w-6 h-6 text-text-primary' />
                    </div>

                    <div className='text-xs font-mono text-text-secondary mb-2'>
                      0{index + 1}
                    </div>

                    <h3 className='text-base font-semibold text-text-primary mb-2'>
                      {step.title}
                    </h3>

                    <p className='text-sm text-text-secondary leading-relaxed max-w-[14rem]'>
                      {step.description}
                    </p>

                    {index < steps.length - 1 && (
                      <ArrowRight className='hidden lg:block absolute top-[22px] -right-3 w-4 h-4 text-border' />
                    )}
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className='mt-20 flex justify-center'
              >
                <button
                  onClick={() => navigate('/training')}
                  className='group px-6 py-3 bg-primary text-background font-medium rounded-md
                             hover:bg-primary/90 transition-colors duration-200 flex items-center gap-2'
                >
                  <span>Launch a training job</span>
                  <ArrowRight className='w-4 h-4 group-hover:translate-x-0.5 transition-transform' />
                </button>
              </motion.div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Homepage;
