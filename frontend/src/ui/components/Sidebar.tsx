import {
  Rocket,
  History,
  Settings,
  Wallet,
  ChevronDown,
  Copy,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import { useWalletInterface } from '../services/useWalletInterface';
import logo from '../assets/logo.png';

const Sidebar = () => {
  const { accountId, balance, isConnected, actions } = useWalletInterface();
  const [isWalletExpanded, setIsWalletExpanded] = useState(false);
  const navigate = useNavigate();

  const copyToClipboard = (text: string | undefined) => {
    navigator.clipboard.writeText(text || '');
    toast.success('Address copied to clipboard!');
  };

  const openInExplorer = () => {
    if (accountId) {
      const url = `https://hashscan.io/testnet/account/${accountId}`;
      window.electronAPI.openExternalLink(url);
    }
  };

  const linkClasses =
    'focus:outline-none flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-text-secondary hover:text-text-primary hover:bg-white/5';
  const activeLinkClasses =
    'bg-gradient-to-r from-primary/25 to-primary-light/10 text-primary-light border border-primary/25 shadow-[0_10px_32px_rgba(168,85,247,0.12)]';

  return (
    <aside className='relative z-10 hidden w-[292px] shrink-0 border-r border-white/10 bg-[#070011]/82 p-5 text-text-primary backdrop-blur-xl lg:flex lg:flex-col'>
      <div className='mb-5'>
        <div
          className='dashboard-panel flex cursor-pointer items-center gap-3 rounded-2xl p-4 transition-all hover:border-primary/30'
          onClick={() => navigate('/')}
        >
          <div className='flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-primary/35 bg-primary/10 shadow-[0_0_28px_rgba(168,85,247,0.18)]'>
            <img src={logo} alt='DecentraAI Logo' className='h-full w-full object-contain' />
          </div>
          <div className='min-w-0'>
            <h1 className='text-xl font-bold text-text-primary'>DecentraAI</h1>
            <p className='text-sm text-text-secondary'>Federated workspace</p>
          </div>
        </div>
      </div>

      <div className='mb-5 grid grid-cols-2 gap-2'>
        <div className='rounded-xl border border-white/10 bg-white/[0.035] p-3'>
          <p className='text-xs text-text-secondary'>Network</p>
          <p className='mt-1 text-sm font-semibold text-text-primary'>Hedera</p>
        </div>
        <div className='rounded-xl border border-white/10 bg-white/[0.035] p-3'>
          <p className='text-xs text-text-secondary'>Storage</p>
          <p className='mt-1 text-sm font-semibold text-text-primary'>IPFS</p>
        </div>
      </div>

      <div className='mb-6'>
        {!isConnected ? (
          <div className='rounded-2xl border border-white/10 bg-white/[0.035] p-4'>
            <div className='mb-3 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Wallet className='h-4 w-4 text-primary-light' />
                <span className='text-sm font-medium text-text-primary'>
                  Wallet
                </span>
              </div>
              <span className='rounded-full border border-yellow-400/20 bg-yellow-400/10 px-2 py-0.5 text-xs text-yellow-200'>
                Required
              </span>
            </div>
            <button
              onClick={actions.connect}
              className='w-full rounded-xl bg-gradient-to-r from-primary-light to-primary px-3 py-3 text-sm font-semibold text-white transition-all duration-200 hover:shadow-[0_0_24px_rgba(217,70,239,0.24)] focus:outline-none focus:ring-2 focus:ring-primary/50'
            >
              Connect Wallet
            </button>
            <p className='mt-3 text-center text-xs text-text-secondary'>
              Unlock payments and trainer assignment.
            </p>
          </div>
        ) : (
          <div className='overflow-hidden rounded-2xl border border-primary/25 bg-primary/10'>
            <button
              onClick={() => setIsWalletExpanded(!isWalletExpanded)}
              className='flex w-full items-center justify-between p-4 transition-colors duration-200 hover:bg-primary/15'
            >
              <div className='flex min-w-0 items-center gap-3'>
                <div className='flex h-9 w-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/20'>
                  <Wallet className='h-4 w-4 text-primary-light' />
                </div>
                <div className='min-w-0 text-left'>
                  <p className='truncate text-sm font-medium text-text-primary'>
                    {accountId}
                  </p>
                  <p className='text-xs text-primary font-mono'>
                    {balance ? `${balance} HBAR` : 'Loading...'}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${
                  isWalletExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isWalletExpanded && (
              <div className='space-y-2 border-t border-primary/20 p-3'>
                <button
                  onClick={() => copyToClipboard(accountId)}
                  className='flex w-full items-center gap-2 rounded-lg p-2 text-xs text-text-secondary transition-colors duration-200 hover:bg-primary/10 hover:text-text-primary'
                >
                  <Copy className='w-3 h-3' /> Copy Address
                </button>
                <button
                  onClick={openInExplorer}
                  className='flex w-full items-center gap-2 rounded-lg p-2 text-xs text-text-secondary transition-colors duration-200 hover:bg-primary/10 hover:text-text-primary'
                >
                  <ExternalLink className='w-3 h-3' /> View on Explorer
                </button>
                <button
                  onClick={actions.disconnect}
                  className='flex w-full items-center gap-2 rounded-lg p-2 text-xs text-red-400 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-300'
                >
                  <LogOut className='w-3 h-3' /> Disconnect
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className='mb-3 px-2 text-xs font-semibold uppercase text-text-secondary/70'>
        Workspace
      </div>
      <nav className='flex flex-col gap-2'>
        <NavLink
          to='/training'
          className={({ isActive }) =>
            `${linkClasses} ${isActive ? activeLinkClasses : ''}`
          }
        >
          <Rocket size={20} />
          <span>New Training</span>
        </NavLink>
        <NavLink
          to='/history'
          className={({ isActive }) =>
            `${linkClasses} ${isActive ? activeLinkClasses : ''}`
          }
        >
          <History size={20} />
          <span>Training History</span>
        </NavLink>
      </nav>
      <div className='mt-auto rounded-2xl border border-white/10 bg-white/[0.035] p-4'>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-text-secondary'>Privacy mode</span>
          <span className='rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-300'>
            Local-first
          </span>
        </div>
        <p className='mt-2 text-xs leading-relaxed text-text-secondary'>
          Data is distributed through content-addressed URLs, not raw P2P
          payloads.
        </p>
      </div>
      <nav className='mt-4 flex flex-col gap-2 border-t border-white/10 pt-4'>
        <NavLink
          to='/settings'
          className={({ isActive }) =>
            `${linkClasses} ${isActive ? activeLinkClasses : ''}`
          }
        >
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>
      </nav>
      <div className='mt-4 border-t border-white/10 pt-4'>
        <div className='text-center'>
          <p className='text-xs text-text-secondary'>© 2025 DecentraAI</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
