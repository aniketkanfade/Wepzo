const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function capitalizeWords(str) {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

export async function compressImage(file, maxBytes = MAX_IMAGE_BYTES, outputSize = 800) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        canvas.width = outputSize;
        canvas.height = outputSize;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, outputSize, outputSize);

        let quality = 0.92;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (quality > 0.4) {
          const bytes = Math.ceil((dataUrl.length - 'data:image/jpeg;base64,'.length) * 0.75);
          if (bytes <= maxBytes) break;
          quality -= 0.08;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function readVideoAsDataUrl(file, maxBytes = 20 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) {
      reject(new Error('Video must be under 20MB'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read video'));
    reader.readAsDataURL(file);
  });
}
