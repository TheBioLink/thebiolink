'use client';
import { useState, useEffect, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';

// --- Interfaces (audioUrl REMOVED) ---
interface Link {
  id: string;
  url: string;
  title: string;
  icon: string;
  position: number;
}
interface Widget {
  id: string;
  type: 'spotify' | 'youtube' | 'twitter' | 'custom' | 'form' | 'ecommerce' | 'api' | 'calendar';
  title?: string;
  content?: string;
  url?: string;
  position: number;
}
interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
  hidden?: boolean;
}
interface User {
  _id: string;
  name: string;
  username: string;
  avatar: string;
  profileBanner: string;
  pageBackground: string;
  bio: string;
  location?: string;
  isEmailVerified: boolean;
  plan?: string;
  profileViews?: number;
  theme?: 'indigo' | 'purple' | 'green' | 'red' | 'halloween';
  badges?: Badge[];
  email?: string;
  xp?: number;
  level?: number;
  loginStreak?: number;
  lastLogin?: string;
  loginHistory?: string[];
  lastMonthlyBadge?: string;
  seoMeta: { title?: string; description?: string; keywords?: string };
  analyticsCode?: string;
}
interface LayoutSection {
  id: string;
  type: 'bio' | 'links' | 'widget' | 'spacer' | 'custom' | 'form' | 'ecommerce' | 'tab' | 'column' | 'api' | 'calendar' | 'page';
  widgetId?: string;
  height?: number;
  content?: string;
  children?: LayoutSection[];
  pagePath?: string;
  styling?: { [key: string]: string };
}

// --- History Action Type ---
type HistoryAction =
  | { type: 'SAVE'; payload: LayoutSection[] }
  | { type: 'UNDO' };

// --- Constants ---
const FAMOUS_LINKS = [
  { title: 'Instagram', icon: 'https://cdn-icons-png.flaticon.com/512/174/174855.png' },
  { title: 'YouTube', icon: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png' },
  { title: 'Twitch', icon: 'https://cdn-icons-png.flaticon.com/512/657/657252.png' },
  { title: 'Twitter / X', icon: 'https://cdn-icons-png.flaticon.com/512/733/733579.png' },
  { title: 'Discord', icon: 'https://cdn-icons-png.flaticon.com/512/946/946822.png' },
  { title: 'Spotify', icon: 'https://cdn-icons-png.flaticon.com/512/2111/2111624.png' },
  { title: 'SoundCloud', icon: 'https://cdn-icons-png.flaticon.com/512/1384/1384045.png' },
  { title: 'Portfolio', icon: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png' },
  { title: 'Merch', icon: 'https://cdn-icons-png.flaticon.com/512/3003/3003947.png' },
  { title: 'Contact', icon: 'https://cdn-icons-png.flaticon.com/512/724/724933.png' },
];

const WIDGET_TYPES = [
  { id: 'youtube', name: 'YouTube Video', icon: '📺' },
  { id: 'spotify', name: 'Spotify Embed', icon: '🎵' },
  { id: 'twitter', name: 'Twitter Feed', icon: '🐦' },
  { id: 'custom', name: 'Custom HTML', icon: '</>' },
  { id: 'form', name: 'Contact Form', icon: '📝' },
  { id: 'ecommerce', name: 'Buy Button', icon: '🛒' },
  { id: 'api', name: 'Dynamic API', icon: '🔌' },
  { id: 'calendar', name: 'Calendar', icon: '📅' },
];

const TEMPLATES: { id: string; name: string; config: LayoutSection[] }[] = [
  { id: 'minimalist', name: 'Minimalist', config: [{ id: 'bio', type: 'bio' }, { id: 'links', type: 'links' }] },
  { id: 'creator', name: 'Content Creator', config: [
    { id: 'bio', type: 'bio' },
    { id: 'links', type: 'links' },
    { id: 'yt', type: 'widget', widgetId: 'yt1' },
    { id: 'sp', type: 'widget', widgetId: 'sp1' },
  ]},
  { id: 'musician', name: 'Musician', config: [
    { id: 'bio', type: 'bio' },
    { id: 'spotify', type: 'widget', widgetId: 'sp1' },
    { id: 'soundcloud', type: 'widget', widgetId: 'sc1' },
    { id: 'merch', type: 'ecommerce' },
  ]},
  { id: 'gamer', name: 'Gamer', config: [
    { id: 'bio', type: 'bio' },
    { id: 'twitch', type: 'widget', widgetId: 'tw1' },
    { id: 'youtube', type: 'widget', widgetId: 'yt1' },
    { id: 'discord', type: 'links' },
  ]},
  { id: 'business', name: 'Business', config: [
    { id: 'bio', type: 'bio' },
    { id: 'contact', type: 'form' },
    { id: 'calendar', type: 'calendar' },
    { id: 'links', type: 'links' },
  ]},
  { id: 'artist', name: 'Digital Artist', config: [
    { id: 'bio', type: 'bio' },
    { id: 'gallery', type: 'column', children: [
      { id: 'img1', type: 'custom', content: '<img src="https://via.placeholder.com/300" class="rounded-lg">' },
    ]}
  ]},
  { id: 'student', name: 'Student', config: [
    { id: 'bio', type: 'bio' },
    { id: 'projects', type: 'widget', widgetId: 'proj1' },
    { id: 'resume', type: 'links' },
  ]},
  { id: 'podcast', name: 'Podcast', config: [
    { id: 'bio', type: 'bio' },
    { id: 'episodes', type: 'api', content: '/api/podcast/feed' },
    { id: 'subscribe', type: 'links' },
  ]},
  { id: 'ecommerce', name: 'E-Commerce', config: [
    { id: 'bio', type: 'bio' },
    { id: 'shop', type: 'ecommerce' },
    { id: 'links', type: 'links' },
  ]},
  { id: 'portfolio', name: 'Portfolio', config: [
    { id: 'bio', type: 'bio' },
    { id: 'work', type: 'column', children: [
      { id: 'proj1', type: 'custom', content: '<div>Project 1</div>' },
      { id: 'proj2', type: 'custom', content: '<div>Project 2</div>' },
    ]}
  ]},
  { id: 'influencer', name: 'Influencer', config: [
    { id: 'bio', type: 'bio' },
    { id: 'socials', type: 'links' },
    { id: 'promo', type: 'custom', content: '<div>✨ Exclusive Content ✨</div>' },
  ]},
  { id: 'nonprofit', name: 'Non-Profit', config: [
    { id: 'bio', type: 'bio' },
    { id: 'donate', type: 'ecommerce' },
    { id: 'mission', type: 'custom', content: '<div>Our Mission</div>' },
  ]},
];

const isValidUsername = (username: string): boolean => {
  return /^[a-zA-Z0-9_-]{3,30}$/.test(username);
};

const getBioLinkUrl = (username: string): string => {
  if (!isValidUsername(username)) return 'https://thebiolink.lol/';
  return `https://thebiolink.lol/${encodeURIComponent(username)}`;
};

const uploadToCloudinary = async (file: File, folder = 'biolink') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  return await res.json();
};

const historyReducer = (state: LayoutSection[][], action: HistoryAction): LayoutSection[][] => {
  switch (action.type) {
    case 'SAVE':
      return [...state, action.payload];
    case 'UNDO':
      return state.length > 1 ? state.slice(0, -1) : state;
    default:
      return state;
  }
};

// --- TAB COMPONENTS ---
const CustomizeTab = ({ user, setUser }: { user: User; setUser: (user: User) => void }) => {
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'username') {
      const safeValue = value.replace(/[^a-zA-Z0-9_-]/g, '');
      setUser({ ...user, [name]: safeValue });
    } else if (name.startsWith('seo.')) {
      const seoField = name.split('.')[1] as keyof User['seoMeta'];
      setUser({ ...user, seoMeta: { ...user.seoMeta, [seoField]: value } });
    } else {
      setUser({ ...user, [name]: value });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof User) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      let folder = 'biolink';
      if (field === 'avatar') folder = 'avatars';
      if (field === 'pageBackground') folder = 'backgrounds';
      const { url } = await uploadToCloudinary(file, folder);
      setUser({ ...user, [field]: url });
    } catch (err) {
      alert(`Failed to upload ${field}`);
    }
  };

  const handleThemeChange = (theme: User['theme']) => {
    setUser({ ...user, theme });
  };

  return (
    <div id="tab-customize" className="space-y-6">
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
        <h2 className="text-xl font-semibold mb-6 text-white">Profile Settings</h2>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
            <input
              type="text"
              name="name"
              value={user.name}
              onChange={handleProfileChange}
              maxLength={100}
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
            <div className="flex">
              <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-gray-600 bg-gray-700/50 text-gray-400">
                thebiolink.lol/
              </span>
              <input
                type="text"
                name="username"
                value={user.username}
                onChange={handleProfileChange}
                maxLength={30}
                className="flex-1 min-w-0 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-r-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="yourname"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Letters, numbers, underscores, hyphens only (3–30 chars)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Location (optional)</label>
            <input
              type="text"
              name="location"
              value={user.location || ''}
              onChange={handleProfileChange}
              maxLength={100}
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g., Los Angeles, Tokyo, Berlin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Avatar</label>
            <div className="flex items-center gap-3">
              {user.avatar && (
                <img src={user.avatar} alt="Avatar preview" className="w-12 h-12 rounded-full object-cover" />
              )}
              <label className="cursor-pointer bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm">
                Upload Avatar
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'avatar')}
                  className="hidden"
                />
              </label>
            </div>
            <input
              type="url"
              name="avatar"
              value={user.avatar}
              onChange={handleProfileChange}
              className="w-full mt-2 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Or paste URL"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Page Background</label>
            <div className="flex items-center gap-3">
              {user.pageBackground && (
                <div className="w-16 h-16 bg-cover bg-center rounded border border-gray-600" style={{ backgroundImage: `url(${user.pageBackground})` }} />
              )}
              <label className="cursor-pointer bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm">
                Upload Background
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => handleFileUpload(e, 'pageBackground')}
                  className="hidden"
                />
              </label>
            </div>
            <input
              type="url"
              name="pageBackground"
              value={user.pageBackground}
              onChange={handleProfileChange}
              className="w-full mt-2 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Supports .jpg, .png, .gif, .mp4"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
            <textarea
              name="bio"
              value={user.bio}
              onChange={handleProfileChange}
              maxLength={500}
              rows={3}
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Tell people about yourself"
            />
          </div>
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-white">SEO Meta Tags</h3>
            <input
              type="text"
              name="seo.title"
              value={user.seoMeta.title || ''}
              onChange={handleProfileChange}
              placeholder="Page Title"
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400"
            />
            <textarea
              name="seo.description"
              value={user.seoMeta.description || ''}
              onChange={handleProfileChange}
              placeholder="Page Description"
              rows={2}
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400"
            />
            <input
              type="text"
              name="seo.keywords"
              value={user.seoMeta.keywords || ''}
              onChange={handleProfileChange}
              placeholder="Keywords (comma separated)"
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Theme</label>
            <div className="flex gap-2 flex-wrap">
              {(['indigo', 'purple', 'green', 'red', 'halloween'] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => handleThemeChange(theme)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    user.theme === theme
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const WidgetsTab = ({ widgets, setWidgets, user }: { widgets: Widget[]; setWidgets: (widgets: Widget[]) => void; user: User }) => (
  <div id="tab-widgets" className="space-y-6">
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
      <h2 className="text-xl font-semibold mb-4 text-white">Custom Widgets</h2>
      <p className="text-gray-400 mb-4">Add embeds, media, or custom HTML to your BioLink.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {WIDGET_TYPES.map((w) => (
          <button
            key={w.id}
            onClick={() => setWidgets([...widgets, { id: Date.now().toString(), type: w.id as any, title: '', content: '', url: '', position: widgets.length }])}
            disabled={w.id === 'custom' && user.plan !== 'premium'}
            className={`bg-gray-700/50 hover:bg-gray-700 p-3 rounded-lg text-center text-white ${w.id === 'custom' && user.plan !== 'premium' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="text-2xl mb-1">{w.icon}</div>
            <div className="text-xs">{w.name}</div>
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {widgets.map((widget, index) => (
          <div key={widget.id} className="border border-gray-700 rounded-xl p-4 bg-gray-700/30">
            <div className="font-medium text-white mb-2 capitalize">{widget.type} Widget</div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Widget Title"
                value={widget.title || ''}
                onChange={(e) => setWidgets(widgets.map((w, i) => i === index ? { ...w, title: e.target.value } : w))}
                className="w-full px-3 py-2 bg-gray-600/50 border border-gray-600 rounded-lg text-white text-sm"
              />
              <input
                type="url"
                placeholder="Embed URL (YouTube, Spotify, etc.)"
                value={widget.url || ''}
                onChange={(e) => setWidgets(widgets.map((w, i) => i === index ? { ...w, url: e.target.value } : w))}
                className="w-full px-3 py-2 bg-gray-600/50 border border-gray-600 rounded-lg text-white text-sm"
              />
              {widget.type === 'custom' && (
                <textarea
                  placeholder="Paste HTML or embed code"
                  value={widget.content || ''}
                  onChange={(e) => setWidgets(widgets.map((w, i) => i === index ? { ...w, content: e.target.value } : w))}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-600/50 border border-gray-600 rounded-lg text-white text-sm font-mono"
                />
              )}
            </div>
            <button
              onClick={() => setWidgets(widgets.filter((_, i) => i !== index).map((w, i) => ({ ...w, position: i })))}
              className="mt-3 text-red-400 text-sm"
            >
              Remove Widget
            </button>
          </div>
        ))}
        {widgets.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            No widgets added. Choose one above to get started.
          </div>
        )}
      </div>
    </div>
  </div>
);

const OverviewTab = ({ user, links }: { user: User; links: Link[] }) => {
  const bioLinkUrl = getBioLinkUrl(user.username);
  const planDisplay = user.plan 
    ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1)
    : 'Free';
  const stats = {
    profileViews: user.profileViews || 0,
    totalLinks: links.length,
    last7Days: 97,
    growth: '+22 views since last week',
  };
  return (
    <div id="tab-overview" className="space-y-6">
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h-2v-2a6 6 0 00-5.356-5.356L9 9H7v2H5V9M15 19h2v2a6 6 0 015.356 5.356L21 21h2v-2m-2 2h-2v-2a6 6 0 01-5.356-5.356L15 15H9M9 19V5l2-2 2 2v14l-2 2-2-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white">Account Overview</h2>
        </div>
        <p className="text-gray-400">Check out information about your account.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-300 text-sm font-medium">Username</h3>
            <div className="bg-gray-700/50 p-1 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10v6H7V8z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h6v6h-6v-6z" />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded text-sm font-medium">
              {user.username}
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-300 text-sm font-medium">Profile Views</h3>
            <div className="bg-gray-700/50 p-1 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-white">{stats.profileViews}</span>
            <span className="text-xs text-green-400 mb-1">{stats.growth}</span>
          </div>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-300 text-sm font-medium">Plan</h3>
            <div className="bg-gray-700/50 p-1 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9M5 11V9m2 2a2 2 0 104 0 2 2 0 004 0z" />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-purple-600/20 text-purple-400 px-2 py-1 rounded text-sm font-medium">
              {planDisplay}
            </div>
            {user.plan !== 'premium' && (
              <button className="text-xs text-indigo-400 hover:text-indigo-300 underline">Upgrade</button>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 011 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H7a1 1 0 01-1-1v-3a1 1 0 011-1h3a1 1 0 011 1v1z" />
              </svg>
              Manage Links
            </button>
            <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Customize Profile
            </button>
          </div>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Your BioLink</h3>
          <a
            href={bioLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-indigo-400 hover:underline break-all block"
          >
            {bioLinkUrl}
          </a>
        </div>
      </div>
    </div>
  );
};

const LinksTab = ({ links, setLinks }: { links: Link[]; setLinks: (links: Link[]) => void }) => (
  <div id="tab-links" className="space-y-6">
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-xl font-semibold text-white">Link Manager</h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={''}
            onChange={() => {}}
            className="bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="">Custom Link</option>
            {FAMOUS_LINKS.map((link, i) => (
              <option key={i} value={link.title}>{link.title}</option>
            ))}
          </select>
          <button
            onClick={() => setLinks([...links, { id: Date.now().toString(), url: '', title: 'New Link', icon: '', position: links.length }])}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            + Add Link
          </button>
        </div>
      </div>
      <div className="space-y-4">
        {links.map((link, index) => (
          <div key={link.id} className="border border-gray-700 rounded-xl p-4 bg-gray-700/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={link.title}
                  onChange={(e) => setLinks(links.map((l, i) => i === index ? { ...l, title: e.target.value } : l))}
                  maxLength={100}
                  className="w-full px-3 py-2 bg-gray-600/50 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">URL</label>
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => setLinks(links.map((l, i) => i === index ? { ...l, url: e.target.value } : l))}
                  className="w-full px-3 py-2 bg-gray-600/50 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <input
                type="text"
                value={link.icon}
                onChange={(e) => setLinks(links.map((l, i) => i === index ? { ...l, icon: e.target.value } : l))}
                className="px-3 py-2 bg-gray-600/50 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-400 flex-1 mr-3"
                placeholder="Icon URL (optional)"
              />
              <button
                onClick={() => setLinks(links.filter((_, i) => i !== index).map((l, i) => ({ ...l, position: i })))}
                className="text-red-400 hover:text-red-300 font-medium"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        {links.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No links added yet</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

const TemplatesTab = ({ setLayoutStructure }: { setLayoutStructure: (config: LayoutSection[]) => void }) => (
  <div id="tab-templates" className="space-y-6">
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
      <h2 className="text-xl font-semibold mb-4 text-white">Template Gallery</h2>
      <p className="text-gray-400 mb-6">Select a template to get started quickly. You can customize it in the builder.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => setLayoutStructure(template.config)}
            className="p-4 bg-gray-700/50 hover:bg-gray-700 rounded-xl text-left"
          >
            <h3 className="text-white font-medium">{template.name}</h3>
            <p className="text-gray-400 text-sm">Pre-built layout for {template.name.toLowerCase()} profiles.</p>
          </button>
        ))}
      </div>
    </div>
  </div>
);

const ProfileBuilderTab = ({ 
  layoutStructure, 
  setLayoutStructure,
  user
}: { 
  layoutStructure: LayoutSection[];
  setLayoutStructure: (sections: LayoutSection[]) => void;
  user: User;
}) => {
  const [configJson, setConfigJson] = useState(JSON.stringify(layoutStructure, null, 2));
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [history, dispatchHistory] = useReducer(historyReducer, [layoutStructure]);
  useEffect(() => {
    setConfigJson(JSON.stringify(layoutStructure, null, 2));
  }, [layoutStructure]);
  const handleConfigChange = (value: string | undefined) => {
    setConfigJson(value || '');
  };
  const applyConfig = () => {
    try {
      const parsed = JSON.parse(configJson);
      if (Array.isArray(parsed)) {
        dispatchHistory({ type: 'SAVE', payload: parsed });
        setLayoutStructure(parsed);
      }
    } catch (error) {
      alert('Invalid JSON config');
    }
  };
  const undo = () => {
    if (history.length > 1) {
      dispatchHistory({ type: 'UNDO' });
      setLayoutStructure(history[history.length - 2]);
    }
  };
  const renderPreview = () => {
    const className = previewDevice === 'mobile' ? 'w-[375px] h-[667px] mx-auto border border-gray-600 overflow-y-auto' : 'w-full';
    return (
      <div className={className} style={{ background: user.pageBackground }}>
        {layoutStructure.map((section) => (
          <div key={section.id} style={section.styling}>
            {section.type === 'bio' && <div>Bio Section</div>}
            {section.type === 'page' && <div>Sub-page: {section.pagePath}</div>}
            {section.children && section.children.map(child => <div key={child.id}>{child.type}</div>)}
          </div>
        ))}
      </div>
    );
  };
  return (
    <div id="tab-builder" className="space-y-6">
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Profile Builder</h2>
        <p className="text-gray-400 mb-4">Edit the JSON config for your layout. Use templates for starting points.</p>
        <Editor
          height="400px"
          defaultLanguage="json"
          value={configJson}
          onChange={handleConfigChange}
          theme="vs-dark"
        />
        <div className="flex gap-3 mt-4">
          <button onClick={applyConfig} className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Apply Config</button>
          <button onClick={undo} disabled={history.length <= 1} className="bg-gray-700 text-white px-4 py-2 rounded-lg disabled:opacity-50">Undo</button>
        </div>
      </div>
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Live Preview</h2>
        <div className="flex gap-3 mb-4">
          <button onClick={() => setPreviewDevice('desktop')} className="bg-gray-700 text-white px-4 py-2 rounded-lg">Desktop</button>
          <button onClick={() => setPreviewDevice('mobile')} className="bg-gray-700 text-white px-4 py-2 rounded-lg">Mobile</button>
        </div>
        {renderPreview()}
      </div>
    </div>
  );
};

const AnalyticsIntegrationTab = ({ user, setUser }: { user: User; setUser: (user: User) => void }) => (
  <div id="tab-analytics_integration" className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
    <h2 className="text-xl font-semibold mb-4 text-white">Analytics Integration</h2>
    <textarea
      value={user.analyticsCode || ''}
      onChange={(e) => setUser({ ...user, analyticsCode: e.target.value })}
      placeholder="Paste Google Analytics script or similar"
      rows={5}
      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white font-mono"
    />
  </div>
);

const AnalyticsTab = ({ user, links }: { user: User; links: Link[] }) => (
  <div id="tab-analytics" className="space-y-6">
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
      <h2 className="text-xl font-semibold mb-4 text-white">Profile Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900/50 p-5 rounded-xl">
          <h3 className="text-gray-300 text-sm font-medium mb-1">Profile Views</h3>
          <p className="text-3xl font-bold text-white">
            {user.profileViews != null ? user.profileViews.toLocaleString() : '—'}
          </p>
        </div>
        <div className="bg-gray-900/50 p-5 rounded-xl">
          <h3 className="text-gray-300 text-sm font-medium mb-1">Total Links</h3>
          <p className="text-3xl font-bold text-white">{links.length}</p>
        </div>
      </div>
    </div>
  </div>
);

const NewsTab = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('https://www.thebiolink.lol/api/news');
        if (!res.ok) throw new Error('Failed to fetch news');
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error('News fetch error:', err);
        setError(err.message || 'Unable to load news at this time.');
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);
  return (
    <div id="tab-news" className="space-y-6">
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Latest News</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="text-center py-6 text-red-400">
            <p>⚠️ {error}</p>
          </div>
        ) : posts.length === 0 ? (
          <p className="text-gray-400 text-center py-6">No news available at the moment.</p>
        ) : (
          <div className="space-y-4">
            {posts.slice(0, 5).map((post: any) => (
              <div key={post.id || post.title} className="border-b border-gray-700 pb-4 last:border-0 last:pb-0">
                <h3 className="text-white font-medium">{post.title}</h3>
                <p className="text-gray-400 text-sm mt-1">
                  {post.publishedAt
                    ? new Date(post.publishedAt).toLocaleDateString()
                    : 'Date unknown'} • {post.authorName || 'The BioLink Team'}
                </p>
                <p className="text-gray-300 mt-2 text-sm">
                  {post.content ? post.content.substring(0, 120) + (post.content.length > 120 ? '...' : '') : 'No content available.'}
                </p>
                {post.url && (
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                  >
                    Read more →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        <a
          href="https://www.thebiolink.lol/news"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-indigo-400 hover:text-indigo-300 text-sm font-medium"
        >
          View all news →
        </a>
      </div>
    </div>
  );
};

const BadgesTab = ({ user, setUser }: { user: User; setUser: (user: User) => void }) => (
  <div id="tab-badges" className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
    <h2 className="text-xl font-semibold mb-4 text-white">Your Badges</h2>
    {user.badges && user.badges.length > 0 ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {user.badges.map(badge => (
          <div 
            key={badge.id} 
            className={`p-4 rounded-xl border ${
              badge.hidden 
                ? 'border-gray-700 bg-gray-900/30 opacity-50' 
                : 'border-indigo-500 bg-indigo-900/20'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <img src={badge.icon} alt={badge.name} className="w-8 h-8" />
                <span className="text-white font-medium">{badge.name}</span>
              </div>
              <button
                onClick={() => setUser({ ...user, badges: user.badges?.map(b => b.id === badge.id ? { ...b, hidden: !b.hidden } : b) })}
                className={`px-2 py-1 text-xs rounded ${
                  badge.hidden 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {badge.hidden ? 'Show' : 'Hide'}
              </button>
            </div>
            <p className="text-gray-300 text-sm mb-2">{badge.description}</p>
            <p className="text-xs text-gray-500">
              Earned: {new Date(badge.earnedAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-gray-400">You haven't earned any badges yet.</p>
    )}
  </div>
);

const SettingsTab = ({ user, setUser }: { user: User; setUser: (user: User) => void }) => (
  <div id="tab-settings" className="space-y-6">
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
      <h2 className="text-xl font-semibold mb-4 text-white">Account Security</h2>
      <p className="text-gray-400 mb-4">
        {!user.isEmailVerified ? 'Verify your email and set a password to secure your account.' : 'Your account is secured with email verification.'}
      </p>
      <button
        onClick={() => alert('Security setup')}
        className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm"
      >
        {!user.isEmailVerified ? 'Set Up Security' : 'Manage Security'}
      </button>
    </div>
    <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-700 rounded-2xl p-6">
      <div className="flex items-start">
        <div className="bg-purple-500/20 p-3 rounded-lg mr-4">
          <svg className="w-6 h-6 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 001.028.684l3.292.677c.921.192 1.583 1.086 1.285 1.975l-1.07 3.292a1 1 0 00.684 1.028l3.292.677c.921.192 1.583 1.086 1.285 1.975l-1.07 3.292a1 1 0 00-1.902 0l-1.07-3.292a1 1 0 00-1.902 0l-1.07 3.292c-.3.921-1.603.921-1.902 0l-1.07-3.292a1 1 0 00-1.902 0l-1.07 3.292c-.3.921-1.603.921-1.902 0l-1.07-3.292a1 1 0 00-1.902 0l-1.07 3.292c-.3.921-1.603.921-1.902 0l-1.07-3.292a1 1 0 00-.684-1.028l-3.292-.677c-.921-.192-1.583-1.086-1.285-1.975l1.07-3.292a1 1 0 00-.684-1.028l-3.292-.677c-.921-.192-1.583-1.086-1.285-1.975l1.07-3.292a1 1 0 00.684-1.028l3.292-.677c.921-.192 1.583-1.086 1.285-1.975L6.708 2.25a1 1 0 00-1.902 0L3.737 5.542c-.3.921.362 1.815 1.285 1.975l3.292.677a1 1 0 001.028-.684L10.41 4.219z" />
          </svg>
        </div>
        <div>
          <h3 className="text-white font-medium">Upgrade to Premium</h3>
          <p className="text-gray-400 text-sm mt-1">
            Unlock custom domains, advanced analytics, priority support, and more.
          </p>
          <button
            onClick={() => window.location.href = '/premium'}
            className="mt-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  </div>
);

const HelpCenterTab = () => (
  <div id="tab-help_center" className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
    <h2 className="text-xl font-semibold mb-4 text-white">Help Center</h2>
    <p className="text-gray-400">Visit our documentation portal for guides and support.</p>
  </div>
);

const AffiliateProgramTab = () => (
  <div id="tab-affiliate" className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 space-y-6">
    <div>
      <h2 className="text-xl font-semibold text-white mb-2">Affiliate Program</h2>
      <p className="text-gray-400">
        Apply to become a sponsored creator and unlock exclusive monetization features.
      </p>
    </div>
    <form className="space-y-4">
      <input
        type="text"
        placeholder="Discord Username"
        className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500"
      />
      <input
        type="text"
        placeholder="BioLink Username"
        className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500"
      />
      <textarea
        placeholder="Social Media Links"
        rows={2}
        className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500"
      />
      <textarea
        placeholder="Communities"
        rows={2}
        className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500"
      />
      <input
        type="text"
        placeholder="Position / Role"
        className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500"
      />
      <button
        type="submit"
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-lg font-medium hover:opacity-90"
      >
        Apply for Affiliate Program
      </button>
    </form>
  </div>
);

// --- Main Dashboard Component ---
export default function Dashboard() {
  const [user, setUser] = useState<User>({
    _id: '',
    name: '',
    username: '',
    avatar: '',
    profileBanner: '',
    pageBackground: '',
    bio: '',
    location: '',
    isEmailVerified: true,
    plan: 'free',
    profileViews: 0,
    theme: 'indigo',
    badges: [],
    email: '',
    xp: 0,
    level: 1,
    loginStreak: 0,
    lastLogin: '',
    loginHistory: [],
    lastMonthlyBadge: '',
    seoMeta: { title: '', description: '', keywords: '' },
    analyticsCode: '',
  });
  const [links, setLinks] = useState<Link[]>([]);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [layoutStructure, setLayoutStructure] = useState<LayoutSection[]>([
    { id: 'bio', type: 'bio' },
    { id: 'spacer-1', type: 'spacer', height: 24 },
    { id: 'links', type: 'links' },
  ]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showGuidelinesModal, setShowGuidelinesModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/dashboard/data');
        if (!res.ok) {
          router.push('/auth/login');
          return;
        }
        const data = await res.json();
        const rawUsername = data.user.username || '';
        const safeUsername = isValidUsername(rawUsername) ? rawUsername : '';
        setUser({
          _id: data.user._id || '',
          name: (data.user.name || '').substring(0, 100),
          username: safeUsername,
          avatar: (data.user.avatar || '').trim(),
          profileBanner: (data.user.profileBanner || '').trim(),
          pageBackground: (data.user.pageBackground || '').trim(),
          bio: (data.user.bio || '').substring(0, 500),
          location: (data.user.location || '').substring(0, 100),
          isEmailVerified: data.user.isEmailVerified ?? true,
          plan: data.user.plan || 'free',
          profileViews: data.user.profileViews || 0,
          theme: (data.user.theme as User['theme']) || 'indigo',
          badges: Array.isArray(data.user.badges) ? data.user.badges : [],
          email: data.user.email || '',
          xp: data.user.xp || 0,
          level: data.user.level || 1,
          loginStreak: data.user.loginStreak || 0,
          lastLogin: data.user.lastLogin || '',
          loginHistory: data.user.loginHistory || [],
          lastMonthlyBadge: data.user.lastMonthlyBadge || '',
          seoMeta: data.user.seoMeta || { title: '', description: '', keywords: '' },
          analyticsCode: data.user.analyticsCode || '',
        });
        const fetchedLinks = Array.isArray(data.links) ? data.links : [];
        const sortedLinks = [...fetchedLinks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        setLinks(
          sortedLinks.length > 0
            ? sortedLinks.map((link: any) => ({
                id: link.id || Date.now().toString(),
                url: (link.url || '').trim(),
                title: (link.title || '').substring(0, 100),
                icon: (link.icon || '').trim(),
                position: link.position ?? 0,
              }))
            : []
        );
        const fetchedWidgets = Array.isArray(data.widgets) ? data.widgets : [];
        const sortedWidgets = [...fetchedWidgets].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        setWidgets(
          sortedWidgets.map((w: any) => ({
            id: w.id || Date.now().toString(),
            type: w.type || 'custom',
            title: w.title || '',
            content: w.content || '',
            url: w.url || '',
            position: w.position ?? 0,
          }))
        );
        setLayoutStructure(data.layoutStructure || [
          { id: 'bio', type: 'bio' },
          { id: 'spacer-1', type: 'spacer', height: 24 },
          { id: 'links', type: 'links' },
        ]);
      } catch (error) {
        console.error('Fetch error:', error);
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      router.push('/auth/login');
    }
  };

  const confirmSave = async () => {
    setShowGuidelinesModal(false);
    setIsSaving(true);
    setMessage(null);
    if (!isValidUsername(user.username)) {
      setMessage({ type: 'error', text: 'Username must be 3–30 characters (letters, numbers, _, -).' });
      setIsSaving(false);
      return;
    }
    try {
      const linksToSend = links
        .filter((link) => link.url.trim() && link.title.trim())
        .map((link, index) => ({
          id: link.id,
          url: link.url.trim(),
          title: link.title.trim().substring(0, 100),
          icon: link.icon?.trim() || '',
          position: index,
        }));
      const widgetsToSend = widgets.map((w, i) => ({
        id: w.id,
        type: w.type,
        title: w.title?.trim() || '',
        content: w.content?.trim() || '',
        url: w.url?.trim() || '',
        position: i,
      }));
      const response = await fetch('/api/dashboard/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            name: user.name.trim().substring(0, 100),
            username: user.username.trim().toLowerCase(),
            avatar: user.avatar?.trim() || '',
            pageBackground: user.pageBackground?.trim() || '',
            bio: user.bio?.trim().substring(0, 500) || '',
            location: user.location?.trim().substring(0, 100) || '',
            plan: user.plan || 'free',
            theme: user.theme || 'indigo',
            layoutStructure,
            seoMeta: user.seoMeta,
            analyticsCode: user.analyticsCode,
            email: user.email,
          },
          links: linksToSend,
          widgets: widgetsToSend,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: 'Changes saved successfully!' });
      } else {
        const errorMessage = data.error || 'Failed to save changes.';
        setMessage({ type: 'error', text: errorMessage });
      }
    } catch (error: any) {
      console.error('Save error:', error);
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    setShowGuidelinesModal(true);
  };

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'customize', name: 'Customize' },
    { id: 'templates', name: 'Templates' },
    { id: 'builder', name: 'Profile Builder' },
    { id: 'links', name: 'Links' },
    { id: 'widgets', name: 'Widgets' },
    { id: 'affiliate', name: 'Affiliate Program' },
    { id: 'analytics_integration', name: 'Analytics Integration' },
    { id: 'analytics', name: 'Analytics' },
    { id: 'news', name: 'News' },
    { id: 'badges', name: 'Badges' },
    { id: 'settings', name: 'Settings' },
    { id: 'help_center', name: 'Help Center' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Your BioLink Dashboard</h1>
              <p className="text-gray-400 mt-2">
                Customize your bio link page at{' '}
                <a
                  href={getBioLinkUrl(user.username)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-indigo-400 hover:text-indigo-300 hover:underline"
                >
                  thebiolink.lol/{user.username}
                </a>
              </p>
            </div>
            <div className="flex gap-3 mt-4 sm:mt-0">
              <button
                onClick={handleLogout}
                className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-xl font-medium transition-colors border border-gray-700"
              >
                Logout
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-70"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-4">
              <h2 className="text-lg font-semibold text-white mb-4">Navigation</h2>
              <ul className="space-y-2">
                {tabs.map((tab) => (
                  <li key={tab.id}>
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      {tab.name}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'overview' && <OverviewTab user={user} links={links} />}
            {activeTab === 'customize' && <CustomizeTab user={user} setUser={setUser} />}
            {activeTab === 'templates' && <TemplatesTab setLayoutStructure={setLayoutStructure} />}
            {activeTab === 'builder' && <ProfileBuilderTab layoutStructure={layoutStructure} setLayoutStructure={setLayoutStructure} user={user} />}
            {activeTab === 'links' && <LinksTab links={links} setLinks={setLinks} />}
            {activeTab === 'widgets' && <WidgetsTab widgets={widgets} setWidgets={setWidgets} user={user} />}
            {activeTab === 'affiliate' && <AffiliateProgramTab />}
            {activeTab === 'analytics_integration' && <AnalyticsIntegrationTab user={user} setUser={setUser} />}
            {activeTab === 'analytics' && <AnalyticsTab user={user} links={links} />}
            {activeTab === 'news' && <NewsTab />}
            {activeTab === 'badges' && <BadgesTab user={user} setUser={setUser} />}
            {activeTab === 'settings' && <SettingsTab user={user} setUser={setUser} />}
            {activeTab === 'help_center' && <HelpCenterTab />}
          </div>
          {/* Preview Panel */}
          <div className="lg:w-80">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 sticky top-8">
              <h2 className="text-xl font-semibold mb-4 text-white">Live Preview</h2>
              <div className="bg-gray-900/50 rounded-xl p-6 text-center relative overflow-hidden min-h-[500px]">
                {user.pageBackground && (
                  /\.(mp4|webm|ogg)$/i.test(user.pageBackground) ? (
                    <video
                      className="absolute inset-0 z-0 object-cover w-full h-full"
                      src={user.pageBackground}
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  ) : /\.gif$/i.test(user.pageBackground) ? (
                    <img
                      src={user.pageBackground}
                      alt="Animated background"
                      className="absolute inset-0 z-0 object-cover w-full h-full"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 z-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${user.pageBackground})` }}
                    />
                  )
                )}
                <div className="absolute inset-0 bg-black/70 z-10"></div>
                <div className="relative z-20 space-y-4">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-white/30"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl text-white font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-white mb-2">{user.name}</h3>
                  {user.location && (
                    <div className="flex items-center justify-center text-gray-300 mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{user.location}</span>
                    </div>
                  )}
                  {user.bio && <p className="text-gray-300 mb-4 max-w-xs mx-auto">{user.bio}</p>}
                  <div className="space-y-6">
                    {layoutStructure.map((section) => {
                      if (section.type === 'bio') return null;
                      if (section.type === 'links' && links.length > 0) {
                        return (
                          <div key={section.id} className="space-y-3">
                            {links.map((link) => (
                              <a key={link.id} href={link.url} className="block bg-white/10 p-2 rounded">
                                {link.title}
                              </a>
                            ))}
                          </div>
                        );
                      }
                      return <div key={section.id} className="bg-white/10 p-2 rounded">{section.type}</div>;
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Messages */}
        {message && (
          <div
            className={`fixed bottom-6 right-6 p-4 rounded-xl ${
              message.type === 'success'
                ? 'bg-green-900/80 text-green-200 border border-green-800'
                : 'bg-red-900/80 text-red-200 border border-red-800'
            } max-w-sm`}
          >
            {message.text}
          </div>
        )}
        {/* Compliance Modal */}
        {showGuidelinesModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-3">Profile Compliance Check</h3>
              <p className="text-gray-300 mb-4">
                Please confirm your profile complies with our{' '}
                <a
                  href="https://www.thebiolink.lol/community-guidelines"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:underline"
                >
                  Community Guidelines
                </a>
                .
              </p>
              <p className="text-yellow-400 text-sm mb-4">
                ⚠️ Violations may result in account suspension.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowGuidelinesModal(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSave}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-70"
                >
                  {isSaving ? 'Saving...' : 'I Comply – Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
