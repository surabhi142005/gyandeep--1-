import React, { useState, useRef, useEffect, memo } from 'react';
import { useResponsive } from '../hooks/useResponsive';

export interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  aspectRatio?: string;
  sizes?: string;
  srcSet?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

export function LazyImage({
  src,
  alt,
  className = '',
  fallbackSrc = '/placeholder.svg',
  aspectRatio,
  sizes,
  loading = 'lazy',
  onLoad,
  onError,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(loading === 'eager');
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { breakpoint, isMobile } = useResponsive();

  useEffect(() => {
    if (loading === 'lazy' && containerRef.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        },
        {
          rootMargin: '100px',
          threshold: 0,
        }
      );
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [loading]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const getResponsiveSrc = () => {
    if (isMobile) return src.replace(/\.(jpg|png|jpeg)$/i, '-mobile.$1');
    if (breakpoint === 'sm') return src.replace(/\.(jpg|png|jpeg)$/i, '-sm.$1');
    return src;
  };

  const computedSizes = sizes || (isMobile ? '100vw' : breakpoint === 'sm' ? '50vw' : '33vw');

  return (
    <div
      ref={containerRef}
      className={`lazy-image-container ${className}`}
      style={{
        aspectRatio,
        backgroundColor: '#f3f4f6',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {isInView && !hasError && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          sizes={computedSizes}
          loading={loading}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          decoding="async"
        />
      )}
      {hasError && (
        <img
          src={fallbackSrc}
          alt={alt}
          className="w-full h-full object-cover opacity-50"
        />
      )}
    </div>
  );
}

export interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const avatarSizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

export const Avatar = memo(function Avatar({
  src,
  name,
  size = 'md',
  className = '',
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const bgColors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
  ];

  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % bgColors.length;

  return (
    <div
      className={`${avatarSizes[size]} rounded-full flex items-center justify-center overflow-hidden ring-2 ring-white ${
        className.includes('ring-') ? '' : 'ring-2 ring-white'
      }`}
    >
      {src && !imgError ? (
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className={`${bgColors[colorIndex]} text-white font-medium flex items-center justify-center w-full h-full`}>
          {initials}
        </span>
      )}
    </div>
  );
});

export const ImageGallery = memo(function ImageGallery({
  images,
  className = '',
}: {
  images: Array<{ src: string; alt: string }>;
  className?: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { isMobile } = useResponsive();

  return (
    <div className={`image-gallery ${className}`}>
      <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
        <img
          src={images[selectedIndex]?.src}
          alt={images[selectedIndex]?.alt}
          className="w-full h-full object-contain"
        />
        {!isMobile && images.length > 1 && (
          <>
            <button
              onClick={() => setSelectedIndex((i) => (i > 0 ? i - 1 : images.length - 1))}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
              aria-label="Previous image"
            >
              ←
            </button>
            <button
              onClick={() => setSelectedIndex((i) => (i < images.length - 1 ? i + 1 : 0))}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
              aria-label="Next image"
            >
              →
            </button>
          </>
        )}
      </div>
      {!isMobile && images.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-colors ${
                idx === selectedIndex ? 'border-indigo-600' : 'border-transparent'
              }`}
            >
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default LazyImage;
