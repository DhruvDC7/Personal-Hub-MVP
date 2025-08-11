'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { showToast } from '@/lib/ui';

export default function ProfilePage() {
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState({ name: '', email: '', phone: '', address: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // avatar state
  const [avatarUrl, setAvatarUrl] = useState('');           // server URL (GridFS stream)
  const [avatarFile, setAvatarFile] = useState(null);       // newly selected file
  const [avatarPreview, setAvatarPreview] = useState('');   // local preview URL
  const [removeAvatar, setRemoveAvatar] = useState(false);  // mark for deletion
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/me');
        if (res.ok) {
          const data = await res.json();
          setProfile(prev => ({
            ...prev,
            email: data.user?.email || '',
            name: data.user?.name || '',
            phone: data.user?.phone || '',
            address: data.user?.address || ''
          }));
          // always try to load avatar; cache-bust to ensure latest
          setAvatarUrl(`/api/me/avatar?ts=${Date.now()}`);
        }
      } catch (_) {
        // optionally toast
      } finally {
        setIsLoading(false);
      }
    };
    if (user) fetchProfile();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const onPickAvatar = () => fileInputRef.current?.click();

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/image\/(png|jpe?g|webp)/i.test(file.type)) {
      showToast({ type: 'error', message: 'Only PNG, JPG, JPEG, or WEBP allowed.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast({ type: 'error', message: 'Max size 5MB.' });
      return;
    }

    setAvatarFile(file);
    setRemoveAvatar(false);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  const onRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('');
    setRemoveAvatar(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // 1) Save basic profile
      const res = await fetch('/api/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          address: profile.address
        })
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to update profile');

      // 2) Save avatar (upload or delete) if changed
      if (avatarFile) {
        const fd = new FormData();
        fd.append('file', avatarFile);
        const up = await fetch('/api/me/avatar', { method: 'POST', body: fd });
        if (!up.ok) {
          const err = await up.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to upload avatar');
        }
        setAvatarUrl(`/api/me/avatar?ts=${Date.now()}`);
        setAvatarPreview('');
        setAvatarFile(null);
      } else if (removeAvatar) {
        const del = await fetch('/api/me/avatar', { method: 'DELETE' });
        if (!del.ok) {
          const err = await del.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to remove avatar');
        }
        setAvatarUrl(''); // will fall back to initials
        setRemoveAvatar(false);
      }

      showToast({ type: 'success', message: 'Profile updated successfully' });
      setIsEditing(false);
    } catch (error) {
      showToast({ type: 'error', message: error.message || 'Update failed' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => logout();

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-slate-200">Please log in to view your profile.</p>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const initials = (profile?.name || user?.email || 'U')
    .split(' ')
    .map(s => s[0]?.toUpperCase())
    .slice(0, 2)
    .join('');

  const displayAvatar = avatarPreview || (avatarUrl || '');

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-slate-800 rounded-2xl shadow-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-slate-50">Profile</h1>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} variant="primary" className="text-sm px-3 py-1.5 rounded-lg">
                Edit
              </Button>
            ) : (
              <>
                <Button onClick={() => setIsEditing(false)} variant="outline" className="text-sm px-3 py-1.5 rounded-lg">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} variant="primary" isLoading={isSaving} loadingText="Saving..." className="text-sm px-3 py-1.5 rounded-lg">
                  Save
                </Button>
              </>
            )}
            <Button onClick={handleLogout} variant="danger" className="text-sm px-3 py-1.5 rounded-lg">
              Sign Out
            </Button>
          </div>
        </div>

        {/* Avatar + basic */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            {displayAvatar ? (
              <img
                src={displayAvatar}
                onError={() => setAvatarUrl('')}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border border-slate-700"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center text-xl font-semibold">
                {initials}
              </div>
            )}
            {isEditing && (
              <button
                type="button"
                onClick={onPickAvatar}
                className="absolute -bottom-2 -right-2 text-xs bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded-md border border-slate-600"
              >
                Change
              </button>
            )}
          </div>

          {isEditing && (avatarFile || avatarUrl) && (
            <button
              type="button"
              onClick={onRemoveAvatar}
              className="text-xs bg-transparent text-slate-300 hover:text-white underline"
            >
              Remove photo
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onFileChange}
          />
        </div>

        {/* Form */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Name</label>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleInputChange}
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm"
                />
              ) : (
                <p className="text-white text-sm">{profile.name || 'Not set'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
              <p className="text-white text-sm">{user.email}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Phone</label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleInputChange}
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm"
                />
              ) : (
                <p className="text-white text-sm">{profile.phone || 'Not set'}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1">Address</label>
              {isEditing ? (
                <textarea
                  name="address"
                  value={profile.address}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm"
                />
              ) : (
                <p className="text-white text-sm whitespace-pre-line">{profile.address || 'Not set'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
