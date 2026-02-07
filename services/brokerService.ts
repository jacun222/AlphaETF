import { Broker, ETF } from '../types';

/**
 * Broker Mapper Module
 * Implements strategy to determine broker fees based on real-world tariff tables.
 * Data updated to reflect 2024/2025 standard pricing.
 */

export interface BrokerComparison extends Omit<Broker, 'isAvailable' | 'notes'> {
  etfStatus: {
    isin: string;
    isAvailable: boolean;
    costNote: string;
  }[];
}

const BROKERS_BASE = [
  {
    id: 'xtb',
    name: 'XTB',
    country: 'Poland',
    commissionType: 'Zero',
    commissionRate: 0,
    minCommission: 0,
    currencyConversionFee: 0.50, // 0.5% added to spread
  },
  {
    id: 'mbank',
    name: 'mBank (eMakler)',
    country: 'Poland',
    commissionType: 'Variable',
    commissionRate: 0.29,
    minCommission: 4.45, // ~19 PLN converted to EUR
    currencyConversionFee: 0.1, // Official fee is low, but spread is high. Usually listed as ~0.1% fee.
  },
  {
    id: 'bossa',
    name: 'BOŚ (Bossa)',
    country: 'Poland',
    commissionType: 'Variable',
    commissionRate: 0.29,
    minCommission: 4.45, // ~19 PLN
    currencyConversionFee: 0.1, 
  },
  {
    id: 'ibkr',
    name: 'Interactive Brokers',
    country: 'Ireland/USA',
    commissionType: 'Variable',
    commissionRate: 0.05, // Tiered pricing often starts here
    minCommission: 1.25, // Min 1.25 EUR
    currencyConversionFee: 0.002, // 0.2 basis points (spot rate), min 2 USD. Very cheap.
  },
  {
    id: 'degiro',
    name: 'Degiro',
    country: 'Netherlands',
    commissionType: 'Fixed',
    commissionRate: 0,
    minCommission: 1.00, // Handling fee ~1 EUR or 3 EUR depending on selection
    currencyConversionFee: 0.25, // AutoFX
  }
];

export const getBrokersForEtfs = (etfs: ETF[]): BrokerComparison[] => {
  return BROKERS_BASE.map(broker => {
    const etfStatus = etfs.map(etf => {
        let isAvailable = true;
        let costNote = '';

        // --- Logic for Availability & Specific Pricing ---

        // XTB: Free up to 100k EUR turnover monthly
        if (broker.id === 'xtb') {
            costNote = '0 EUR*';
        }

        // mBank & Bossa: Standard Polish Broker Fees
        if (broker.id === 'mbank' || broker.id === 'bossa') {
            // Check for potential promo (Mock logic, real promos change often)
            costNote = '0.29% (min 19 PLN)';
        }

        // Interactive Brokers: Very cheap for larger amounts
        if (broker.id === 'ibkr') {
            costNote = '0.05% (min 1.25€)';
        }

        // Degiro: Core Selection Logic (Simplified)
        if (broker.id === 'degiro') {
            const isCore = ['VWCE', 'IWDA', 'SXR8', 'QDVE'].includes(etf.ticker);
            if (isCore) {
                costNote = '1 EUR (Core)';
            } else {
                costNote = '3 EUR (Regular)';
            }
        }

        return {
            isin: etf.isin,
            isAvailable,
            costNote
        };
    });

    return {
      ...broker,
      commissionType: broker.commissionType as any,
      etfStatus
    };
  });
};
