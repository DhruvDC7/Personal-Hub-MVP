import { showToast } from './ui';

export async function api(path, { method = 'GET', body, headers = {} } = {}) {
  try {
    const res = await fetch(`/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || data.error || 'Something went wrong');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
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
    console.error('Upload Error:', error);
    showToast({
      type: 'error',
      message: error.message || 'Failed to upload file. Please try again.',
    });
    throw error;
  }
}
