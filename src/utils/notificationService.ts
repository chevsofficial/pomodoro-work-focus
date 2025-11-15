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
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted || existing.status === Notifications.AuthorizationStatus.GRANTED) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted || requested.status === Notifications.AuthorizationStatus.GRANTED;
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

  const { title, body } = getNotificationCopy(intervalType);
  const trigger: Notifications.TimeIntervalTriggerInput = {
    seconds: secondsFromNow,
    repeats: false,
  };

  if (Platform.OS === 'android') {
    trigger.channelId = CHANNEL_ID;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
    },
    trigger,
  });
};

export const cancelScheduledNotification = async (identifier: string) => {
  await Notifications.cancelScheduledNotificationAsync(identifier);
};
