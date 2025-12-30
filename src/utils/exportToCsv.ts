import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { t } from '../i18n/translations';
import { logger } from './logger';
import useAppStore, {
  ExportableActivityType,
  ExportableSession,
  ExportableTask,
  ExportableUserSettings,
} from '../store/appStore';

const CSV_HEADERS = [
  'record_type',
  'id',
  'task_title',
  'task_status',
  'activity_type_name',
  'activity_type_is_archived',
  'planned_minutes',
  'actual_focus_minutes',
  'started_at',
  'ended_at',
  'created_at',
  'updated_at',
  'extra_json',
];

const escapeCsv = (value: string): string => {
  if (value == null) return '';
  const needsQuotes = /[",\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
};

const mapTaskToCsvRow = (task: ExportableTask): string[] => {
  const extra = JSON.stringify({
    description: task.description ?? null,
    activityTypeId: task.activityTypeId,
  });

  return [
    'task',
    task.id,
    task.title,
    task.status,
    '',
    '',
    '',
    '',
    '',
    '',
    task.createdAt,
    task.updatedAt ?? '',
    extra,
  ];
};

const mapActivityTypeToCsvRow = (type: ExportableActivityType): string[] => {
  const extra = JSON.stringify({
    color: type.color ?? null,
    workDurationMinutes: type.workDurationMinutes,
    shortBreakMinutes: type.shortBreakMinutes,
    longBreakMinutes: type.longBreakMinutes,
    intervalsBeforeLongBreak: type.intervalsBeforeLongBreak,
  });

  return [
    'activity_type',
    type.id,
    '',
    '',
    type.name,
    String(type.isArchived),
    '',
    '',
    '',
    '',
    type.createdAt,
    type.updatedAt ?? '',
    extra,
  ];
};

const mapSessionToCsvRow = (session: ExportableSession): string[] => {
  const extra = JSON.stringify({
    taskId: session.taskId,
    activityTypeId: session.activityTypeId,
  });

  return [
    'session',
    session.id,
    '',
    session.status,
    '',
    '',
    String(session.plannedMinutes),
    String(session.actualFocusMinutes),
    session.startedAt,
    session.endedAt ?? '',
    '',
    '',
    extra,
  ];
};

const mapUserSettingsToCsvRow = (settings: ExportableUserSettings): string[] => {
  const extra = JSON.stringify(settings.settings);

  return [
    'user_settings',
    settings.id,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    extra,
  ];
};

export const exportAllUserDataToCsv = async () => {
  try {
    const { getExportableData } = useAppStore.getState();
    const data = getExportableData();

    const rows: string[][] = [];
    rows.push(CSV_HEADERS);

    data.tasks.forEach((task) => rows.push(mapTaskToCsvRow(task)));
    data.activityTypes.forEach((type) => rows.push(mapActivityTypeToCsvRow(type)));
    data.sessions.forEach((session) => rows.push(mapSessionToCsvRow(session)));
    if (data.userSettings) {
      rows.push(mapUserSettingsToCsvRow(data.userSettings));
    }

    const csvString = rows
      .map((row) => row.map((cell) => escapeCsv(String(cell ?? ''))).join(','))
      .join('\n');

    const timestamp = new Date().toISOString().replace(/[:]/g, '-');
    const fileUri = `${FileSystem.cacheDirectory}pomodoro-export-${timestamp}.csv`;

    await FileSystem.writeAsStringAsync(fileUri, csvString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: t('export.shareDialogTitle'),
      });
    } else {
      Alert.alert(
        t('export.savedTitle'),
        t('export.savedBody').replace('{fileUri}', fileUri),
      );
    }
  } catch (error) {
    logger.error('Export failed', error);
    Alert.alert(t('export.failedTitle'), t('export.failedBody'));
  }
};

export default exportAllUserDataToCsv;
