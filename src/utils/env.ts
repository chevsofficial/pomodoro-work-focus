import Constants from 'expo-constants';

export const isExpoGo = () => Constants.appOwnership === 'expo';
export const isProdBuild = () => !__DEV__ && !isExpoGo();
