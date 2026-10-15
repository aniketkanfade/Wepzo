const REFERENCE_KEY = 'wepzo-qc-visual-search-image';

export function readVisualSearchImage() {
  try { return sessionStorage.getItem(REFERENCE_KEY) || ''; } catch { return ''; }
}

export function clearVisualSearchImage() {
  try { sessionStorage.removeItem(REFERENCE_KEY); } catch { /* storage can be disabled */ }
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeout = window.setTimeout(() => reject(new Error('Image request timed out')), 5000);
    if (typeof source === 'string' && !source.startsWith('data:')) image.crossOrigin = 'anonymous';
    image.onload = () => { window.clearTimeout(timeout); resolve(image); };
    image.onerror = () => { window.clearTimeout(timeout); reject(new Error('Image could not be read')); };
    image.src = source;
  });
}

export async function prepareVisualSearchImage(file) {
  let image;
  let objectUrl = '';
  try {
    if (typeof createImageBitmap === 'function') image = await createImageBitmap(file);
    else {
      objectUrl = URL.createObjectURL(file);
      image = await loadImage(objectUrl);
    }
    const scale = Math.min(1, 320 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d', { alpha: false });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.78);
  } finally {
    image?.close?.();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

async function signature(source) {
  const image = await loadImage(source);
  const canvas = document.createElement('canvas');
  canvas.width = 24;
  canvas.height = 24;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, 24, 24);
  const { data } = context.getImageData(0, 0, 24, 24);
  const histogram = new Array(24).fill(0);
  const luminance = [];
  for (let pixel = 0; pixel < 24 * 24; pixel += 1) {
    const offset = pixel * 4;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const light = (red * 0.299) + (green * 0.587) + (blue * 0.114);
    if (light < 245) {
      histogram[Math.floor(red / 256 * 8)] += 1;
      histogram[8 + Math.floor(green / 256 * 8)] += 1;
      histogram[16 + Math.floor(blue / 256 * 8)] += 1;
    }
  }
  for (let y = 1; y < 24; y += 3) {
    for (let x = 1; x < 24; x += 3) luminance.push((data[(y * 24 + x) * 4] * 0.299 + data[(y * 24 + x) * 4 + 1] * 0.587 + data[(y * 24 + x) * 4 + 2] * 0.114) / 255);
  }
  const histogramTotal = histogram.reduce((sum, value) => sum + value, 0) || 1;
  return {
    histogram: histogram.map(value => value / histogramTotal),
    luminance,
    aspect: image.naturalWidth / Math.max(1, image.naturalHeight),
  };
}

function similarity(first, second) {
  const colorMatch = first.histogram.reduce((sum, value, index) => sum + Math.min(value, second.histogram[index]), 0) / 3;
  const pixelMatch = 1 - first.luminance.reduce((sum, value, index) => sum + Math.abs(value - second.luminance[index]), 0) / first.luminance.length;
  const aspectMatch = Math.exp(-Math.abs(Math.log(first.aspect / second.aspect)) * 0.35);
  return (colorMatch * 0.65) + (pixelMatch * 0.30) + (aspectMatch * 0.05);
}

export async function rankProductsByImage(products, imageData, limit = 60) {
  const reference = await signature(imageData);
  const candidates = (products || []).filter(product => product.image).slice(0, 500);
  const ranked = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < candidates.length) {
      const product = candidates[cursor++];
      try { ranked.push({ product, score: similarity(reference, await signature(product.image)) }); }
      catch { /* Cross-origin images without CORS access are skipped. */ }
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, candidates.length) }, worker));
  ranked.sort((left, right) => right.score - left.score);
  return ranked.slice(0, limit);
}
