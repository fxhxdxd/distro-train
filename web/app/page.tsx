import Navbar from './components/Navbar';
import Hero from './components/Hero';
import StatsBar from './components/StatsBar';
import DemoVideo from './components/DemoVideo';
import HowItWorks from './components/HowItWorks';
import Architecture from './components/Architecture';
import SecurityPipeline from './components/SecurityPipeline';
import TechStack from './components/TechStack';
import CtaSection from './components/CtaSection';
import Footer from './components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#080810] text-zinc-100 overflow-x-hidden">
      <Navbar />
      <Hero />
      <StatsBar />
      <DemoVideo />
      <HowItWorks />
      <Architecture />
      <SecurityPipeline />
      <TechStack />
      <CtaSection />
      <Footer />
    </main>
  );
}
