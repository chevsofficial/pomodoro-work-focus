export const ACTIVITY_COLORS = [
  { key: 'red', label: 'Red', value: '#FF5A5F' },
  { key: 'green', label: 'Green', value: '#4CAF50' },
  { key: 'blue', label: 'Blue', value: '#2196F3' },
  { key: 'yellow', label: 'Yellow', value: '#FFC107' },
  { key: 'purple', label: 'Purple', value: '#9C27B0' },
  { key: 'orange', label: 'Orange', value: '#FF9800' },
] as const;

export const FREE_COLOR_KEYS = ['red', 'green'] as const;

export const DEFAULT_ACTIVITY_COLOR = ACTIVITY_COLORS[0].value;
