import { Audio, AVPlaybackSource } from 'expo-av';
import { Vibration } from 'react-native';
import useAppStore from '../store/appStore';
import { logger } from './logger';

const SOUND_SOURCES: Record<string, AVPlaybackSource> = {
  chime1: require('../../assets/sounds/chime1.mp3'),
  chime2: require('../../assets/sounds/chime2.mp3'),
  chime3: require('../../assets/sounds/chime3.mp3'),
};

let currentSound: Audio.Sound | null = null;

export const playIntervalEndSound = async () => {
  try {
    const settings = useAppStore.getState().settings;

    if (!settings.soundEnabled) {
      return;
    }

    const source = SOUND_SOURCES[settings.notificationSoundKey] ?? SOUND_SOURCES.chime1;

    if (currentSound) {
      await currentSound.unloadAsync();
      currentSound = null;
    }

    const { sound } = await Audio.Sound.createAsync(source, {
      shouldPlay: true,
      volume: 1.0,
    });

    currentSound = sound;
  } catch (error) {
    logger.error('[SoundService] Playing interval end sound failed', error);
  }
};

export const triggerIntervalHaptics = () => {
  const settings = useAppStore.getState().settings;
  if (!settings.vibrationEnabled) {
    return;
  }

  Vibration.vibrate([0, 200, 100, 200]);
};
