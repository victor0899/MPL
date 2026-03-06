import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/shared/utils/cn';
import type { ImageUploadData } from '../types/image-analysis.types';

interface ImageUploadProps {
  onImageSelect: (imageData: ImageUploadData | null) => void;
  isAnalyzing?: boolean;
  disabled?: boolean;
  currentImage?: ImageUploadData | null;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

export function ImageUpload({
  onImageSelect,
  isAnalyzing = false,
  disabled = false,
  currentImage = null,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Por favor sube un archivo PNG o JPG';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'La imagen debe ser menor a 5MB';
    }
    return null;
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:image/...;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFile = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      alert(error);
      return;
    }

    try {
      const base64 = await convertToBase64(file);
      const preview = URL.createObjectURL(file);

      onImageSelect({
        file,
        base64,
        preview,
      });
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error al procesar la imagen');
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled || isAnalyzing) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled && !isAnalyzing) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClear = () => {
    if (currentImage?.preview) {
      URL.revokeObjectURL(currentImage.preview);
    }
    onImageSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled && !isAnalyzing) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-3">
      {!currentImage ? (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all',
            'hover:border-mario-blue hover:bg-mario-blue/5',
            isDragging && 'border-mario-blue bg-mario-blue/10 scale-[1.02]',
            disabled || isAnalyzing
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer',
            'dark:border-gray-600 dark:hover:border-mario-blue dark:hover:bg-mario-blue/10'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={handleFileInputChange}
            disabled={disabled || isAnalyzing}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-3">
            <div
              className={cn(
                'p-4 rounded-full transition-colors',
                'bg-mario-blue/10 dark:bg-mario-blue/20'
              )}
            >
              <Upload
                className={cn(
                  'w-8 h-8 transition-colors',
                  'text-mario-blue dark:text-mario-blue-light'
                )}
              />
            </div>

            <div>
              <p className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
                Arrastra una imagen o haz click para seleccionar
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                PNG o JPG hasta 5MB
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Loading overlay */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-black/50 dark:bg-black/70 rounded-lg flex items-center justify-center z-10">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mb-3" />
                <p className="text-white font-medium">Analizando con Claude...</p>
              </div>
            </div>
          )}

          {/* Image preview */}
          <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
            <img
              src={currentImage.preview}
              alt="Preview"
              className="w-full h-64 object-contain bg-gray-50 dark:bg-gray-900"
            />

            {/* Clear button */}
            {!isAnalyzing && (
              <button
                onClick={handleClear}
                disabled={disabled}
                className={cn(
                  'absolute top-2 right-2 p-2 rounded-full',
                  'bg-red-500 hover:bg-red-600 text-white',
                  'transition-colors shadow-lg',
                  'dark:bg-red-600 dark:hover:bg-red-700'
                )}
                title="Quitar imagen"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* File info */}
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
            <ImageIcon className="w-4 h-4" />
            <span>{currentImage.file.name}</span>
            <span className="text-gray-400 dark:text-gray-500">
              ({(currentImage.file.size / 1024).toFixed(0)} KB)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
