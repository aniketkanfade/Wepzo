import { useImageViewer } from './ImageViewerProvider';

export default function ViewableImage({
  src,
  images,
  index = 0,
  alt = '',
  title,
  className = '',
  viewable = true,
  onClick,
  ...props
}) {
  const viewer = useImageViewer();

  if (!src) return null;

  const handleClick = (e) => {
    onClick?.(e);
    if (!viewable || e.defaultPrevented) return;
    const gallery = images?.length ? images : [src];
    const idx = images?.length ? (index ?? gallery.indexOf(src)) : 0;
    viewer?.openViewer(gallery, idx >= 0 ? idx : 0, title || alt);
  };

  return (
    <img
      src={src}
      alt={alt}
      onClick={handleClick}
      className={`${className}${viewable ? ' cursor-zoom-in' : ''}`}
      {...props}
    />
  );
}
