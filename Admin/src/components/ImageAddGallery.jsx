import { useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { compressImage } from '../utils/mediaUtils';
import ViewableImage from './ViewableImage';

export default function ImageAddGallery({
  images = [],
  onChange,
  max = 6,
  size = 'md',
  label,
  hint,
}) {
  const fileRef = useRef(null);

  const box = size === 'sm' ? 'w-16 h-16' : 'w-20 h-20';
  const canAdd = images.length < max;

  const addImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !canAdd) return;
    try {
      const data = await compressImage(file);
      onChange([...images, data]);
    } catch { /* ignore */ }
    e.target.value = '';
  };

  const removeImage = (idx) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  return (
    <div>
      {label && (
        <p className="text-xs font-semibold text-gray-700 mb-2">
          {label}
          <span className="text-gray-400 font-normal ml-1">({images.length}/{max})</span>
        </p>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={addImage} />
      <div className="flex flex-wrap items-start gap-2">
        {images.map((img, idx) => (
          <div key={idx} className={`relative group shrink-0 ${box}`}>
            <ViewableImage
              src={img}
              images={images}
              index={idx}
              alt=""
              title={label}
              className={`${box} object-cover rounded-lg border border-gray-200 shadow-sm`}
            />
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
            >
              <X size={10} />
            </button>
            <span className="absolute bottom-1 left-1 text-[9px] bg-black/55 text-white px-1 rounded">{idx + 1}</span>
          </div>
        ))}
        {canAdd && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`${box} shrink-0 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-primary-400 hover:text-primary-500 hover:bg-primary-50/40 transition`}
          >
            <Plus size={size === 'sm' ? 16 : 20} />
            <span className="text-[9px] mt-0.5 font-semibold leading-tight">Add Image</span>
          </button>
        )}
      </div>
      {hint && images.length === 0 && (
        <p className="text-[10px] text-gray-400 mt-1.5">{hint}</p>
      )}
    </div>
  );
}
