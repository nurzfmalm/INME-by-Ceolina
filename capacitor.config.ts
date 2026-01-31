import type { CapacitorConfig } from '@capacitor/cli';

// For development with hot-reload, uncomment the server block below
// For production release, keep the server block commented out

const config: CapacitorConfig = {
  appId: 'app.lovable.cb82b02f664a40288652197844c8040b',
  appName: 'inme-ai',
  webDir: 'dist',
  // Development only - uncomment for live preview:
  // server: {
  //   url: 'https://cb82b02f-664a-4028-8652-197844c8040b.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // }
};

export default config;
