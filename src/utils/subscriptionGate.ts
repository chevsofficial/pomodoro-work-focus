import { useIsPro } from '../store/appStore';

export const useSubscriptionGate = () => {
  const isPro = useIsPro();

  return {
    isPro,
    canCustomizeIntervals: isPro,
    canCustomizeActivityTypeIntervals: isPro,
  };
};
