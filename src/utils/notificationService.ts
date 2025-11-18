import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { IntervalType } from '../models';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const CHANNEL_ID = 'interval-timer';

export const initializeNotifications = () => {
  if (Platform.OS !== 'android') {
    return;
  }

  void Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Interval timers',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    enableVibrate: true,
  });
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
    console.warn('[Notifications] Error requesting permissions', error);
    return false;
  }
};

const getNotificationCopy = (intervalType: IntervalType) => {
  if (intervalType === 'work') {
    return {
      title: 'Work interval finished',
      body: 'Time for a short break.',
    };
  }

  return {
    title: 'Break finished',
    body: 'Ready to get back to it?',
  };
};

export const scheduleIntervalCompletionNotification = async ({
  secondsFromNow,
  intervalType,
}: {
  secondsFromNow: number;
  intervalType: IntervalType;
}): Promise<string | undefined> => {
  if (secondsFromNow <= 0) {
    return undefined;
  }

  try {
    const { title, body } = getNotificationCopy(intervalType);
    const trigger: Notifications.TimeIntervalTriggerInput = {
      seconds: secondsFromNow,
      repeats: false,
    };

    if (Platform.OS === 'android') {
      trigger.channelId = CHANNEL_ID;
    }

    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger,
    });
  } catch (error) {
    console.warn('[Notifications] Error scheduling notification', error);
    return undefined;
  }
};

export const cancelScheduledNotification = async (identifier: string) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.warn('[Notifications] Error canceling notification', error);
  }
};
