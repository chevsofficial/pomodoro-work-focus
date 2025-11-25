import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { IntervalType } from '../models';

export const COMPLETION_CHANNEL_ID = 'interval-completion';
export const STATUS_CHANNEL_ID = 'timer-status';

export const initNotificationService = async () => {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const type = notification.request.content.data?.type;

      const isCompletion = type === 'completion';

      return {
        shouldShowAlert: true,
        shouldPlaySound: isCompletion,
        shouldSetBadge: false,
      };
    },
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(COMPLETION_CHANNEL_ID, {
      name: 'Pomodoro Completed',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'chime1',
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync(STATUS_CHANNEL_ID, {
      name: 'Timer Status',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      vibrationPattern: [0],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
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
};

export const scheduleIntervalCompletionNotification = async ({
  secondsFromNow,
  intervalType,
  nextIntervalType,
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
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
      data: { type: 'completion' },
    };

    const channelId = Platform.OS === 'android' ? COMPLETION_CHANNEL_ID : undefined;

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

const TIMER_STATUS_NOTIFICATION_ID = 'TIMER_STATUS';

type TimerStatusNotificationParams = {
  taskTitle?: string;
  remainingMinutes: number;
  intervalTypeLabel: string;
};

export const showTimerStatusNotification = async ({
  taskTitle,
  remainingMinutes,
  intervalTypeLabel,
}: TimerStatusNotificationParams): Promise<void> => {
  await Notifications.dismissNotificationAsync(TIMER_STATUS_NOTIFICATION_ID).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: TIMER_STATUS_NOTIFICATION_ID,
    content: {
      identifier: TIMER_STATUS_NOTIFICATION_ID,
      title: taskTitle ? `${taskTitle}` : 'Pomodoro running',
      body: `${remainingMinutes} min left · ${intervalTypeLabel}`,
      autoDismiss: false,
      data: { type: 'status' },
      channelId: Platform.OS === 'android' ? STATUS_CHANNEL_ID : undefined,
    },
    trigger: null,
  });
};

export const clearTimerStatusNotification = async (): Promise<void> => {
  await Notifications.dismissNotificationAsync(TIMER_STATUS_NOTIFICATION_ID).catch(() => {});
};
