"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

const KEY = (userId) => `avatar:${userId}`;

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function dataURLToBlob(dataURL) {
  const [header, data] = String(dataURL || '').split(',');
  if (!data) return new Blob();
  const mime = /data:(.*?);base64/.exec(header)?.[1] || 'application/octet-stream';
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export function useAvatar(user) {
  const [url, setUrl] = useState('');
  const [version, setVersion] = useState(''); // fileId marker when available
  const objectUrlRef = useRef('');
  const { refreshToken } = useAuth();

  const revokeObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }
  };

  const loadFromCache = useCallback(() => {
    if (!user?.id) return false;
    try {
      const raw = localStorage.getItem(KEY(user.id));
      if (!raw) return false;
      const { dataURL, fileId } = JSON.parse(raw);
      const blob = dataURLToBlob(dataURL);
      const objUrl = URL.createObjectURL(blob);
      revokeObjectUrl();
      objectUrlRef.current = objUrl;
      setUrl(objUrl);
      if (fileId) setVersion(fileId);
      return true;
    } catch {
      return false;
    }
  }, [user?.id]);

  const saveToCache = useCallback((dataURL, fileId = '') => {
    if (!user?.id || !dataURL) return;
    try {
      localStorage.setItem(KEY(user.id), JSON.stringify({ dataURL, fileId, ts: Date.now() }));
    } catch {}
  }, [user?.id]);

  const clearCache = useCallback(() => {
    if (!user?.id) return;
    try { localStorage.removeItem(KEY(user.id)); } catch {}
  }, [user?.id]);

  const refresh = useCallback(async (force = false) => {
    if (!user?.id) { setUrl(''); return; }
    if (!force && loadFromCache()) return;
    try {
      let res = await fetch('/api/me/avatar', { cache: 'no-store' });
      if (res.status === 401) {
        try {
          await refreshToken();
          res = await fetch('/api/me/avatar', { cache: 'no-store' });
        } catch {
          // refresh failed; treat as no avatar
          clearCache();
          revokeObjectUrl();
          setUrl('');
          setVersion('');
          return;
        }
      }
      if (!res.ok) { // 404 or error
        clearCache();
        revokeObjectUrl();
        setUrl('');
        setVersion('');
        return;
      }
      const blob = await res.blob();
      const dataURL = await blobToDataURL(blob);
      // Try to read fileId from a custom header if server sets it in future
      const fid = res.headers.get('x-file-id') || '';
      saveToCache(dataURL, fid);
      const objUrl = URL.createObjectURL(blob);
      revokeObjectUrl();
      objectUrlRef.current = objUrl;
      setUrl(objUrl);
      setVersion(fid);
    } catch {
      // ignore
    }
  }, [user?.id, loadFromCache, saveToCache, clearCache]);

  useEffect(() => {
    // Initial load or when user changes
    refresh(false);
    return () => revokeObjectUrl();
  }, [refresh]);

  // When avatar is updated via upload/delete, caller should call refresh(true)
  return { avatarUrl: url, refreshAvatar: (force = true) => refresh(force), clearAvatarCache: clearCache, avatarVersion: version };
}
