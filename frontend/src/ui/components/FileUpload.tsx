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
    <div>
      <label className='block text-sm font-medium text-text-secondary mb-2'>
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
        <div className='flex items-center justify-between bg-background p-3 rounded-lg border border-border'>
          <div className='flex items-center gap-3 overflow-hidden'>
            <FileIcon className='text-primary shrink-0' size={20} />
            <span
              className='text-text-primary text-sm truncate'
              title={fileName || ''}
            >
              {fileName}
            </span>
          </div>
          <button
            type='button'
            onClick={removeFile}
            className='text-text-secondary hover:text-red-500 ml-2'
          >
            <X size={20} />
          </button>
        </div>
      ) : (
        <button
          type='button'
          onClick={handleFileSelect}
          className='w-full border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center text-center hover:border-primary transition-colors cursor-pointer focus:outline-none'
        >
          <UploadCloud className='text-text-secondary' size={32} />
          <p className='mt-2 text-sm text-text-secondary'>
            Click to browse for your {fileType}
          </p>
        </button>
      )}
    </div>
  );
};

export default FileUpload;
