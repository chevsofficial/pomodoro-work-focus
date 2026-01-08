import Constants from 'expo-constants';

export const ANDROID_APP_ID =
  Constants.expoConfig?.android?.package ?? 'com.chevslabs.tomoflow';

export const APP_LINKS = {
  appStore: 'https://apps.apple.com/app/id000000000',
  playStore: `https://play.google.com/store/apps/details?id=${ANDROID_APP_ID}`,
  website: 'https://tomoflow.app',
  faq: 'https://tomoflow.app/faq',
  news: 'https://tomoflow.app/news',
  supportEmail: 'support@tomoflow.app',
  terms: 'https://tomoflow.app/terms',
  privacy: 'https://tomoflow.app/privacy',
  socials: {
    twitter: 'https://twitter.com/tomoflowapp',
    instagram: 'https://instagram.com/tomoflowapp',
    facebook: 'https://www.facebook.com/tomoflowapp',
  },
};
