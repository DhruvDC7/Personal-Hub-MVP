'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/me');
        if (response.ok) {
          const data = await response.json();
          setProfile(prev => ({
            ...prev,
            email: data.user?.email || '',
            name: data.user?.name || ''
          }));
        }
      } catch {
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // TODO: Implement profile update
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p>Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-slate-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-50">Profile</h1>
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors"
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors"
                >
                  Save Changes
                </button>
              </>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Name</label>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleInputChange}
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                />
              ) : (
                <p className="text-white">{profile.name || 'Not set'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
              <p className="text-white">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Phone</label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleInputChange}
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                />
              ) : (
                <p className="text-white">{profile.phone || 'Not set'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Address</label>
              {isEditing ? (
                <textarea
                  name="address"
                  value={profile.address}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                />
              ) : (
                <p className="text-white whitespace-pre-line">{profile.address || 'Not set'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
