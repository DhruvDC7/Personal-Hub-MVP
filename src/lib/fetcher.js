import { showToast } from './ui';

export async function api(path, { method = 'GET', body, headers = {} } = {}, retry = true) {
  try {
    const url = path.startsWith('http') || path.startsWith('/api') ? path : `/api${path}`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && retry) {
      const r = await fetch('/api/auth/refresh', { method: 'POST' });
      if (r.ok) {
        return api(path, { method, body, headers }, false);
      }
    }

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
