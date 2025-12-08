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
          'Permanently delete all Pomodoro data from this device and the cloud. This cannot be undone. Export a backup first if needed.',
        deleteButton: 'Delete all data',
        modalTitle: 'Delete all data?',
        modalBody:
          'This will permanently delete all tasks, activity types, and session history from this device and your synced account.\n\nWe strongly recommend exporting a CSV backup of your data before continuing.',
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
      title: 'Info & Support',
      subtitle: 'Discover help resources, learn more about TomoFlow, and connect with our team.',
      redeemPlaceholder: 'e.g. FOCUSPRO2023',
      redeemModalTitle: 'Redeem Code',
      redeemModalDescription: 'Enter your promo or beta code below.',
      redeemCta: 'Redeem',
      upgradeDescription:
        'Unlock unlimited activity types, richer insights, and more customization to keep your focus streak going.',
      alerts: {
        openLinkTitle: 'Open Link',
        openLinkBody: 'Something went wrong while opening this link.',
        redeemTitle: 'Redeem Code',
        redeemMissingCode: 'Please enter a code to continue.',
        redeemSuccessTitle: 'Success',
        redeemSuccessBody: 'Code applied! TomoFlow Pro is now unlocked.',
        redeemInvalidTitle: 'Invalid Code',
        redeemInvalidBody: 'That code was not recognized. Double-check and try again.',
        clearedTitle: 'Cleared',
        clearedBody: 'Local state cleared. Restart the app.',
        clearFailedTitle: 'Clear Data',
        clearFailedBody: 'Something went wrong while clearing local data.',
      },
      sections: {
        support: {
          title: 'Support',
          contact: {
            title: 'Contact Support',
            description: 'Email our team for help',
          },
          rate: {
            title: 'Rate the App',
            description: 'Share feedback on the app store',
          },
        },
        about: {
          title: 'About',
          helpCenter: {
            title: 'Help Center',
            description: 'Guides, FAQs, and feature highlights',
          },
          news: {
            title: 'News & Offers',
            description: 'Latest product updates and discounts',
          },
        },
        legal: {
          title: 'Legal',
          terms: {
            title: 'Terms of Use',
            description: 'Understand the agreement for using the app',
          },
          privacy: {
            title: 'Privacy Policy',
            description: 'See how we protect your data',
          },
        },
        pro: {
          title: 'Pro & Codes',
          redeem: {
            title: 'Redeem Code',
            description: 'Unlock special promos or betas',
          },
          upgrade: {
            title: 'Upgrade to Pro',
            description: 'See all premium focus perks',
          },
        },
        social: {
          title: 'Social',
          x: {
            title: 'X',
            description: '@tomoflowapp',
          },
          instagram: {
            title: 'Instagram',
            description: '@tomoflowapp',
          },
          facebook: {
            title: 'Facebook',
            description: '@tomoflowapp',
          },
        },
      },
      debug: {
        title: 'DEBUG PRO STATE',
        isPro: 'isProEffective: {value}',
        proStatus: 'proStatus.isPro: {value}',
        clearLocalData: 'Clear Local App Data',
      },
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
    auth: {
      titleSignIn: 'Sign in',
      titleSignUp: 'Create an account',
      subtitle: 'Use your email and password to access Cloud Sync.',
      createAccount: 'Create account',
      toggleToSignUp: "Don't have an account? Sign up",
      toggleToSignIn: 'Already have an account? Sign in',
      emailPlaceholder: 'Email',
      passwordPlaceholder: 'Password',
      loading: 'Please wait...',
      verifyEmailTitle: 'Check your email',
      verifyEmailBody: 'Please verify your email to finish signing up.',
      errors: {
        missingCredentials: 'Email and password are required.',
        generic: 'Something went wrong. Please try again.',
      },
    },
    tasks: {
      header: 'Tasks',
      tabs: {
        todo: 'To-Do',
        done: 'Done',
      },
      add: {
        title: 'Add Task',
        missingTitle: 'Please enter a task title.',
        titlePlaceholder: 'Title',
        descriptionPlaceholder: 'Description (optional)',
        activityTypeLabel: 'Activity Type',
        none: 'None',
      },
      upsell: {
        title: 'Task limit reached',
        subtitle: 'Upgrade to TomoFlow Pro to unlock unlimited tasks and more productivity features.',
      },
      empty: {
        todoTitle: 'No tasks in your To-Do list yet.',
        todoSubtitle: 'Create your first focus task to get started.',
        done: 'No completed tasks yet.',
      },
      planNote: '{count} tasks left on the free plan.',
      unknownDate: 'Unknown date',
    },
    taskDetail: {
      header: 'Task Details',
      focus: {
        cta: 'Start Focus',
        subtitle: 'Open the Pomodoro timer with this task.',
      },
      fields: {
        title: 'Title',
        description: 'Description',
        activityType: 'Activity Type',
        none: 'None',
        created: 'Created',
        completed: 'Completed',
      },
      placeholders: {
        title: 'Task title',
        description: 'Add more details',
      },
      activityTypeSummary:
        'Default work interval: {work}m · Short break: {short}m · Long break: {long}m',
      intervals: {
        title: 'Intervals History',
        empty: 'No intervals logged yet.',
        footnote: '*Intervals under 5 minutes are shown here but not counted in Analytics.',
        types: {
          work: 'Work',
          short_break: 'Short Break',
          long_break: 'Long Break',
        },
        status: {
          inProgress: 'In Progress',
          cancelledShort: 'Cancelled early (not counted)',
          skipped: 'Skipped',
          completedShort: 'Completed (short, not counted)',
          completed: 'Completed',
        },
        fields: {
          start: 'Start',
          end: 'End',
          planned: 'Planned',
          focus: 'Focus time',
          elapsed: 'Elapsed',
        },
      },
      duration: {
        minutesSeconds: '{minutes}m {seconds}s',
        minutesOnly: '{minutes}m',
        secondsOnly: '{seconds}s',
        zero: '0s',
      },
      update: {
        title: 'Update Task',
        requiredTitle: 'Title is required.',
        successTitle: 'Task Updated',
        successBody: 'Your changes have been saved.',
      },
      missing: {
        title: 'Task not found',
        subtitle: 'This task may have been removed. Go back to the list and try again.',
        back: 'Back to Tasks',
      },
      actions: {
        delete: 'Delete Task',
        save: 'Save Changes',
        confirmDelete: 'Are you sure you want to delete this task?',
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
          'Elimina permanentemente todos tus datos de Pomodoro de este dispositivo y de la nube. Esto no se puede deshacer. Exporta una copia de seguridad primero si es necesario.',
        deleteButton: 'Borrar todos los datos',
        modalTitle: '¿Borrar todos los datos?',
        modalBody:
          'Esto eliminará permanentemente todas las tareas, tipos de actividad e historial de sesiones de este dispositivo y de tu cuenta sincronizada.\n\nRecomendamos exportar una copia de seguridad en CSV antes de continuar.',
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
      title: 'Información y soporte',
      subtitle: 'Descubre recursos de ayuda, conoce más de TomoFlow y conéctate con nuestro equipo.',
      redeemPlaceholder: 'ej. FOCUSPRO2023',
      redeemModalTitle: 'Canjear código',
      redeemModalDescription: 'Ingresa tu código promocional o de beta a continuación.',
      redeemCta: 'Canjear',
      upgradeDescription:
        'Desbloquea tipos de actividad ilimitados, mejores estadísticas y más personalización para mantener tu racha de enfoque.',
      alerts: {
        openLinkTitle: 'Abrir enlace',
        openLinkBody: 'Ocurrió un problema al abrir este enlace.',
        redeemTitle: 'Canjear código',
        redeemMissingCode: 'Ingresa un código para continuar.',
        redeemSuccessTitle: 'Éxito',
        redeemSuccessBody: '¡Código aplicado! TomoFlow Pro está desbloqueado.',
        redeemInvalidTitle: 'Código no válido',
        redeemInvalidBody: 'Ese código no fue reconocido. Vuelve a revisarlo e inténtalo otra vez.',
        clearedTitle: 'Borrado',
        clearedBody: 'Datos locales borrados. Reinicia la app.',
        clearFailedTitle: 'Borrar datos',
        clearFailedBody: 'Ocurrió un problema al borrar los datos locales.',
      },
      sections: {
        support: {
          title: 'Soporte',
          contact: {
            title: 'Contactar soporte',
            description: 'Envíanos un correo para obtener ayuda',
          },
          rate: {
            title: 'Calificar la app',
            description: 'Comparte tu opinión en la tienda',
          },
        },
        about: {
          title: 'Acerca de',
          helpCenter: {
            title: 'Centro de ayuda',
            description: 'Guías, preguntas frecuentes y funciones destacadas',
          },
          news: {
            title: 'Noticias y ofertas',
            description: 'Actualizaciones del producto y descuentos',
          },
        },
        legal: {
          title: 'Legal',
          terms: {
            title: 'Términos de uso',
            description: 'Entiende el acuerdo para usar la app',
          },
          privacy: {
            title: 'Política de privacidad',
            description: 'Conoce cómo protegemos tus datos',
          },
        },
        pro: {
          title: 'Pro y códigos',
          redeem: {
            title: 'Canjear código',
            description: 'Desbloquea promos o betas especiales',
          },
          upgrade: {
            title: 'Mejorar a Pro',
            description: 'Conoce todos los beneficios premium',
          },
        },
        social: {
          title: 'Redes sociales',
          x: {
            title: 'X',
            description: '@tomoflowapp',
          },
          instagram: {
            title: 'Instagram',
            description: '@tomoflowapp',
          },
          facebook: {
            title: 'Facebook',
            description: '@tomoflowapp',
          },
        },
      },
      debug: {
        title: 'ESTADO DE PRO (DEBUG)',
        isPro: 'isProEffective: {value}',
        proStatus: 'proStatus.isPro: {value}',
        clearLocalData: 'Borrar datos locales de la app',
      },
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
    auth: {
      titleSignIn: 'Iniciar sesión',
      titleSignUp: 'Crear una cuenta',
      subtitle: 'Usa tu correo y contraseña para acceder a la sincronización en la nube.',
      createAccount: 'Crear cuenta',
      toggleToSignUp: '¿No tienes cuenta? Regístrate',
      toggleToSignIn: '¿Ya tienes cuenta? Inicia sesión',
      emailPlaceholder: 'Correo electrónico',
      passwordPlaceholder: 'Contraseña',
      loading: 'Por favor espera...',
      verifyEmailTitle: 'Revisa tu correo',
      verifyEmailBody: 'Verifica tu correo para completar el registro.',
      errors: {
        missingCredentials: 'El correo y la contraseña son obligatorios.',
        generic: 'Ocurrió un problema. Inténtalo de nuevo.',
      },
    },
    tasks: {
      header: 'Tareas',
      tabs: {
        todo: 'Pendientes',
        done: 'Hechas',
      },
      add: {
        title: 'Agregar tarea',
        missingTitle: 'Ingresa un título para la tarea.',
        titlePlaceholder: 'Título',
        descriptionPlaceholder: 'Descripción (opcional)',
        activityTypeLabel: 'Tipo de actividad',
        none: 'Ninguna',
      },
      upsell: {
        title: 'Límite de tareas alcanzado',
        subtitle: 'Mejora a TomoFlow Pro para desbloquear tareas ilimitadas y más funciones de productividad.',
      },
      empty: {
        todoTitle: 'Aún no tienes tareas en tu lista.',
        todoSubtitle: 'Crea tu primera tarea de enfoque para comenzar.',
        done: 'Aún no tienes tareas completadas.',
      },
      planNote: '{count} tareas restantes en el plan gratis.',
      unknownDate: 'Fecha desconocida',
    },
    taskDetail: {
      header: 'Detalles de la tarea',
      focus: {
        cta: 'Iniciar enfoque',
        subtitle: 'Abre el temporizador Pomodoro con esta tarea.',
      },
      fields: {
        title: 'Título',
        description: 'Descripción',
        activityType: 'Tipo de actividad',
        none: 'Ninguna',
        created: 'Creada',
        completed: 'Completada',
      },
      placeholders: {
        title: 'Título de la tarea',
        description: 'Agrega más detalles',
      },
      activityTypeSummary:
        'Intervalo de trabajo predeterminado: {work} min · Descanso corto: {short} min · Descanso largo: {long} min',
      intervals: {
        title: 'Historial de intervalos',
        empty: 'Aún no hay intervalos registrados.',
        footnote: '*Los intervalos menores a 5 minutos se muestran aquí pero no cuentan en Analíticas.',
        types: {
          work: 'Trabajo',
          short_break: 'Descanso corto',
          long_break: 'Descanso largo',
        },
        status: {
          inProgress: 'En progreso',
          cancelledShort: 'Cancelado antes de tiempo (no cuenta)',
          skipped: 'Saltado',
          completedShort: 'Completado (corto, no cuenta)',
          completed: 'Completado',
        },
        fields: {
          start: 'Inicio',
          end: 'Fin',
          planned: 'Planeado',
          focus: 'Tiempo de enfoque',
          elapsed: 'Transcurrido',
        },
      },
      duration: {
        minutesSeconds: '{minutes} min {seconds} s',
        minutesOnly: '{minutes} min',
        secondsOnly: '{seconds} s',
        zero: '0 s',
      },
      update: {
        title: 'Actualizar tarea',
        requiredTitle: 'El título es obligatorio.',
        successTitle: 'Tarea actualizada',
        successBody: 'Tus cambios se han guardado.',
      },
      missing: {
        title: 'Tarea no encontrada',
        subtitle: 'Esta tarea pudo haberse eliminado. Vuelve a la lista e inténtalo de nuevo.',
        back: 'Volver a tareas',
      },
      actions: {
        delete: 'Eliminar tarea',
        save: 'Guardar cambios',
        confirmDelete: '¿Seguro que deseas eliminar esta tarea?',
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
