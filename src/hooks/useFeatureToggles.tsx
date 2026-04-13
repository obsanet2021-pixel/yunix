import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeatureToggles {
  mt5_connection: boolean;
  plaque_orders: boolean;
  certificate_size_guide: boolean;
  loyalty_program: boolean;
  partner_program: boolean;
  bridge_settings: boolean;
  activity_log: boolean;
}

const DEFAULT_TOGGLES: FeatureToggles = {
  mt5_connection: true,
  plaque_orders: true,
  certificate_size_guide: true,
  loyalty_program: true,
  partner_program: true,
  bridge_settings: true,
  activity_log: true,
};

export function useFeatureToggles() {
  const [toggles, setToggles] = useState<FeatureToggles>(DEFAULT_TOGGLES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadToggles();
  }, []);

  const loadToggles = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'feature_toggles')
        .single();

      if (data?.value && typeof data.value === 'object') {
        setToggles({ ...DEFAULT_TOGGLES, ...(data.value as unknown as FeatureToggles) });
      }
    } catch (error) {
      console.error('Error loading feature toggles:', error);
    } finally {
      setLoading(false);
    }
  };

  const isEnabled = (feature: keyof FeatureToggles): boolean => {
    return toggles[feature] ?? true;
  };

  const updateToggles = async (newToggles: Partial<FeatureToggles>) => {
    const updated = { ...toggles, ...newToggles };
    setToggles(updated);

    const { error } = await supabase
      .from('system_settings')
      .update({ value: updated, updated_at: new Date().toISOString() })
      .eq('key', 'feature_toggles');

    if (error) {
      console.error('Error updating feature toggles:', error);
      throw error;
    }
  };

  return { toggles, loading, isEnabled, updateToggles, refetch: loadToggles };
}
