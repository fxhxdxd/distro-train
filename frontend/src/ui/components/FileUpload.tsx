import { UploadCloud, File as FileIcon, X } from 'lucide-react';
import { useState, useRef } from 'react';

interface FileUploadProps {
  label: string;
  fileType: string;
  onFileSelect: (file: string | File | null) => void;
}

const FileUpload = ({ label, fileType, onFileSelect }: FileUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<string | File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  const handleFileSelect = async () => {
    if (isElectron) {
      // Electron mode: use native file dialog
      const selectedPath = await window.electronAPI.openFileDialog();
      if (selectedPath) {
        setSelectedFile(selectedPath);
        onFileSelect(selectedPath);
      }
    } else {
      // Web mode: trigger file input
      fileInputRef.current?.click();
    }
  };

  const handleWebFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect(file);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    onFileSelect(null);
    // Reset file input if in web mode
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileName = selectedFile
    ? typeof selectedFile === 'string'
      ? selectedFile.split(/[\\/]/).pop()
      : selectedFile.name
    : '';

  return (
    <div className='min-w-0'>
      <label className='mb-2 block text-sm font-semibold text-text-primary'>
        {label}
      </label>
      {/* Hidden file input for web browser */}
      {!isElectron && (
        <input
          ref={fileInputRef}
          type='file'
          className='hidden'
          onChange={handleWebFileChange}
          accept={
            fileType.toLowerCase().includes('csv')
              ? '.csv'
              : fileType.toLowerCase().includes('python') ||
                fileType.toLowerCase().includes('script')
                ? '.py'
                : undefined
          }
        />
      )}
      {selectedFile ? (
        <div className='flex min-h-[154px] items-center justify-between rounded-2xl border border-primary/30 bg-primary/10 p-4'>
          <div className='flex min-w-0 items-center gap-3 overflow-hidden'>
            <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15'>
              <FileIcon className='text-primary-light' size={20} />
            </div>
            <div className='min-w-0'>
              <span className='mb-1 block text-xs text-text-secondary'>
                Selected file
              </span>
              <span
                className='block truncate text-sm font-semibold text-text-primary'
                title={fileName || ''}
              >
                {fileName}
              </span>
            </div>
          </div>
          <button
            type='button'
            onClick={removeFile}
            className='ml-2 rounded-lg p-2 text-text-secondary transition-colors hover:bg-red-500/10 hover:text-red-400'
          >
            <X size={20} />
          </button>
        </div>
      ) : (
        <button
          type='button'
          onClick={handleFileSelect}
          className='group flex min-h-[154px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.025] p-8 text-center transition-all hover:border-primary/60 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/40'
        >
          <div className='flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition-all group-hover:border-primary/35 group-hover:bg-primary/15'>
            <UploadCloud
              className='text-text-secondary group-hover:text-primary-light'
              size={26}
            />
          </div>
          <p className='mt-4 text-sm font-medium text-text-primary'>
            Click to browse for your {fileType}
          </p>
          <p className='mt-1 text-xs text-text-secondary'>
            Files stay local until you submit this step.
          </p>
        </button>
      )}
    </div>
  );
};

export default FileUpload;
