import React, { useState } from 'react';
import FileUpload from '../FileUpload';
import { useTraining } from '../../contexts/TrainingContext';
import { Database, Shield, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { checkTaskStatus } from '../../utils/hederaHelper';
// import { subscription } from '../../utils/logsHelper';

export const UploadPhase = () => {
  const { uploadAssets, isLoading } = useTraining();
  const [projectName, setProjectName] = useState('');
  const [datasetFile, setDatasetFile] = useState<string | File | null>(null);
  const [modelFile, setModelFile] = useState<string | File | null>(null);
  const contractId = import.meta.env.VITE_CONTRACT_ID || '0.0.7307807';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName || !datasetFile || !modelFile) {
      toast.warning('All fields are required');
      return;
    }
    // checkTaskStatus('52');
    // getEventsFromMirror(contractId);
    // fetchWeightsSubmittedEvent(contractId, '4');
    // subscription();
    uploadAssets(projectName, datasetFile, modelFile);
    // beginFinalTraining();
  };

  return (
    <div className='dashboard-panel overflow-hidden rounded-3xl'>
      <div className='border-b border-white/10 bg-primary/5 p-6'>
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div className='flex items-center gap-4'>
            <div className='flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15'>
              <Database className='h-6 w-6 text-primary-light' />
            </div>
            <div>
              <h2 className='text-2xl font-bold text-text-primary'>
                Upload Training Assets
              </h2>
              <p className='mt-1 text-sm text-text-secondary'>
                Name the job, attach the dataset, and provide the Python script.
              </p>
            </div>
          </div>
          <div className='rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary-light'>
            Step 1 of 4
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className='space-y-6 p-6 lg:p-8'>
        <div>
          <label
            htmlFor='projectName'
            className='mb-2 block text-sm font-semibold text-text-primary'
          >
            Project Name
          </label>
          <input
            type='text'
            id='projectName'
            placeholder='e.g., Advanced Image Classification'
            className='dashboard-input w-full rounded-2xl p-4 text-text-primary placeholder:text-text-secondary/70 focus:outline-none'
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </div>
        <div className='grid gap-5 md:grid-cols-2'>
          <FileUpload
            label='Dataset (.csv)'
            fileType='dataset'
            onFileSelect={setDatasetFile}
          />
          <FileUpload
            label='Training Script (.py)'
            fileType='Python script'
            onFileSelect={setModelFile}
          />
        </div>
        <div className='rounded-2xl border border-primary/20 bg-primary/10 p-5'>
          <h3 className='mb-3 flex items-center gap-2 font-semibold text-text-primary'>
            <Shield className='h-4 w-4 text-primary-light' />
            What happens next?
          </h3>
          <ul className='grid gap-2 text-sm text-text-secondary md:grid-cols-2'>
            <li>
              Files are uploaded to <strong>IPFS via Pinata</strong> for secure
              storage.
            </li>
            <li>
              You then approve <strong>Hedera payment</strong> to initialize
              the training round.
            </li>
          </ul>
        </div>
        <button
          type='submit'
          disabled={isLoading || !datasetFile || !modelFile || !projectName}
          className='flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-primary-light to-primary px-4 py-4 font-semibold text-white transition-all duration-200 hover:shadow-[0_0_24px_rgba(217,70,239,0.24)] disabled:cursor-not-allowed disabled:opacity-50'
        >
          <Upload className='mr-2 h-5 w-5' />
          {isLoading ? 'Uploading...' : 'Upload Assets & Proceed to Payment'}
        </button>
      </form>
    </div>
  );
};
