import { Github } from 'lucide-react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import TitleBar from './TitleBar';
import logo from '../assets/logo.png';

const MarketingLayout = () => {
    const navigate = useNavigate();
    const githubUrl = 'https://github.com/fxhxdxd';

    // Enable smooth scrolling on the document level when in this layout
    useEffect(() => {
        document.documentElement.classList.add('scroll-smooth');
        return () => document.documentElement.classList.remove('scroll-smooth');
    }, []);

    return (
        <div className='flex flex-col h-screen bg-background text-text-primary selection:bg-primary/30'>
            <TitleBar />
            <div className='relative flex-1 overflow-y-auto overflow-x-hidden no-scrollbar'>
            {/* Top Background Gradient Highlights */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-light/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] -translate-x-1/2 translate-y-[-20%] pointer-events-none" />

            {/* Mesh Grid Background */}
            <div className="absolute inset-0 bg-mesh-grid pointer-events-none" />

            {/* Glassmorphism Header - Fixed for sticky scroll */}
            <header className='fixed top-20 left-0 right-0 z-50 flex justify-center px-8'>
                <div className="w-full max-w-7xl flex items-center justify-between">

                    <Link to="/" className="flex items-center relative z-50 group hover:opacity-90 transition-opacity">
                        <div className="w-14 h-14 flex items-center justify-center relative group-hover:scale-105 transition-transform duration-300">
                            <img src={logo} alt="DecentraAI Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-3xl font-bold bg-background/50 backdrop-blur-md pr-3 pl-1 py-1 rounded-lg">Decentra<span className="text-primary-light">AI</span></span>
                    </Link>

                    {/* Centered Glass Pill Nav - Anchor links for scrolling */}
                    <nav className="hidden lg:flex items-center gap-8 glass-pill px-8 py-3 rounded-full relative z-50 text-sm font-medium text-text-secondary bg-surface/80 backdrop-blur-xl border border-white/5 shadow-2xl">
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
                        <a href="#security" className="hover:text-white transition-colors">Security</a>
                        <Link to="/training" className="text-white hover:text-primary-light transition-colors">Training Dashboard</Link>
                    </nav>

                    <div className="relative z-50">
                        <button
                            onClick={() => navigate('/training')}
                            className="glass-pill px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors border border-primary/30 text-primary-light hover:text-white bg-background/50 backdrop-blur-md"
                        >
                            Start Training
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="relative z-10 flex-1 flex flex-col pt-32">
                <Outlet />
            </div>

            {/* Footer */}
            <footer className="relative z-10 mt-auto border-t border-white/5 bg-background/40 backdrop-blur-xl py-16 px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">

                    <div className="flex flex-col items-center md:items-start gap-4">
                        <Link to="/" className="flex items-center relative group hover:opacity-90 transition-opacity">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden">
                                <img src={logo} alt="DecentraAI Logo" className="w-full h-full object-contain" />
                            </div>
                            <span className="text-2xl font-bold pl-1">Decentra<span className="text-primary-light">AI</span></span>
                        </Link>
                        <p className="text-text-secondary text-sm max-w-xs text-center md:text-left">
                            Empowering the future of distributed AI training with decentralized, trustless networks.
                        </p>
                    </div>

                    <div className="flex gap-6 text-text-secondary">
                        <a
                            href={githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Fahad Khan on GitHub"
                            className="hover:text-white transition-colors"
                        >
                            <Github className="w-5 h-5" />
                        </a>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 text-center text-text-secondary/60 text-sm">
                    &copy; {new Date().getFullYear()} DecentraAI Network. All rights reserved.
                </div>
            </footer>
            </div>
        </div>
    );
};

export default MarketingLayout;
