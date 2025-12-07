import useAppStore from '../store/appStore';
import { Language } from '../models';

export const translations = {
  en: {
    common: {
      start: 'Start',
      stop: 'Stop',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      manage: 'Manage',
      signIn: 'Sign in',
      signOut: 'Sign out',
      upgradeToPro: 'Upgrade to Pro',
      viewProPlans: 'View Pro plans',
      upgradeForExport: 'Upgrade to Pro for export',
      yesDeleteEverything: 'Yes, delete everything',
      english: 'English',
      spanish: 'Español',
    },
    settings: {
      title: 'Settings',
      subtitle: 'Customize your Pomodoro workflow.',
      durations: {
        title: 'Durations',
        work: 'Work Duration (minutes)',
        shortBreak: 'Short Break Duration (minutes)',
        longBreak: 'Long Break Duration (minutes)',
        intervalsBeforeLong: 'Intervals Before Long Break',
      },
      automation: {
        title: 'Automation & Notifications',
        autoStart: 'Auto-start next interval',
        notificationSound: 'Notification sound',
        testSound: 'Test sound',
        soundEnabled: 'Sound enabled',
        vibrationEnabled: 'Vibration enabled',
        notificationsEnabled: 'Notifications enabled',
        notificationsDisabledTitle: 'Notifications disabled',
        notificationsDisabledBody:
          'We could not enable notifications. Please check your system settings.',
      },
      sounds: {
        chime1: 'Chime 1',
        chime2: 'Chime 2',
        chime3: 'Chime 3',
      },
      activityTypes: {
        title: 'Activity Types',
        manage: 'Manage',
        activeLabel: 'active',
        archivedLabel: 'archived',
        freeLimitTitle: 'Free accounts can create up to {limit} activity types.',
        proUpgradeCta: 'Upgrade to Pro to unlock more',
      },
      theme: {
        title: 'App Theme',
        rowTitle: 'Theme',
        chooseTitle: 'Choose a theme',
        proLabel: 'Pro',
      },
      cloud: {
        title: 'Cloud sync & backup',
        signInPrompt: 'Sign in to enable Cloud Sync.',
        cloudSyncEnabled: 'Cloud sync enabled',
        exportDescription: 'Export your tasks, activity types, and focus sessions as a CSV file.',
        exportButton: 'Export all data (.CSV)',
        proUpsell:
          'Unlock TomoFlow Pro to enable cloud sync across devices and export your data as a CSV backup.',
        lastSyncedPrefix: 'Last synced',
        notSynced: 'Not synced yet.',
      },
      danger: {
        title: 'Danger zone',
        description:
          'Permanently delete all of your Pomodoro data from this device and the cloud. This cannot be undone. Export your data first if needed.',
        deleteButton: 'Delete all data',
        modalTitle: 'Delete all data?',
        modalBody:
          'This will permanently delete all tasks, activity types, and session history from this device and your synced account.\n\nWe strongly recommend exporting your data as a CSV file before continuing.',
        exportButton: 'Export data (.CSV)',
      },
      activityModal: {
        editTitle: 'Edit Activity Type',
        addTitle: 'Add Activity Type',
        namePlaceholder: 'Name',
        nameAlertTitle: 'Activity Type',
        nameAlertBody: 'Please enter a name.',
        colorLabel: 'Color',
        colorHint: 'Choose the desired color for your activity type.',
        hexLabel: 'Hex color code (Pro)',
        workLabel: 'Work (min)',
        shortBreakLabel: 'Short Break',
        longBreakLabel: 'Long Break',
        intervalsLabel: 'Intervals Before Long',
        deleteTitle: 'Delete Activity Type',
        deleteBody: 'Are you sure you want to delete this activity type?',
      },
      alerts: {
        notificationsDisabledTitle: 'Notifications disabled',
        notificationsDisabledBody:
          'We could not enable notifications. Please check your system settings.',
        deleteAllTitle: 'All data deleted',
        deleteAllBody:
          'Your TomoFlow data has been successfully deleted from this device and your synced account.',
        deleteFailedTitle: 'Delete failed',
        deleteFailedBody: 'Something went wrong while deleting your data. Please try again.',
        signOutFailedTitle: 'Sign out failed',
        signOutFailedBody: 'Please try again.',
      },
    },
    info: {
      languageLabel: 'Language',
      languageModalTitle: 'Language',
      languageModalDescription: 'Choose your preferred language for TomoFlow.',
      optionEnglish: 'English',
      optionSpanish: 'Español',
    },
    paywall: {
      heroTitle: 'Unlock TomoFlow Pro',
      heroSubtitle: 'Your most productive self starts here.',
      heroBody: 'Focus deeper, stay organized, and get powerful insights — distraction-free.',
      featuresTitle: 'Everything you get',
      benefits: {
        removeAds: 'Remove all ads — focus without distractions',
        premiumThemes: 'Premium themes — customize your workspace',
        advancedAnalytics: 'Advanced analytics — track real productivity patterns',
        unlimitedActivityTypes: 'Unlimited activity types — stay organized without limits',
        customDurations: 'Custom timer durations — fine-tuned to your workflow',
        customDateRange: 'Custom date range analytics — deep dive your history',
        cloudSync: 'Cloud sync (future-ready)',
        exportCsv: 'Export CSV backups',
      },
      planBadge: 'Most Popular',
      startTrial: 'Start 7-Day Free Trial',
      chooseMonthly: 'Choose Monthly',
      loadingPlans: 'Loading plans…',
      unlockedVia: 'Unlocked via {source}.',
      restore: 'Restore Purchases',
      legal:
        'Payment will be charged to your Apple/Google account. Subscription auto-renews unless cancelled at least 24 hours before the end of the current period.',
      plans: {
        monthlyTitle: 'Monthly Plan',
        monthlyDescription: 'Flexible • Cancel anytime',
        annualTitle: 'Most Popular — Annual Plan',
        annualDescription: '7-day free trial • Cancel anytime',
        annualSavings: 'Save 58% compared to monthly',
      },
    },
  },
  es: {
    common: {
      start: 'Iniciar',
      stop: 'Detener',
      cancel: 'Cancelar',
      save: 'Guardar',
      delete: 'Eliminar',
      manage: 'Gestionar',
      signIn: 'Iniciar sesión',
      signOut: 'Cerrar sesión',
      upgradeToPro: 'Mejorar a Pro',
      viewProPlans: 'Ver planes Pro',
      upgradeForExport: 'Mejora a Pro para exportar',
      yesDeleteEverything: 'Sí, borrar todo',
      english: 'English',
      spanish: 'Español',
    },
    settings: {
      title: 'Ajustes',
      subtitle: 'Personaliza tu flujo de trabajo Pomodoro.',
      durations: {
        title: 'Duraciones',
        work: 'Duración de trabajo (minutos)',
        shortBreak: 'Duración de descanso corto (minutos)',
        longBreak: 'Duración de descanso largo (minutos)',
        intervalsBeforeLong: 'Intervalos antes del descanso largo',
      },
      automation: {
        title: 'Automatización y notificaciones',
        autoStart: 'Iniciar siguiente intervalo automáticamente',
        notificationSound: 'Sonido de notificación',
        testSound: 'Probar sonido',
        soundEnabled: 'Sonido activado',
        vibrationEnabled: 'Vibración activada',
        notificationsEnabled: 'Notificaciones activadas',
        notificationsDisabledTitle: 'Notificaciones desactivadas',
        notificationsDisabledBody:
          'No pudimos activar las notificaciones. Revisa la configuración del sistema.',
      },
      sounds: {
        chime1: 'Tono 1',
        chime2: 'Tono 2',
        chime3: 'Tono 3',
      },
      activityTypes: {
        title: 'Tipos de actividad',
        manage: 'Gestionar',
        activeLabel: 'activas',
        archivedLabel: 'archivadas',
        freeLimitTitle: 'Las cuentas gratuitas pueden crear hasta {limit} tipos de actividad.',
        proUpgradeCta: 'Mejora a Pro para desbloquear más',
      },
      theme: {
        title: 'Tema de la app',
        rowTitle: 'Tema',
        chooseTitle: 'Elige un tema',
        proLabel: 'Pro',
      },
      cloud: {
        title: 'Sincronización y copia de seguridad',
        signInPrompt: 'Inicia sesión para habilitar la sincronización en la nube.',
        cloudSyncEnabled: 'Sincronización en la nube activada',
        exportDescription:
          'Exporta tus tareas, tipos de actividad y sesiones de enfoque como un archivo CSV.',
        exportButton: 'Exportar todos los datos (.CSV)',
        proUpsell:
          'Desbloquea TomoFlow Pro para activar la sincronización en la nube entre dispositivos y exportar tus datos como copia de seguridad CSV.',
        lastSyncedPrefix: 'Última sincronización',
        notSynced: 'Aún no sincronizado.',
      },
      danger: {
        title: 'Zona de peligro',
        description:
          'Elimina permanentemente todos tus datos de Pomodoro de este dispositivo y de la nube. Esto no se puede deshacer. Exporta tus datos primero si es necesario.',
        deleteButton: 'Borrar todos los datos',
        modalTitle: '¿Borrar todos los datos?',
        modalBody:
          'Esto eliminará permanentemente todas las tareas, tipos de actividad e historial de sesiones de este dispositivo y de tu cuenta sincronizada.\n\nRecomendamos exportar tus datos como archivo CSV antes de continuar.',
        exportButton: 'Exportar datos (.CSV)',
      },
      activityModal: {
        editTitle: 'Editar tipo de actividad',
        addTitle: 'Agregar tipo de actividad',
        namePlaceholder: 'Nombre',
        nameAlertTitle: 'Tipo de actividad',
        nameAlertBody: 'Por favor ingresa un nombre.',
        colorLabel: 'Color',
        colorHint: 'Elige el color deseado para tu tipo de actividad.',
        hexLabel: 'Código de color hex (Pro)',
        workLabel: 'Trabajo (min)',
        shortBreakLabel: 'Descanso corto',
        longBreakLabel: 'Descanso largo',
        intervalsLabel: 'Intervalos antes del largo',
        deleteTitle: 'Eliminar tipo de actividad',
        deleteBody: '¿Seguro que deseas eliminar este tipo de actividad?',
      },
      alerts: {
        notificationsDisabledTitle: 'Notificaciones desactivadas',
        notificationsDisabledBody:
          'No pudimos activar las notificaciones. Revisa la configuración del sistema.',
        deleteAllTitle: 'Todos los datos eliminados',
        deleteAllBody:
          'Tus datos de TomoFlow se eliminaron correctamente de este dispositivo y de tu cuenta sincronizada.',
        deleteFailedTitle: 'Error al borrar',
        deleteFailedBody: 'Ocurrió un problema al borrar tus datos. Inténtalo de nuevo.',
        signOutFailedTitle: 'No se pudo cerrar sesión',
        signOutFailedBody: 'Inténtalo de nuevo.',
      },
    },
    info: {
      languageLabel: 'Idioma',
      languageModalTitle: 'Idioma',
      languageModalDescription: 'Elige tu idioma preferido para TomoFlow.',
      optionEnglish: 'English',
      optionSpanish: 'Español',
    },
    paywall: {
      heroTitle: 'Desbloquea TomoFlow Pro',
      heroSubtitle: 'Tu versión más productiva empieza aquí.',
      heroBody: 'Concéntrate más, mantén el orden y obtén potentes estadísticas sin distracciones.',
      featuresTitle: 'Todo lo que obtienes',
      benefits: {
        removeAds: 'Sin anuncios: concentra sin distracciones',
        premiumThemes: 'Temas premium: personaliza tu espacio de trabajo',
        advancedAnalytics: 'Analíticas avanzadas: sigue patrones reales de productividad',
        unlimitedActivityTypes: 'Tipos de actividad ilimitados: mantén el orden sin límites',
        customDurations: 'Duraciones personalizadas: ajusta el temporizador a tu flujo',
        customDateRange: 'Analíticas con rango personalizado: explora tu historial',
        cloudSync: 'Sincronización en la nube (lista para el futuro)',
        exportCsv: 'Exportar copias de seguridad CSV',
      },
      planBadge: 'Más popular',
      startTrial: 'Comenzar prueba gratuita de 7 días',
      chooseMonthly: 'Elegir mensual',
      loadingPlans: 'Cargando planes…',
      unlockedVia: 'Desbloqueado vía {source}.',
      restore: 'Restaurar compras',
      legal:
        'El pago se cargará a tu cuenta de Apple/Google. La suscripción se renueva automáticamente a menos que se cancele al menos 24 horas antes del fin del período actual.',
      plans: {
        monthlyTitle: 'Plan mensual',
        monthlyDescription: 'Flexible • Cancela en cualquier momento',
        annualTitle: 'Plan anual — el más popular',
        annualDescription: 'Prueba gratis de 7 días • Cancela en cualquier momento',
        annualSavings: 'Ahorra 58% comparado con el mensual',
      },
    },
  },
} as const;

type TranslationTree = typeof translations.en;

type NestedKeyOf<T> = {
  [K in keyof T]: T[K] extends Record<string, any>
    ? `${Extract<K, string>}` | `${Extract<K, string>}.${NestedKeyOf<T[K]>}`
    : `${Extract<K, string>}`;
}[keyof T];

export type TranslationKey = NestedKeyOf<TranslationTree>;

const lookupTranslation = (
  language: Language,
  key: TranslationKey,
): string | undefined => {
  return key.split('.').reduce<unknown>((current, part) => {
    if (current && typeof current === 'object' && part in current) {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, translations[language]) as string | undefined;
};

export const t = (key: TranslationKey): string => {
  const language = useAppStore.getState().language;
  const translated = lookupTranslation(language, key) ?? lookupTranslation('en', key);
  return typeof translated === 'string' ? translated : key;
};
