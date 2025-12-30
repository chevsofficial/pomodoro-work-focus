import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { IntervalType } from '../models';
import { t } from '../i18n/translations';
import { logger } from './logger';

const SOUND_CHANNEL_ID = 'pomodoro-sound';
const SILENT_CHANNEL_ID = 'pomodoro-silent';

export const initializeNotifications = async () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(SOUND_CHANNEL_ID, {
      name: t('notifications.channels.soundName'),
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
    });

    await Notifications.setNotificationChannelAsync(SILENT_CHANNEL_ID, {
      name: t('notifications.channels.silentName'),
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
      enableVibrate: false,
    });
  }
};

export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    logger.error('[Notifications] Permission request failed', error);
    return false;
  }
};

type ScheduleArgs = {
  secondsFromNow: number;
  intervalType: IntervalType;
  nextIntervalType?: IntervalType;
  soundEnabled: boolean;
  vibrationEnabled?: boolean;
};

export const scheduleIntervalCompletionNotification = async ({
  secondsFromNow,
  intervalType,
  nextIntervalType,
  soundEnabled,
}: ScheduleArgs): Promise<string | undefined> => {
  if (secondsFromNow <= 0) {
    return undefined;
  }

  try {
    let title = '';
    let body = '';

    if (intervalType === 'work') {
      if (nextIntervalType === 'long_break') {
        title = t('notifications.workCompletedTitle');
        body = t('notifications.workCompletedLongBreakBody');
      } else {
        title = t('notifications.workCompletedTitle');
        body = t('notifications.workCompletedShortBreakBody');
      }
    } else if (intervalType === 'short_break' || intervalType === 'long_break') {
      title =
        intervalType === 'short_break'
          ? t('notifications.shortBreakFinishedTitle')
          : t('notifications.longBreakFinishedTitle');
      body = t('notifications.breakFinishedBody');
    } else {
      title = t('notifications.intervalCompletedTitle');
      body = t('notifications.intervalCompletedBody');
    }

    const content: Notifications.NotificationContentInput = {
      title,
      body,
      sound: soundEnabled ? 'default' : undefined,
    };

    const channelId =
      Platform.OS === 'android'
        ? soundEnabled
          ? SOUND_CHANNEL_ID
          : SILENT_CHANNEL_ID
        : undefined;

    const trigger: Notifications.NotificationTriggerInput = {
      seconds: secondsFromNow,
      repeats: false,
      channelId,
    };

    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });

    return id;
  } catch (error) {
    logger.error('[Notifications] Scheduling notification failed', error);
    return undefined;
  }
};

export const cancelScheduledNotification = async (identifier: string) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    logger.error('[Notifications] Canceling notification failed', error);
  }
};
