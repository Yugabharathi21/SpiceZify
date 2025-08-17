import React from 'react';
import { Settings as SettingsIcon, User, Music, Volume2, Wifi, Shield, Palette } from 'lucide-react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useAuthStore } from '../stores/useAuthStore';
import { upsertUserPreferences } from '../lib/supabase';
import { motion } from 'framer-motion';

export default function Settings() {
  const { user, logout } = useAuthStore();
  const {
    audioQuality,
    crossfade,
    normalizeVolume,
    setAudioQuality,
    setCrossfade,
    setNormalizeVolume,
  } = useSettingsStore();

  // persist changes for logged-in users
  React.useEffect(() => {
    if (!user) return;
    const prefs = { audioQuality, crossfade: crossfade > 0, normalizeVolume };
    upsertUserPreferences(user.id, prefs).catch(console.error);
  }, [user, audioQuality, crossfade, normalizeVolume]);

  const settingSections = [
    {
      title: 'Account',
      icon: User,
      settings: [
        { label: 'Profile', description: 'Manage your profile information', action: () => {} },
        { label: 'Privacy', description: 'Control your privacy settings', action: () => {} },
        { label: 'Sign Out', description: 'Sign out of your account', action: logout, destructive: true },
      ]
    },
        // Audio section rendered directly
        {
          title: 'Audio',
          icon: Volume2,
          settings: [],
        },
    {
      title: 'Library',
      icon: Music,
      settings: [
        { label: 'Music Folders', description: 'Manage your music library folders', action: () => {} },
        { label: 'Auto-scan', description: 'Automatically scan for new music', action: () => {} },
        { label: 'Metadata', description: 'How to handle music metadata', action: () => {} },
      ]
    },
    {
      title: 'Appearance',
      icon: Palette,
      settings: [
        { label: 'Theme', description: 'Switch between light and dark themes', action: () => {} },
        { label: 'Accent Color', description: 'Customize your accent color', action: () => {} },
        { label: 'Animations', description: 'Enable or disable UI animations', action: () => {} },
      ]
    },
    {
      title: 'Network',
      icon: Wifi,
      settings: [
        { label: 'Sync Settings', description: 'Cloud synchronization preferences', action: () => {} },
        { label: 'Offline Mode', description: 'Use the app without internet', action: () => {} },
        { label: 'Connection', description: 'Network connection settings', action: () => {} },
      ]
    },
    {
      title: 'Privacy & Security',
      icon: Shield,
      settings: [
        { label: 'Data Collection', description: 'Control what data we collect', action: () => {} },
        { label: 'Analytics', description: 'Help improve the app with usage data', action: () => {} },
        { label: 'Permissions', description: 'Manage app permissions', action: () => {} },
      ]
    }
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <SettingsIcon className="w-10 h-10 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground text-lg">
            Customize your SPiceZify experience
          </p>
        </motion.div>

        {/* User Profile */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card/30 rounded-2xl p-6 border border-border"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user?.displayName || 'User'}</h2>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </motion.section>

        {/* Settings Sections */}
        {settingSections.map((section, sectionIndex) => (
          <motion.section
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (sectionIndex + 1) * 0.1 }}
            className="bg-card/20 rounded-2xl border border-border overflow-hidden"
          >
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <section.icon className="w-5 h-5 text-primary" />
                {section.title}
              </h2>
            </div>
            {section.title === 'Audio' ? (
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="font-medium">Audio Quality</h3>
                  <p className="text-sm text-muted-foreground">Choose your preferred audio quality</p>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => setAudioQuality('low')} className={`px-3 py-1 rounded ${audioQuality === 'low' ? 'bg-primary text-primary-foreground' : 'bg-card/10'}`}>Low</button>
                    <button onClick={() => setAudioQuality('normal')} className={`px-3 py-1 rounded ${audioQuality === 'normal' ? 'bg-primary text-primary-foreground' : 'bg-card/10'}`}>Medium</button>
                    <button onClick={() => setAudioQuality('high')} className={`px-3 py-1 rounded ${audioQuality === 'high' ? 'bg-primary text-primary-foreground' : 'bg-card/10'}`}>High</button>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium">Crossfade</h3>
                  <p className="text-sm text-muted-foreground">Smooth transitions between songs (seconds)</p>
                  <div className="mt-2 flex items-center gap-3">
                    <button onClick={() => setCrossfade(0)} className={`px-3 py-1 rounded ${crossfade === 0 ? 'bg-primary text-primary-foreground' : 'bg-card/10'}`}>Off</button>
                    <input type="range" min={0} max={5} value={crossfade} onChange={(e) => setCrossfade(Number(e.target.value))} className="flex-1" />
                    <div className="w-12 text-right">{crossfade}s</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium">Normalize Volume</h3>
                  <p className="text-sm text-muted-foreground">Maintain consistent volume levels</p>
                  <div className="mt-2">
                    <button onClick={() => setNormalizeVolume(!normalizeVolume)} className={`px-3 py-1 rounded ${normalizeVolume ? 'bg-primary text-primary-foreground' : 'bg-card/10'}`}>{normalizeVolume ? 'On' : 'Off'}</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {section.settings.map((setting, index) => (
                  <button
                    key={index}
                    onClick={setting.action}
                    className={`w-full p-6 text-left hover:bg-muted/30 transition-colors group ${
                      setting.destructive ? 'hover:bg-destructive/10' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className={`font-medium group-hover:text-foreground transition-colors ${
                          setting.destructive ? 'text-destructive' : 'text-foreground'
                        }`}>
                          {setting.label}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {setting.description}
                        </p>
                      </div>
                      <div className="text-muted-foreground group-hover:text-foreground transition-colors">
                        →
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.section>
        ))}

        {/* App Info */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center text-muted-foreground"
        >
          <p className="text-sm">SPiceZify v1.0.0</p>
          <p className="text-xs mt-1">Made with ❤️ for music lovers</p>
        </motion.section>
      </div>
    </div>
  );
}