import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { Upload, X, Image as ImageIcon, Camera } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import type { ImageUploadData } from '../types/image-analysis.types';

interface ImageUploadProps {
  onImageSelect: (imageData: ImageUploadData | null) => void;
  isAnalyzing?: boolean;
  disabled?: boolean;
  currentImage?: ImageUploadData | null;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'image/gif'
];

export function ImageUpload({
  onImageSelect,
  isAnalyzing = false,
  disabled = false,
  currentImage = null,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check if it's an image (more permissive for mobile formats)
    if (!file.type.startsWith('image/')) {
      return 'Por favor sube un archivo de imagen';
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
        mediaType: file.type || 'image/jpeg',
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

  const handleCameraClick = () => {
    if (!disabled && !isAnalyzing) {
      cameraInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-3">
      {!currentImage ? (
        <>
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            disabled={disabled || isAnalyzing}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileInputChange}
            disabled={disabled || isAnalyzing}
            className="hidden"
          />

          {/* Drag and drop area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              'border-2 border-dashed rounded-lg p-6 text-center transition-all',
              isDragging && 'border-mario-blue bg-mario-blue/10 scale-[1.02]',
              disabled || isAnalyzing
                ? 'opacity-50'
                : 'border-gray-300 dark:border-gray-600',
            )}
          >
            <div className="flex flex-col items-center gap-3 mb-4">
              <Upload className="w-10 h-10 text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Arrastra una imagen aquí o usa los botones abajo
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Hasta 5MB • Formatos: JPG, PNG, HEIC, WebP
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={handleClick}
                disabled={disabled || isAnalyzing}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                  'bg-mario-blue hover:bg-mario-blue/90 text-white',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'dark:bg-mario-blue dark:hover:bg-mario-blue/80'
                )}
              >
                <Upload className="w-4 h-4" />
                Subir Imagen
              </button>

              <button
                type="button"
                onClick={handleCameraClick}
                disabled={disabled || isAnalyzing}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                  'bg-purple-500 hover:bg-purple-600 text-white',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'dark:bg-purple-600 dark:hover:bg-purple-700'
                )}
              >
                <Camera className="w-4 h-4" />
                Tomar Foto
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="relative">
          {/* Loading overlay */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-black/50 dark:bg-black/70 rounded-lg flex items-center justify-center z-10">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mb-3" />
                <p className="text-white font-medium">Pensando...</p>
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
