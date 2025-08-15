'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { showToast } from '@/lib/ui';
import Image from 'next/image';
import { useAvatar } from '@/hooks/useAvatar';

export default function ProfilePage() {
  const { user, logout, fetchWithAuth } = useAuth();
  const { avatarUrl, refreshAvatar, clearAvatarCache } = useAvatar(user);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [avatar, setAvatar] = useState(null); // local unsaved file
  const [avatarPreview, setAvatarPreview] = useState(''); // local preview override when selecting a new file
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pw, setPw] = useState({ old: '', nw: '', confirm: '' });
  const [isChanging, setIsChanging] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profileRes = await fetchWithAuth('/api/me');
        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(prev => ({
            ...prev,
            email: data.user?.email || '',
            name: data.user?.name || '',
            phone: data.user?.phone || '',
            address: data.user?.address || ''
          }));
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        showToast({ type: 'error', message: 'Failed to load profile data' });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user, fetchWithAuth]);

  // Cleanup effect for local object URL used for unsaved avatar preview
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.match(/image\/(jpeg|png|webp)/i)) {
      showToast({ type: 'error', message: 'Only JPG, PNG, and WebP images are allowed' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast({ type: 'error', message: 'Image size should be less than 5MB' });
      return;
    }

    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    setAvatarPreview('');
    // Optimistically clear cache so Navbar reflects removal after save
    clearAvatarCache();
  };

  const validateNewPassword = (_pwd) => {
    // Complexity validation removed; always allow on client-side
    return true;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!pw.old || !pw.nw || !pw.confirm) {
      showToast({ type: 'error', message: 'Please fill all password fields' });
      return;
    }
    if (!validateNewPassword(pw.nw)) {
      showToast({ type: 'error', message: 'New password must be 8+ chars with upper, lower, and special character' });
      return;
    }
    if (pw.nw !== pw.confirm) {
      showToast({ type: 'error', message: 'New passwords do not match' });
      return;
    }
    if (pw.old === pw.nw) {
      showToast({ type: 'error', message: 'New password must be different from old password' });
      return;
    }

    setIsChanging(true);
    try {
      const res = await fetchWithAuth('/api/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: pw.old, newPassword: pw.nw }),
      });

      if (res.ok) {
        setPw({ old: '', nw: '', confirm: '' });
        showToast({ type: 'success', message: 'Password updated successfully' });
      } else {
        const data = await res.json().catch(() => ({}));
        showToast({ type: 'error', message: data?.error || 'Failed to update password' });
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to update password' });
    } finally {
      setIsChanging(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Build requests independently so one failure doesn't block the other
      const profilePromise = fetchWithAuth('/api/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          address: profile.address,
        }),
      });

      let avatarPromise = Promise.resolve({ ok: true });
      if (avatar) {
        const formData = new FormData();
        formData.append('file', avatar);
        avatarPromise = fetchWithAuth('/api/me/avatar', {
          method: 'POST',
          body: formData,
        });
      } else if (avatarPreview === '') {
        // Avatar removed
        avatarPromise = fetchWithAuth('/api/me/avatar', { method: 'DELETE' });
      }

      const [profileResult, avatarResult] = await Promise.allSettled([
        profilePromise,
        avatarPromise,
      ]);

      const profileOk = profileResult.status === 'fulfilled' && profileResult.value?.ok;
      const avatarOk = avatarResult.status === 'fulfilled' && avatarResult.value?.ok;

      if (profileOk && avatarOk) {
        setIsEditing(false);
        showToast({ type: 'success', message: 'Profile updated successfully' });
        // Refresh cached avatar (in Navbar and elsewhere)
        refreshAvatar(true);
      } else {
        const errors = [];
        if (!profileOk) errors.push('profile');
        if (!avatarOk) errors.push('avatar');
        showToast({
          type: 'error',
          message: `Failed to update ${errors.join(' & ')}`,
        });
      }
    } catch (error) {
      showToast({
        type: 'error',
        message: error.message || 'An error occurred while saving changes',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleCancel = () => {
    // Reset form and exit edit mode
    setIsEditing(false);
    // Refetch profile data to discard changes
    fetchWithAuth('/api/me')
      .then(res => res.json())
      .then(data => {
        setProfile(prev => ({
          ...prev,
          name: data.user?.name || '',
          phone: data.user?.phone || '',
          address: data.user?.address || ''
        }));
      });

    // Reset avatar preview
    setAvatar(null);
    setAvatarPreview('');
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-slate-200">Please log in to view your profile.</p>
      </div>
    );
  }

  // Generate initials for avatar fallback
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex flex-col space-y-4 mb-8">
        <h1 className="text-2xl font-bold text-slate-100">Profile</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-8 mt-4">
        {/* Avatar Section */}
        <div className="flex-shrink-0 flex flex-col items-center space-y-4 w-full md:w-auto">
          <div className="relative w-32 h-32 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt="Profile"
                fill
                className="object-cover"
                sizes="128px"
              />
            ) : (
              <span className="text-4xl font-bold text-slate-300">
                {getInitials(profile.name)}
              </span>
            )}
          </div>

          {isEditing && (
            <div className="flex flex-col space-y-2 w-full">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full text-sm px-3 py-1.5 rounded-lg"
                onClick={() => fileInputRef.current?.click()}
              >
                Change Photo
              </Button>
              {(avatarPreview || avatar) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-sm text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg"
                  onClick={handleRemoveAvatar}
                >
                  Remove Photo
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Profile Form */}
        <div className="flex-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={profile.name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={profile.email}
                  disabled
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-400 cursor-not-allowed opacity-70"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={profile.phone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-slate-300 mb-1">
                  Address
                </label>
                <textarea
                  id="address"
                  name="address"
                  rows="3"
                  value={profile.address}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Page Footer Actions */}
      <div className="mt-8 pt-4 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-4">
          {!isEditing ? (
            <>
              <Button
                onClick={() => setIsEditing(true)}
                className="w-full sm:w-auto text-sm px-3 py-1.5 rounded-lg"
              >
                Edit Profile
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowChangePassword(true)}
                className="w-full sm:w-auto text-sm px-3 py-1.5 rounded-lg"
              >
                Change Password
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto text-sm px-3 py-1.5 rounded-lg"
                onClick={handleLogout}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="w-full sm:w-auto text-sm px-3 py-1.5 rounded-lg"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSaving}
                className="w-full sm:w-auto text-sm px-3 py-1.5 rounded-lg"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
        </div>
      </div>

      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowChangePassword(false)} />
          <div className="relative z-10 w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-100">Change Password</h2>
              <button
                type="button"
                onClick={() => setShowChangePassword(false)}
                className="text-slate-400 hover:text-slate-200"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="oldPassword" className="block text-sm font-medium text-slate-300 mb-1">Old Password</label>
                <input
                  id="oldPassword"
                  type="password"
                  autoComplete="current-password"
                  value={pw.old}
                  onChange={(e) => setPw(p => ({ ...p, old: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-slate-300 mb-1">New Password</label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={pw.nw}
                  onChange={(e) => setPw(p => ({ ...p, nw: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {/* Password complexity hint removed */}
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-1">Confirm New Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={pw.confirm}
                  onChange={(e) => setPw(p => ({ ...p, confirm: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowChangePassword(false)} className="text-sm px-3 py-1.5 rounded-lg">Cancel</Button>
                <Button type="submit" disabled={isChanging} className="text-sm px-3 py-1.5 rounded-lg">
                  {isChanging ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
