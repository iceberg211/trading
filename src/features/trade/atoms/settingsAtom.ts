import { atomWithStorage } from 'jotai/utils';

interface TradeSettings {
  showOrderConfirmation: boolean;
}

export const defaultTradeSettings: TradeSettings = {
  showOrderConfirmation: true, // Default to true for safety
};

/**
 * Trade settings atom with localStorage persistence
 */
export const tradeSettingsAtom = atomWithStorage<TradeSettings>(
  'trade_settings_v1',
  defaultTradeSettings
);

// Derived atom for easier access to the specific setting
export const showOrderConfirmationAtom = atomWithStorage(
    'trade_settings_show_confirmation', 
    true
);
