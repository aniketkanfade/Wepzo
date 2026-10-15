import api from './axios';

export async function downloadFile(url, filename, config = {}) {
  let data;
  try {
    ({ data } = await api.get(url, { ...config, responseType: 'blob' }));
  } catch (err) {
    const responseData = err.response?.data;
    if (responseData instanceof Blob) {
      try {
        const payload = JSON.parse(await responseData.text());
        throw new Error(payload.message || 'The file could not be downloaded.');
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message !== 'Unexpected end of JSON input') throw parseError;
      }
    }
    throw err;
  }
  // Axios returns error responses as blobs too when responseType is "blob".
  // Surface the API message instead of silently saving an error page as a file.
  if (data.type?.includes('json')) {
    const error = JSON.parse(await data.text());
    throw new Error(error.message || 'The file could not be downloaded.');
  }

  const blob = data instanceof Blob ? data : new Blob([data], { type: data.type || 'application/octet-stream' });
  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export const bulkTypeMap = {
  categories: 'categories',
  sub: 'sub-categories',
  child: 'child-categories',
};
