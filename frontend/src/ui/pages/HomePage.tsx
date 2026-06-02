import { ArrowRight, Database, Network, Shield, Zap, Upload, Coins, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import premium3d from '../assets/premium-3d.png';

const Homepage = () => {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  };
  const navigate = useNavigate();

  const handleStartTraining = () => {
    navigate('/training');
  };

  const features = [
    {
      icon: Database,
      title: 'Decentralized Storage',
      description: 'Upload your datasets and models to Akave for secure, distributed storage.',
      color: 'text-blue-400',
    },
    {
      icon: Network,
      title: 'Distributed Training',
      description: 'Leverage our global network of trainer nodes for efficient AI model training.',
      color: 'text-purple-400',
    },
    {
      icon: Shield,
      title: 'Blockchain Security',
      description: 'Trained weights stored on Hedera blockchain with cryptographic verification.',
      color: 'text-emerald-400',
    },
    {
      icon: Zap,
      title: 'Pay-per-Training',
      description: 'Only pay for successful training jobs with transparent, token-based pricing.',
      color: 'text-yellow-400',
    },
  ];

  const steps = [
    {
      icon: Upload,
      title: 'Upload Data',
      description: 'Upload your dataset and Python training script to Akave storage',
      number: '1'
    },
    {
      icon: Coins,
      title: 'Pay Tokens',
      description: 'Pay training fees in HBAR or other supported tokens',
      number: '2'
    },
    {
      icon: Network,
      title: 'Network Training',
      description: 'Multiple trainer nodes compete to train your model efficiently',
      number: '3'
    },
    {
      icon: Download,
      title: 'Get Results',
      description: 'Download trained weights from Hedera blockchain storage',
      number: '4'
    }
  ];

  return (
    <main className='flex-1 flex flex-col'>

      {/* Hero Section */}
      <section className='min-h-[85vh] flex flex-col justify-center px-8 relative'>
        <div className='max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center'>

          {/* Left Column: Text */}
          <motion.div
            variants={containerVariants}
            initial='hidden'
            animate='visible'
            className='flex flex-col items-start text-left max-w-2xl'
          >
            <motion.h1
              variants={itemVariants}
              className='text-5xl md:text-7xl font-bold tracking-[-0.02em] leading-[1.05] mb-6'
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
              A decentralized platform for collaborative machine learning. Securely launch training jobs, pay with crypto, and receive results on-chain.
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
                <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-500 ease-in-out" />
                <span className="relative">Start Training</span>
                <ArrowRight className="w-5 h-5 relative group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => navigate('/history')}
                className='px-8 py-4 glass-pill text-text-secondary hover:text-white font-medium rounded-xl transition-all duration-300'
              >
                Watch Demo
              </button>
            </motion.div>
          </motion.div>

          {/* Right Column: 3D Asset Floating */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
            className="hidden lg:flex justify-center items-center relative"
          >
            {/* Glow behind the asset */}
            <div className="absolute w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px] animate-pulse-glow" />

            {/* Premium 3D Image */}
            <img
              src={premium3d}
              alt="Abstract 3D Shape"
              className="w-full max-w-[600px] h-auto object-contain relative z-10 animate-float mix-blend-screen"
            />
          </motion.div>

        </div>
      </section>

      {/* Features Section */}
      <section id="features" className='py-32 px-8 relative z-10 overflow-hidden'>
        {/* Background Gradient */}
        <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] -translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className='max-w-6xl mx-auto w-full relative z-10'>
          <div className='text-center mb-16'>
            <h2 className='text-4xl md:text-5xl font-bold text-text-primary mb-6'>
              Why Choose DecentraAI?
            </h2>
            <p className='text-xl text-text-secondary max-w-2xl mx-auto'>
              Built on cutting-edge decentralized technologies for secure, efficient AI training.
            </p>
          </div>

          <div className='grid md:grid-cols-2 gap-8'>
            {features.map((feature, index) => (
              <div
                key={index}
                className='glass-panel rounded-2xl p-8 hover:bg-surface/50 transition-all duration-300 group'
              >
                <div className='flex items-start gap-6'>
                  <div className='w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-300 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]'>
                    <feature.icon className={`w-7 h-7 ${feature.color}`} />
                  </div>
                  <div className='flex-1'>
                    <h3 className='text-2xl font-bold text-text-primary mb-3'>{feature.title}</h3>
                    <p className='text-lg text-text-secondary leading-relaxed'>{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className='py-32 px-8 mb-24 relative z-10 overflow-hidden'>
        {/* Background Gradient */}
        <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-primary-light/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

        <div className='max-w-6xl mx-auto w-full relative z-10'>
          <div className='text-center mb-16'>
            <h2 className='text-4xl md:text-5xl font-bold text-text-primary mb-6'>
              How DecentraAI Works
            </h2>
            <p className='text-xl text-text-secondary max-w-2xl mx-auto'>
              A simple 4-step process to train your AI models on our decentralized network.
            </p>
          </div>

          <div className='grid md:grid-cols-2 lg:grid-cols-4 gap-8'>
            {steps.map((step, index) => (
              <div
                key={index}
                className='text-center group'
              >
                <div className='relative w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/10 group-hover:scale-110 transition-transform duration-300 overflow-hidden'>
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <step.icon className="w-8 h-8 text-primary shadow-[0_0_20px_rgba(168,85,247,0.5)] z-10" />
                  <div className="absolute top-2 right-2 text-white/20 font-bold text-sm leading-none">{step.number}</div>
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

    </main>
  );
};

export default Homepage;
