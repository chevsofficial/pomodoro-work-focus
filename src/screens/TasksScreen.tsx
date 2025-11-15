import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../navigation/RootNavigator';
import { ActivityType, Task } from '../models';
import useAppStore, { useActivityTypes, useTasks } from '../store/appStore';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type TasksNavigation = NativeStackNavigationProp<RootStackParamList>;

type TaskSection = {
  title: string;
  data: Task[];
};

const ActivityTypeChip: React.FC<{
  type: ActivityType;
  selected: boolean;
  onPress: () => void;
}> = ({ type, selected, onPress }) => {
  return (
    <TouchableOpacity
      style={[
        styles.activityTypeOption,
        selected && styles.activityTypeOptionSelected,
      ]}
      onPress={onPress}
    >
      <Text style={styles.activityTypeOptionText}>{type.name}</Text>
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
}> = ({ visible, onClose, onSubmit, activityTypes }) => {
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
      Alert.alert('Add Task', 'Please enter a task title.');
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
          <Text style={styles.modalTitle}>Add Task</Text>
          <TextInput
            placeholder="Title"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            placeholder="Description (optional)"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, styles.inputMultiline]}
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <Text style={styles.modalLabel}>Activity Type</Text>
          <View style={styles.activityTypeList}>
            <TouchableOpacity
              style={[
                styles.activityTypeOption,
                !activityTypeId && styles.activityTypeOptionSelected,
              ]}
              onPress={() => setActivityTypeId(undefined)}
            >
              <Text style={styles.activityTypeOptionText}>None</Text>
            </TouchableOpacity>
            {activityTypes.map((type) => (
              <AnyActivityTypeChip
                key={type.id}
                type={type}
                selected={activityTypeId === type.id}
                onPress={() => setActivityTypeId(type.id)}
              />
            ))}
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={onClose}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={handleSave}
            >
              <Text style={[styles.modalButtonText, styles.modalButtonPrimaryText]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const TasksScreen: React.FC = () => {
  const tasks = useTasks();
  const activityTypes = useActivityTypes();
  const addTask = useAppStore((state) => state.addTask);
  const toggleTaskCompleted = useAppStore((state) => state.toggleTaskCompleted);
  const navigation = useNavigation<TasksNavigation>();
  const [isModalVisible, setModalVisible] = useState(false);

  const activityTypeMap = useMemo(() => {
    const entries = activityTypes.map((type) => [type.id, type] as const);
    return Object.fromEntries(entries) as Record<string, ActivityType>;
  }, [activityTypes]);

  const sections = useMemo<TaskSection[]>(() => {
    const visibleTasks = tasks.filter((task) => !task.deletedAt);
    const todo = visibleTasks.filter((task) => !task.isCompleted);
    const done = visibleTasks.filter((task) => task.isCompleted);

    return [
      { title: 'To-Do', data: todo },
      { title: 'Done', data: done },
    ];
  }, [tasks]);

  const handleToggleCompleted = (taskId: string) => {
    toggleTaskCompleted(taskId);
  };

  const handleAddTask = (payload: { title: string; description?: string; activityTypeId?: string }) => {
    addTask(payload);
  };

  const handleOpenTaskDetail = (taskId: string) => {
    navigation.navigate('TaskDetail', { taskId });
  };

  const renderTaskItem = ({ item }: { item: Task }) => {
    const activityType = item.activityTypeId ? activityTypeMap[item.activityTypeId] : undefined;

    return (
      <TouchableOpacity style={styles.taskRow} onPress={() => handleOpenTaskDetail(item.id)}>
        <TouchableOpacity
          style={[styles.checkbox, item.isCompleted && styles.checkboxCompleted]}
          onPress={(event) => {
            event.stopPropagation();
            handleToggleCompleted(item.id);
          }}
        >
          {item.isCompleted && <Text style={styles.checkboxMark}>✓</Text>}
        </TouchableOpacity>
        <View style={styles.taskContent}>
          <Text
            style={[styles.taskTitle, item.isCompleted && styles.taskTitleCompleted]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {activityType && (
            <View style={styles.activityBadge}>
              <Text style={styles.activityBadgeText}>{activityType.name}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer>
      <Text style={styles.headerTitle}>Tasks</Text>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderSectionHeader={({ section }) =>
          section.data.length > 0 ? (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          ) : null
        }
        renderItem={({ item }) => renderTaskItem({ item })}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No tasks yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Create your first focus task to get started.
            </Text>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabIcon}>＋</Text>
      </TouchableOpacity>

      <AddTaskModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleAddTask}
        activityTypes={activityTypes}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  listContent: {
    paddingBottom: spacing.xl * 2,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabIcon: {
    color: colors.background,
    fontSize: 30,
    lineHeight: 32,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
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
  activityTypeOptionText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 12,
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
