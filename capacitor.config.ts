import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.7225fb5f763546099f6017d1f9a51dfa',
  appName: 'O.S.I Service Ops',
  webDir: 'dist',
  server: {
    url: 'https://7225fb5f-7635-4609-9f60-17d1f9a51dfa.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1B4F9D",
      showSpinner: false
    }
  }
};

export default config;