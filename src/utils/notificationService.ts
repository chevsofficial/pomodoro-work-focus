import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { IntervalType } from '../models';

const INTERVAL_COMPLETIONS_CHANNEL_ID = 'interval-completions';
const TIMER_STATUS_CHANNEL_ID = 'timer-status';
const SILENT_CHANNEL_ID = 'pomodoro-silent';

let activeTimerStatusNotificationId: string | undefined;

export const initNotificationService = async () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(INTERVAL_COMPLETIONS_CHANNEL_ID, {
      name: 'Pomodoro Intervals',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });

    await Notifications.setNotificationChannelAsync(TIMER_STATUS_CHANNEL_ID, {
      name: 'Pomodoro Timer Status',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      vibrationPattern: [0],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync(SILENT_CHANNEL_ID, {
      name: 'Pomodoro timers (silent)',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
      enableVibrate: false,
    });
  }
};

export const initializeNotifications = initNotificationService;

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
        title = 'Work interval completed';
        body = 'Great job! Time for a long break.';
      } else {
        title = 'Work interval completed';
        body = 'Nice work! Time for a short break.';
      }
    } else if (intervalType === 'short_break' || intervalType === 'long_break') {
      title =
        intervalType === 'short_break'
          ? 'Short break finished'
          : 'Long break finished';
      body = "Let's get back to focusing.";
    } else {
      title = 'Interval completed';
      body = 'Ready for the next one?';
    }

    const content: Notifications.NotificationContentInput = {
      title,
      body,
      sound: soundEnabled ? 'default' : undefined,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    };

    const channelId =
      Platform.OS === 'android'
        ? soundEnabled
          ? INTERVAL_COMPLETIONS_CHANNEL_ID
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

type TimerStatusNotificationParams = {
  intervalType: IntervalType;
  remainingSeconds: number;
  taskTitle?: string;
};

export const showTimerStatusNotification = async ({
  intervalType,
  remainingSeconds,
  taskTitle,
}: TimerStatusNotificationParams): Promise<void> => {
  if (Platform.OS !== 'android') {
    return;
  }

  const minutes = Math.max(0, Math.ceil(remainingSeconds / 60));
  const intervalLabel =
    intervalType === 'work'
      ? 'Work'
      : intervalType === 'short_break'
      ? 'Short break'
      : 'Long break';

  const title = `${intervalLabel} timer running`;
  const body = taskTitle ? `${taskTitle} · ~${minutes} min remaining` : `~${minutes} min remaining`;

  if (activeTimerStatusNotificationId) {
    await Notifications.cancelScheduledNotificationAsync(activeTimerStatusNotificationId).catch(() => {});
    activeTimerStatusNotificationId = undefined;
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: null,
      sticky: true,
      channelId: TIMER_STATUS_CHANNEL_ID,
    },
    trigger: null,
  });

  activeTimerStatusNotificationId = id;
};

export const hideTimerStatusNotification = async (): Promise<void> => {
  if (Platform.OS !== 'android') {
    return;
  }

  if (!activeTimerStatusNotificationId) {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(activeTimerStatusNotificationId).catch(() => {});
  activeTimerStatusNotificationId = undefined;
};
