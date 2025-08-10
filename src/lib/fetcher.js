import { showToast } from './ui';

export async function api(path, { method = 'GET', body, headers = {} } = {}) {
  try {
    const url = path.startsWith('http') || path.startsWith('/api') ? path : `/api${path}`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || data.error || 'Something went wrong');
    }

    return data.data ?? data;
  } catch (error) {
    showToast({
      type: 'error',
      message: error.message || 'Failed to fetch data. Please try again.',
    });
    throw error;
  }
}

export async function uploadFile(url, file) {
  try {
    const res = await fetch(url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to upload file');
    }

    return true;
  } catch (error) {
    showToast({
      type: 'error',
      message: error.message || 'Failed to upload file. Please try again.',
    });
    throw error;
  }
}
