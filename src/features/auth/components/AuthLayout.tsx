import { type ReactNode } from 'react';
import { ImageCarousel } from '../../../shared/components';

const carouselImages = [
  '/images/carousel/1600px-SMPJ_Daisy_and_Waluigi.webp',
  '/images/carousel/1600px-SMPJ_Luigi_and_Para-Biddybuds.webp',
  '/images/carousel/SMPJ_Green_Toad.webp',
  '/images/carousel/SMPJ_Mario_and_Bowser_Jr.webp',
  '/images/carousel/SMPJ_Peach_Items.webp',
  '/images/carousel/SMPJ_Rhythm_Cooking.webp'
];

interface AuthLayoutProps {
  children: ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen w-screen flex items-center justify-center fixed inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/images/wallpaper/wallpaper.webp)' }}>
      {/* Contenedor principal centrado */}
      <div className="bg-white/85 dark:bg-gray-900/85 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full mx-8 min-h-[500px] max-h-[90vh] flex" style={{ boxShadow: 'rgba(0, 0, 0, 0.5) 0px 30px 60px -12px, rgba(0, 0, 0, 0.3) 0px 18px 36px -18px' }}>
        {/* Sección del carousel */}
        <div className="hidden lg:flex lg:w-1/2 h-full items-center justify-center bg-gray-50 dark:bg-gray-800 relative">
          <ImageCarousel
            images={carouselImages}
            className="w-full h-full"
            autoSlideInterval={5000}
          />
        </div>

        {/* Sección del formulario */}
        <div className="w-full lg:w-1/2 flex items-center justify-center bg-white dark:bg-gray-900 py-8 px-8">
          <div className="w-full max-w-sm">
            {children}

          </div>
        </div>
      </div>
    </div>
  );
};