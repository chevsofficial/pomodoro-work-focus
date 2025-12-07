import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../components/ScreenContainer';
import { AdBanner } from '../components/AdBanner';
import { RootStackParamList } from '../navigation/RootNavigator';
import { navigateToProUpsell } from '../navigation/proNavigation';
import { ActivityType, Task } from '../models';
import useAppStore, {
  selectCanCreateTask,
  selectRemainingFreeTasks,
  useActiveActivityTypes,
  useActivityTypes,
  useIsPro,
  useTasks,
} from '../store/appStore';
import { useThemeColors } from '../theme/useThemeColors';
import { spacing } from '../theme/spacing';
import { t } from '../i18n/translations';

type TasksNavigation = NativeStackNavigationProp<RootStackParamList>;

const ActivityTypeChip: React.FC<{
  type: ActivityType;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
  styles: ReturnType<typeof createStyles>;
}> = ({ type, selected, onPress, colors, styles }) => {
  const fallbackColor = type.color ?? colors.accent;

  return (
    <TouchableOpacity
      style={[
        styles.activityTypeOption,
        selected && {
          backgroundColor: fallbackColor,
          borderColor: fallbackColor,
        },
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.activityTypeColorDot,
          { backgroundColor: fallbackColor },
        ]}
      />
      <Text
        style={[
          styles.activityTypeOptionText,
          selected && styles.activityTypeOptionTextSelected,
        ]}
      >
        {type.name}
      </Text>
    </TouchableOpacity>
  );
};

// Relax typing so we can safely pass `key` in JSX without TS complaining
const AnyActivityTypeChip = ActivityTypeChip as any;

const AddTaskModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: { title: string; description?: string; activityTypeId?: string }) => void;
  activityTypes: ActivityType[];
  colors: ReturnType<typeof useThemeColors>;
  styles: ReturnType<typeof createStyles>;
}> = ({ visible, onClose, onSubmit, activityTypes, colors, styles }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activityTypeId, setActivityTypeId] = useState<string | undefined>();

  useEffect(() => {
    if (!visible) {
      setTitle('');
      setDescription('');
      setActivityTypeId(undefined);
    }
  }, [visible]);

  const handleSave = () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      Alert.alert(t('tasks.add.title'), t('tasks.add.missingTitle'));
      return;
    }

    onSubmit({
      title: trimmedTitle,
      description: trimmedDescription.length > 0 ? trimmedDescription : undefined,
      activityTypeId,
    });

    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('tasks.add.title')}</Text>
          <TextInput
            placeholder={t('tasks.add.titlePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            placeholder={t('tasks.add.descriptionPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, styles.inputMultiline]}
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <Text style={styles.modalLabel}>{t('tasks.add.activityTypeLabel')}</Text>
          <View style={styles.activityTypeList}>
            <TouchableOpacity
              style={[
                styles.activityTypeOption,
                !activityTypeId && styles.activityTypeOptionSelected,
              ]}
              onPress={() => setActivityTypeId(undefined)}
            >
              <Text style={styles.activityTypeOptionText}>{t('tasks.add.none')}</Text>
            </TouchableOpacity>
            {activityTypes.map((type) => (
              <AnyActivityTypeChip
                key={type.id}
                type={type}
                selected={activityTypeId === type.id}
                onPress={() => setActivityTypeId(type.id)}
                colors={colors}
                styles={styles}
              />
            ))}
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={onClose}
            >
              <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={handleSave}
            >
              <Text style={[styles.modalButtonText, styles.modalButtonPrimaryText]}>
                {t('common.save')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const TasksScreen: React.FC = () => {
  const colors = useThemeColors();
  const tasks = useTasks();
  const activityTypes = useActivityTypes();
  const activeActivityTypes = useActiveActivityTypes();
  const addTask = useAppStore((state) => state.addTask);
  const toggleTaskCompleted = useAppStore((state) => state.toggleTaskCompleted);
  const navigation = useNavigation<TasksNavigation>();
  const [isModalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'todo' | 'done'>('todo');
  const canCreateTask = useAppStore(selectCanCreateTask);
  const remainingTasks = useAppStore(selectRemainingFreeTasks);
  const isPro = useIsPro();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const activityTypeMap = useMemo(() => {
    const entries = activityTypes.map((type) => [type.id, type] as const);
    return Object.fromEntries(entries) as Record<string, ActivityType>;
  }, [activityTypes]);

  const todoTasks = useMemo(
    () => tasks.filter((task) => !task.deletedAt && !task.completedAt),
    [tasks],
  );

  const doneTasks = useMemo(
    () => tasks.filter((task) => !task.deletedAt && task.completedAt),
    [tasks],
  );

  const formatCompletionDateLabel = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return t('tasks.unknownDate');

    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const groupedDoneTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};

    doneTasks.forEach((task) => {
      if (!task.completedAt) return;

      const label = formatCompletionDateLabel(task.completedAt);
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(task);
    });

    const entries = Object.entries(groups).sort((a, b) => {
      const aTask = a[1][0];
      const bTask = b[1][0];

      const aTime = aTask.completedAt ? new Date(aTask.completedAt).getTime() : 0;
      const bTime = bTask.completedAt ? new Date(bTask.completedAt).getTime() : 0;

      return bTime - aTime;
    });

    entries.forEach(([, tasksForDay]) => {
      tasksForDay.sort((t1, t2) => {
        const t1Time = t1.completedAt ? new Date(t1.completedAt).getTime() : 0;
        const t2Time = t2.completedAt ? new Date(t2.completedAt).getTime() : 0;
        return t2Time - t1Time;
      });
    });

    return entries;
  }, [doneTasks]);

  const handleToggleCompleted = (taskId: string) => {
    toggleTaskCompleted(taskId);
  };

  const handleAddTask = (payload: { title: string; description?: string; activityTypeId?: string }) => {
    const canAddAnotherTask = selectCanCreateTask(useAppStore.getState());
    if (!canAddAnotherTask && !isPro) {
      navigateToProUpsell(navigation);
      setModalVisible(false);
      return;
    }

    addTask(payload);
  };

  const handleAddTaskPress = () => {
    if (!canCreateTask && !isPro) {
      navigateToProUpsell(navigation);
      return;
    }

    setModalVisible(true);
  };

  const handleOpenTaskDetail = (taskId: string) => {
    navigation.navigate('TaskDetail', { taskId });
  };

  const renderTaskItem = (task: Task) => {
    const activityType = task.activityTypeId ? activityTypeMap[task.activityTypeId] : undefined;

    return (
      <TouchableOpacity
        key={task.id}
        style={styles.taskRow}
        onPress={() => handleOpenTaskDetail(task.id)}
      >
        <TouchableOpacity
          style={[styles.checkbox, task.isCompleted && styles.checkboxCompleted]}
          onPress={(event) => {
            event.stopPropagation();
            handleToggleCompleted(task.id);
          }}
        >
          {task.isCompleted && <Text style={styles.checkboxMark}>✓</Text>}
        </TouchableOpacity>
        <View style={styles.taskContent}>
          <Text
            style={[styles.taskTitle, task.isCompleted && styles.taskTitleCompleted]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
          {activityType && (
            <View
              style={[
                styles.activityBadge,
                { backgroundColor: activityType.color ?? colors.surface },
              ]}
            >
              <Text style={styles.activityBadgeText}>{activityType.name}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer>
      <Text style={styles.headerTitle}>{t('tasks.header')}</Text>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'todo' && styles.tabButtonActive]}
          onPress={() => setActiveTab('todo')}
        >
          <Text
            style={[styles.tabButtonLabel, activeTab === 'todo' && styles.tabButtonLabelActive]}
          >
            {t('tasks.tabs.todo')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'done' && styles.tabButtonActive]}
          onPress={() => setActiveTab('done')}
        >
          <Text
            style={[styles.tabButtonLabel, activeTab === 'done' && styles.tabButtonLabelActive]}
          >
            {t('tasks.tabs.done')}
          </Text>
        </TouchableOpacity>
      </View>

      {!isPro && remainingTasks === 0 && (
        <View style={styles.proUpsellCard}>
          <Text style={styles.proUpsellTitle}>{t('tasks.upsell.title')}</Text>
          <Text style={styles.proUpsellSubtitle}>{t('tasks.upsell.subtitle')}</Text>
          <TouchableOpacity
            style={styles.proUpsellButton}
            onPress={() => navigateToProUpsell(navigation)}
          >
            <Text style={styles.proUpsellButtonText}>{t('common.viewProPlans')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'todo' ? (
        todoTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>{t('tasks.empty.todoTitle')}</Text>
            <Text style={styles.emptyStateSubtitle}>{t('tasks.empty.todoSubtitle')}</Text>
          </View>
        ) : (
          <ScrollView style={styles.todoList} contentContainerStyle={styles.listContent}>
            {todoTasks.map((task, index) => (
              <React.Fragment key={task.id}>
                {renderTaskItem(task)}
                {index < todoTasks.length - 1 && <View style={styles.separator} />}
              </React.Fragment>
            ))}
          </ScrollView>
        )
      ) : doneTasks.length === 0 ? (
        <Text style={styles.emptyText}>{t('tasks.empty.done')}</Text>
      ) : (
        <ScrollView style={styles.doneList} contentContainerStyle={styles.listContent}>
          {groupedDoneTasks.map(([dateLabel, tasksForDay]) => (
            <View key={dateLabel} style={styles.doneGroup}>
              <Text style={styles.doneGroupHeader}>{dateLabel}</Text>
              {tasksForDay.map((task, index) => (
                <React.Fragment key={task.id}>
                  {renderTaskItem(task)}
                  {index < tasksForDay.length - 1 && <View style={styles.separator} />}
                </React.Fragment>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <AdBanner />

      {!isPro && (
        <Text style={styles.planNote}>
          {t('tasks.planNote').replace('{count}', String(remainingTasks))}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.fab, !canCreateTask && !isPro && styles.fabLimitReached]}
        onPress={handleAddTaskPress}
      >
        <Text style={styles.fabIcon}>＋</Text>
      </TouchableOpacity>

      <AddTaskModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleAddTask}
        activityTypes={activeActivityTypes}
        colors={colors}
        styles={styles}
      />
    </ScreenContainer>
  );
};

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.lg,
    },
    todoList: {
      marginTop: spacing.sm,
    },
    listContent: {
      paddingBottom: spacing.xl * 2,
    },
    tabRow: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.xs,
      marginBottom: spacing.lg,
    },
    tabButton: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    tabButtonActive: {
      backgroundColor: colors.primary,
    },
    tabButtonLabel: {
      fontWeight: '600',
      color: colors.textSecondary,
    },
    tabButtonLabelActive: {
      color: colors.background,
    },
    proUpsellCard: {
      borderRadius: 16,
      backgroundColor: colors.surface,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    proUpsellTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    proUpsellSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    proUpsellButton: {
      alignSelf: 'flex-start',
      borderRadius: 16,
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    proUpsellButtonText: {
      color: colors.background,
      fontWeight: '600',
      fontSize: 13,
    },
    taskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: 12,
      backgroundColor: colors.surface,
    },
    taskContent: {
      flex: 1,
      marginLeft: spacing.md,
    },
    taskTitle: {
      fontSize: 16,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    taskTitleCompleted: {
      textDecorationLine: 'line-through',
      color: colors.textSecondary,
    },
    checkbox: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    checkboxCompleted: {
      backgroundColor: colors.primary,
    },
    checkboxMark: {
      color: colors.background,
      fontSize: 18,
      fontWeight: 'bold',
    },
    activityBadge: {
      marginTop: spacing.sm,
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 12,
      backgroundColor: colors.accent,
    },
    activityBadgeText: {
      color: colors.background,
      fontWeight: '600',
      fontSize: 12,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    separator: {
      height: spacing.sm,
    },
    emptyState: {
      marginTop: spacing.xl,
      alignItems: 'center',
    },
    emptyStateTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    emptyStateSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    emptyText: {
      color: colors.textSecondary,
      fontStyle: 'italic',
      marginTop: spacing.md,
    },
    doneList: {
      marginTop: spacing.sm,
    },
    doneGroup: {
      marginBottom: spacing.lg,
    },
    doneGroupHeader: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    planNote: {
      marginTop: spacing.sm,
      color: colors.textSecondary,
      fontSize: 12,
      textAlign: 'left',
      alignSelf: 'flex-start',
    },
    fab: {
      position: 'absolute',
      right: spacing.lg,
      bottom: spacing.lg,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
      shadowColor: `${colors.textPrimary}1a`,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    fabLimitReached: {
      opacity: 0.7,
    },
    fabIcon: {
      color: colors.background,
      fontSize: 30,
      lineHeight: 32,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: `${colors.background}b3`,
      justifyContent: 'center',
      padding: spacing.lg,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.lg,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    modalLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    input: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.textSecondary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: colors.textPrimary,
      backgroundColor: colors.background,
    },
    inputMultiline: {
      minHeight: 96,
      textAlignVertical: 'top',
      marginTop: spacing.sm,
    },
    activityTypeList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -spacing.xs,
    },
    activityTypeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 16,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderWidth: 1,
      borderColor: colors.textSecondary,
      marginHorizontal: spacing.xs,
      marginVertical: spacing.xs,
    },
    activityTypeOptionSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    activityTypeColorDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: spacing.xs,
    },
    activityTypeOptionText: {
      color: colors.textPrimary,
      fontWeight: '600',
      fontSize: 12,
    },
    activityTypeOptionTextSelected: {
      color: colors.background,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: spacing.lg,
    },
    modalButton: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 12,
      marginLeft: spacing.sm,
    },
    modalButtonSecondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.textSecondary,
    },
    modalButtonPrimary: {
      backgroundColor: colors.primary,
    },
    modalButtonText: {
      fontWeight: '600',
      color: colors.textPrimary,
    },
    modalButtonPrimaryText: {
      color: colors.background,
    },
  });
}
