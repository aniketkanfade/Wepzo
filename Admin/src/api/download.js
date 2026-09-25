import api from './axios';

export async function downloadFile(url, filename) {
  const { data } = await api.get(url, { responseType: 'blob' });
  const blob = new Blob([data], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export const bulkTypeMap = {
  categories: 'categories',
  sub: 'sub-categories',
  child: 'child-categories',
};
