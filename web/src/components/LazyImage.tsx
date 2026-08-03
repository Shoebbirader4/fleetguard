import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  placeholderSrc?: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * LazyImage component with native lazy loading and progressive enhancement
 * 
 * Features:
 * - Native browser lazy loading (loading="lazy")
 * - Intersection Observer fallback for older browsers
 * - Placeholder image support
 * - Fade-in animation on load
 * - Error handling with fallback
 * 
 * Performance benefits:
 * - Reduces initial page load time
 * - Saves bandwidth by only loading visible images
 * - Improves Core Web Vitals (LCP, CLS)
 * 
 * @example
 * <LazyImage
 *   src="/path/to/image.jpg"
 *   alt="Vehicle photo"
 *   placeholderSrc="/path/to/placeholder.jpg"
 *   className="w-full h-48 object-cover"
 * />
 */
export function LazyImage({
  src,
  alt,
  placeholderSrc,
  className = '',
  onLoad,
  onError,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    // Use Intersection Observer for better lazy loading control
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const imageSrc = isInView ? src : placeholderSrc;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        ref={imgRef}
        src={imageSrc || src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        {...props}
      />
      
      {/* Loading placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
      )}
      
      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="text-center text-gray-400 dark:text-gray-500">
            <svg
              className="w-12 h-12 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm font-normal leading-normal">Image not available</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * LazyBackgroundImage component for lazy loading background images
 * 
 * @example
 * <LazyBackgroundImage
 *   src="/path/to/background.jpg"
 *   className="w-full h-64"
 * >
 *   <div>Content here</div>
 * </LazyBackgroundImage>
 */
interface LazyBackgroundImageProps {
  src: string;
  children?: React.ReactNode;
  className?: string;
}

export function LazyBackgroundImage({
  src,
  children,
  className = '',
}: LazyBackgroundImageProps) {
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!divRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    observer.observe(divRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    img.src = src;
    img.onload = () => setIsLoaded(true);
  }, [isInView, src]);

  return (
    <div
      ref={divRef}
      className={`transition-opacity duration-300 ${
        isLoaded ? 'opacity-100' : 'opacity-0'
      } ${className}`}
      style={{
        backgroundImage: isLoaded ? `url(${src})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
      )}
      {children}
    </div>
  );
}
