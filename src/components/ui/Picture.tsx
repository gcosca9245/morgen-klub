import { srcSet } from '@/lib/asset';
import { asset } from '@/lib/asset';

interface Props {
  name: string;
  widths: readonly number[];
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  width: number;
  height: number;
}

/** <picture> mit AVIF/WebP-Varianten aus der Asset-Pipeline. Lazy, außer `priority`. */
export function Picture({ name, widths, alt, sizes, className, priority = false, width, height }: Props) {
  const largest = widths[widths.length - 1] ?? 1280;
  return (
    <picture>
      <source type="image/avif" srcSet={srcSet(name, widths, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(name, widths, 'webp')} sizes={sizes} />
      <img
        src={asset(`/media/${name}-${largest}.webp`)}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        className={className}
      />
    </picture>
  );
}
