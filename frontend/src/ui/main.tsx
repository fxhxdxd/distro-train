import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { HashRouter } from 'react-router-dom';
import { SettingsProvider } from './contexts/SettingsContext.tsx';
import { TrainingProvider } from './contexts/TrainingContext.tsx';
import { WalletConnectProvider } from './contexts/WalletConnectContext.tsx';
// import { WalletConnectClient } from './services/walletConnectClient.ts';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <WalletConnectProvider>
        <HashRouter>
          <TrainingProvider>
          <App />
          </TrainingProvider>
        </HashRouter>
      </WalletConnectProvider>
    </SettingsProvider>
  </StrictMode>
);



//       {/* <TrainingProvider>
//         <WalletConnectProvider>
//           <WalletConnectClient />
//           <HashRouter> */}

//           {/* </HashRouter>
//         </WalletConnectProvider>
//       </TrainingProvider>