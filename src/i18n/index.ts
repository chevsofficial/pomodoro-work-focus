import useAppStore from '../store/appStore';
import { AppLanguage } from './language';

export async function setAppLanguage(language: AppLanguage): Promise<void> {
  const { language: currentLanguage, setLanguage } = useAppStore.getState();

  if (currentLanguage !== language) {
    setLanguage(language);
  }
}
