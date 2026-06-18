import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestApp } from '@/test/TestApp';
import Index from './Index';

// ── mock hooks ─────────────────────────────────────────────────────────────

vi.mock('@/hooks/useUTXOracle', () => ({
  useUTXOracle: vi.fn(),
}));

vi.mock('@/hooks/useExchangeRate', () => ({
  useExchangeRate: vi.fn(),
}));

import { useUTXOracle } from '@/hooks/useUTXOracle';
import { useExchangeRate } from '@/hooks/useExchangeRate';

const mockUseUTXOracle = vi.mocked(useUTXOracle);
const mockUseExchangeRate = vi.mocked(useExchangeRate);

// BTC price: $100,000 USD
// KES rate:  130 KES per USD
// => 1 BTC = 13,000,000 KES
const BTC_USD_PRICE = 100_000;
const KES_PER_USD = 130;

beforeEach(() => {
  mockUseUTXOracle.mockReturnValue({
    data: {
      price: BTC_USD_PRICE,
      price_usd: BTC_USD_PRICE,
      date: 'blocks 850000-850144',
      mode: 'recent_blocks_144',
      name: 'UTXOracle Consensus Price',
      source: 'local bitcoin node confirmed blocks',
      trigger_block_hash: '000000000000000000abc123',
      updated_at: new Date().toISOString(),
    },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  } as ReturnType<typeof useUTXOracle>);

  mockUseExchangeRate.mockReturnValue({
    data: { rate: KES_PER_USD, currency: 'KES', updatedAt: '2026-06-17' },
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useExchangeRate>);
});

// ── helpers ────────────────────────────────────────────────────────────────

function renderIndex() {
  return render(
    <TestApp>
      <Index />
    </TestApp>,
  );
}

function getFiatInput() {
  return screen.getByPlaceholderText('0.00') as HTMLInputElement;
}

function getBtcInput() {
  return screen.getByPlaceholderText('0.00000000') as HTMLInputElement;
}

// ── USD tests ──────────────────────────────────────────────────────────────

describe('USD mode (default)', () => {
  it('renders with USD selected by default', () => {
    renderIndex();
    expect(screen.getByText('US Dollar (USD)')).toBeInTheDocument();
  });

  it('converts USD → BTC correctly', async () => {
    renderIndex();
    fireEvent.change(getFiatInput(), { target: { value: '100000' } });
    await waitFor(() => {
      expect(getBtcInput().value).toBe('1.00000000');
    });
  });

  it('converts BTC → USD correctly', async () => {
    renderIndex();
    fireEvent.change(getBtcInput(), { target: { value: '1' } });
    await waitFor(() => {
      expect(getFiatInput().value).toBe('100000.00');
    });
  });

  it('shows satoshis for a USD amount', async () => {
    renderIndex();
    fireEvent.change(getFiatInput(), { target: { value: '1' } });
    await waitFor(() => {
      // $1 at $100k/BTC = 1000 sats
      expect(screen.getByText('1,000 sats')).toBeInTheDocument();
    });
  });
});

// ── KES tests ──────────────────────────────────────────────────────────────

describe('KES mode', () => {
  it('switches to KES when the KES button is clicked', async () => {
    renderIndex();
    fireEvent.click(screen.getByRole('button', { name: /KES/i }));
    await waitFor(() => {
      expect(screen.getByText('Kenyan Shilling (KES)')).toBeInTheDocument();
    });
  });

  it('converts KES → BTC correctly', async () => {
    renderIndex();
    fireEvent.click(screen.getByRole('button', { name: /KES/i }));

    // 13,000,000 KES should equal exactly 1 BTC
    // (100,000 USD/BTC * 130 KES/USD = 13,000,000 KES/BTC)
    fireEvent.change(getFiatInput(), { target: { value: '13000000' } });

    await waitFor(() => {
      expect(getBtcInput().value).toBe('1.00000000');
    });
  });

  it('converts BTC → KES correctly', async () => {
    renderIndex();
    fireEvent.click(screen.getByRole('button', { name: /KES/i }));

    fireEvent.change(getBtcInput(), { target: { value: '1' } });

    await waitFor(() => {
      // 1 BTC = 13,000,000 KES
      expect(getFiatInput().value).toBe('13000000.00');
    });
  });

  it('shows satoshis for a KES amount', async () => {
    renderIndex();
    fireEvent.click(screen.getByRole('button', { name: /KES/i }));

    // 13,000 KES = 0.001 BTC = 100,000 sats
    fireEvent.change(getFiatInput(), { target: { value: '13000' } });

    await waitFor(() => {
      expect(screen.getByText('100,000 sats')).toBeInTheDocument();
    });
  });

  it('clears inputs when switching back to USD after entering KES', async () => {
    renderIndex();
    fireEvent.click(screen.getByRole('button', { name: /KES/i }));
    fireEvent.change(getFiatInput(), { target: { value: '1000' } });

    // switch back to USD
    fireEvent.click(screen.getByRole('button', { name: /USD/i }));

    await waitFor(() => {
      expect(getFiatInput().value).toBe('');
      expect(getBtcInput().value).toBe('');
    });
  });
});

// ── price badge ────────────────────────────────────────────────────────────

describe('price badge', () => {
  it('shows USD price in USD mode', () => {
    renderIndex();
    expect(screen.getByText(/1 BTC = \$100,000/)).toBeInTheDocument();
  });

  it('shows KES price in KES mode', async () => {
    renderIndex();
    fireEvent.click(screen.getByRole('button', { name: /KES/i }));
    await waitFor(() => {
      // 13,000,000 KES formatted
      expect(screen.getByText(/1 BTC = KES\s*13,000,000/)).toBeInTheDocument();
    });
  });
});
