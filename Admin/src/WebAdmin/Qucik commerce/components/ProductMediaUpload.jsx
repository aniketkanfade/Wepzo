import { useRef } from 'react';
import { Plus, X, Video, Play } from 'lucide-react';
import { compressImage, readVideoAsDataUrl } from '../../../utils/mediaUtils';
import ViewableImage from './ViewableImage';

const MAX_GALLERY = 6;
const BOX = 'w-14 h-14';

function MediaBox({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      {children}
    </div>
  );
}

function AddImageBtn({ onClick, title = 'Add Image' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${BOX} shrink-0 border border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center text-gray-400 hover:border-primary-400 hover:text-primary-500 hover:bg-white transition`}
    >
      <Plus size={14} />
      <span className="text-[8px] mt-0.5 font-semibold leading-none">{title}</span>
    </button>
  );
}

export default function ProductMediaUpload({ thumbnail, images = [], video = '', onChange }) {
  const thumbRef = useRef(null);
  const galleryRef = useRef(null);
  const videoRef = useRef(null);

  const setThumb = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      onChange({ thumbnail: await compressImage(file) });
    } catch { /* ignore */ }
    e.target.value = '';
  };

  const addGallery = async (e) => {
    const file = e.target.files?.[0];
    if (!file || images.length >= MAX_GALLERY) return;
    try {
      onChange({ images: [...images, await compressImage(file)] });
    } catch { /* ignore */ }
    e.target.value = '';
  };

  const setVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      onChange({ video: await readVideoAsDataUrl(file) });
    } catch { /* ignore */ }
    e.target.value = '';
  };

  const allImages = [thumbnail, ...images].filter(Boolean);

  return (
    <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-slate-50/80 to-white p-2.5">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <p className="text-xs font-semibold text-gray-800">Product Media</p>
        <span className="text-[9px] text-gray-400">1:1 · max 5MB each</span>
      </div>

      <input ref={thumbRef} type="file" accept="image/*" className="hidden" onChange={setThumb} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={addGallery} />
      <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={setVideo} />

      <div className="flex flex-wrap items-end gap-2">
        <MediaBox label="Thumbnail">
          {thumbnail ? (
            <div className={`relative group ${BOX}`}>
              <ViewableImage
                src={thumbnail}
                images={allImages}
                index={0}
                title="Thumbnail"
                alt="Thumbnail"
                className={`${BOX} object-cover rounded-md border border-gray-200`}
              />
              <button
                type="button"
                onClick={() => onChange({ thumbnail: '' })}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition"
              >
                <X size={8} />
              </button>
            </div>
          ) : (
            <AddImageBtn onClick={() => thumbRef.current?.click()} title="Thumb" />
          )}
        </MediaBox>

        <div className="w-px h-12 bg-gray-200 shrink-0 hidden sm:block" />

        <MediaBox label={`Images ${images.length}/${MAX_GALLERY}`}>
          <div className="flex flex-wrap gap-1.5">
            {images.map((img, idx) => (
              <div key={idx} className={`relative group shrink-0 ${BOX}`}>
                <ViewableImage
                  src={img}
                  images={allImages}
                  index={thumbnail ? idx + 1 : idx}
                  title={`Image ${idx + 1}`}
                  alt=""
                  className={`${BOX} object-cover rounded-md border border-gray-200`}
                />
                <button
                  type="button"
                  onClick={() => onChange({ images: images.filter((_, i) => i !== idx) })}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition"
                >
                  <X size={8} />
                </button>
              </div>
            ))}
            {images.length < MAX_GALLERY && (
              <AddImageBtn onClick={() => galleryRef.current?.click()} />
            )}
          </div>
        </MediaBox>

        <div className="w-px h-12 bg-gray-200 shrink-0 hidden sm:block" />

        <MediaBox label="Video">
          {video ? (
            <div className={`relative group ${BOX}`}>
              <video src={video} className={`${BOX} object-cover rounded-md border border-gray-200 bg-black`} />
              <button
                type="button"
                onClick={() => onChange({ video: '' })}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center shadow"
              >
                <X size={8} />
              </button>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Play size={12} className="text-white drop-shadow" />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => videoRef.current?.click()}
              className={`${BOX} border border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center text-gray-400 hover:border-primary-400 hover:text-primary-500 hover:bg-white transition`}
            >
              <Video size={14} />
              <span className="text-[8px] mt-0.5 font-semibold">Video</span>
            </button>
          )}
        </MediaBox>
      </div>
    </div>
  );
}
