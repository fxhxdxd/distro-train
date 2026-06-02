# Redesign Guide — UI/UX Handoff

This document is the contract for redesigning **distro-train**'s desktop (Electron)
app without breaking how it works. **Target platform: Electron only.** The browser
build is deprecated and out of scope.

> **The one rule:** Restyle and re-lay-out anything you want. **Never** change a
> hook's return shape, a component prop type, an IPC channel name, a `window.electronAPI`
> call, or a shared data interface. If `npm run build` stays green and the
> [Golden-Path Smoke Test](#golden-path-smoke-test) still passes, you haven't broken anything.

---

## 1. What you own vs. what is frozen

| ✅ You own (presentation) | ⛔ Frozen (logic core — do not edit) |
|---|---|
| `src/ui/components/**` — all visual components | `src/ui/contexts/**` — app state machine + business logic |
| `src/ui/pages/**` — screen layouts | `src/ui/utils/**` — IPFS/Hedera/FedAvg/history helpers |
| `src/ui/index.css` + Tailwind theme | `src/ui/services/**` — wallet + contract integration |
| `src/ui/App.tsx` (layout/routing shell) | `src/ui/renderer.d.ts` — the IPC + settings types |
| static assets | `src/electron/**` — main process, preload, IPC handlers |

You may freely change markup, class names, structure, animation, and which Tailwind
tokens a component uses. You **consume** the frozen layer through the hooks and types
below — you don't modify it.

---

## 2. The functional contract

These are the APIs your components call. Keep calling them with the same shapes.

### Hooks

**`useTraining()`** — `src/ui/contexts/TrainingContext.tsx` — the whole training flow:
```ts
{
  // state
  currentPhase: 'upload' | 'assembling' | 'payment' | 'training' | 'completed';
  isLoading: boolean;
  trainerCount: number;
  activeJobId: string | null;
  result: { datasetHash?; chunkCount?; modelHash?; weightsHash?; transactionId? } | null;
  projectName: string | null;
  trainerNodes: TrainerNodeInfo[];
  // actions (call these from buttons/forms)
  uploadAssets(projectName, datasetPath, modelPath): Promise<void>;
  payAndInitialize(tokenAmount: string): Promise<...>;
  beginFinalTraining(): Promise<...>;
  resetTraining(): void;
}
```

**`useSettings()`** — `src/ui/contexts/SettingsContext.tsx`:
```ts
{ settings: { pinataApiKey; pinataSecretKey }, saveSettings(newSettings), isConfigured: boolean }
```

**`useWalletInterface()`** — `src/ui/services/useWalletInterface.ts`:
```ts
{ accountId, isConnected, balance, actions: { connect, disconnect, executeContractFunction } }
```

### Shared data types (don't change field names/shapes)
- `TrainingProject` — `src/ui/pages/TrainingHistory.tsx`
- `WeightEntry = { url, cid, trainerAddress }` — `src/ui/utils/hederaHelper.ts`
- `TrainerNodeInfo = { peer_id, pub_maddr, maddr, role }` — `src/ui/contexts/TrainingContext.tsx`
- `ISettings`, `IElectronAPI` — `src/ui/renderer.d.ts`

### The IPC surface — `window.electronAPI` (`src/ui/renderer.d.ts`)
These reach the Electron main process. **They ARE the desktop features** — don't remove them:
window controls (`minimizeWindow`/`maximizeWindow`/`closeWindow`/`quitApp`),
`openExternalLink`, `openFileDialog`, credentials (`saveCredentials`/`loadCredentials`/`configurePinata`),
uploads (`uploadFileToPinata`/`uploadDatasetToPinata`), history
(`getHistory`/`addHistory`/`updateHistoryItem`/`deleteHistoryItem`), logs
(`startLogSubscription`/`stopLogSubscription`/`getLogs`/`onNewLog`), `downloadFile`.

> **Dual-mode note:** Some helpers branch on `const isElectron = ... window.electronAPI`
> with a web/localStorage fallback. The browser build is dead — you can ignore those
> `else` branches, but **do not delete the `window.electronAPI` calls themselves.**

---

## 3. Screen map (where to work)

| Screen | File |
|---|---|
| Dashboard / landing | `src/ui/pages/HomePage.tsx` |
| New training wizard | `src/ui/pages/NewTraining.tsx` + `components/training/` |
| → phases | `UploadPhase` · `AssemblingPhase` · `PaymentPhase` · `TrainingProgressPhase` · `CompletedPhase` · `TrainingStepper` |
| Training history | `src/ui/pages/TrainingHistory.tsx` + `components/history/` |
| → modals | `ProjectDetailsModal` · `LogViewerModal` · `AggregationModal` · `VerificationModal` |
| Settings | `src/ui/pages/Settings.tsx` |
| Chrome | `components/` Sidebar · MenuBar · TitleBar |

---

## 4. Theme through tokens, not hex

The app uses **semantic Tailwind tokens** — re-skin via the Tailwind config, and a
full re-theme is mostly one file. Prefer these over hardcoded colors:
`bg-background` · `bg-surface` · `text-primary` · `text-secondary` ·
`border-border` · `primary` (accent). Keep using token classes so the theme stays
swappable.

---

## 5. Workflow & guardrails

1. **Branch from the known-good baseline.** Once the app is verified working, it will be
   tagged `pre-redesign`. Work on `redesign/*` branches; never commit straight to `main`.
2. **The type gate is your safety net.** `npm run build` runs `tsc -b && vite build`.
   It is currently **green**. If you change a prop or drop a required call, the build
   fails loudly — fix it before merging. (Unused-import noise is intentionally not
   fatal; run `eslint .` for cosmetic cleanup.)
3. **Every PR must:** keep `npm run build` green **and** pass the smoke test below.
4. *(Recommended)* Add **Storybook** so components can be built against mock data without
   running the P2P/Hedera/Pinata backend — fastest, safest iteration loop.

### Running it
- `npm run dev:react` — Vite dev server (fast **visual** iteration of components).
- `npm run dev:electron` — full desktop app; needed to exercise the real end-to-end flow
  (requires the P2P backend running: bootstrap + client node).

---

## Golden-Path Smoke Test

Run in the **Electron** app (`npm run dev:electron`, backend up) before handoff and after
every redesign PR. "Functionality intact" = all of these still pass:

- [ ] **Settings** — enter Pinata keys → Save → app shows "configured".
- [ ] **Wallet** — connect WalletConnect → account ID + balance display.
- [ ] **Upload** — pick dataset + model script, name the project, Upload → advances to
      Payment with `datasetHash`, `modelHash`, and `chunkCount` populated.
- [ ] **Payment** — enter HBAR → pay → contract `createTask` succeeds → "round initialized"
      → advances to Assembling.
- [ ] **Assembling** — trainer nodes appear (`trainerCount > 0`).
- [ ] **Train** — Begin Final Training → Training phase → live logs stream in the viewer.
- [ ] **Complete** — all chunks train, weights post on-chain, job flips to **Completed**.
- [ ] **History** — open the project → weight files listed per trainer → **Run FedAvg** →
      global model renders → **Download** works → **View on Explorer** opens.

If any step regresses after a UI change, the redesign broke the contract — revert and
reconnect the component to the hook/IPC call it stopped using.
