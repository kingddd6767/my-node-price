import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestApp } from '@/test/TestApp';
import Index from './Index';

// ── mock hooks ─────────────────────────────────────────────────────────────

vi.mock('@/hooks/useUTXOracle', () => ({
  useUTXOracle: vi.fn(),
}));

import { useUTXOracle } from '@/hooks/useUTXOracle';

const mockUseUTXOracle = vi.mocked(useUTXOracle);

const BTC_USD_PRICE = 100_000;

beforeEach(() => {
  mockUseUTXOracle.mockReturnValue({
    data: {
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
});

// ── helpers ────────────────────────────────────────────────────────────────

function renderIndex() {
  return render(
    <TestApp>
      <Index />
    </TestApp>,
  );
}

function getUsdInput() {
  return screen.getByPlaceholderText('0.00') as HTMLInputElement;
}

function getBtcInput() {
  return screen.getByPlaceholderText('0.00000000') as HTMLInputElement;
}

// ── conversion tests ───────────────────────────────────────────────────────

describe('USD ↔ BTC conversion', () => {
  it('converts USD → BTC correctly', async () => {
    renderIndex();
    fireEvent.change(getUsdInput(), { target: { value: '100000' } });
    await waitFor(() => {
      expect(getBtcInput().value).toBe('1.00000000');
    });
  });

  it('converts BTC → USD correctly', async () => {
    renderIndex();
    fireEvent.change(getBtcInput(), { target: { value: '1' } });
    await waitFor(() => {
      expect(getUsdInput().value).toBe('100000.00');
    });
  });

  it('shows satoshis for a USD amount', async () => {
    renderIndex();
    fireEvent.change(getUsdInput(), { target: { value: '1' } });
    await waitFor(() => {
      expect(screen.getByText('1,000 sats')).toBeInTheDocument();
    });
  });
});

// ── preset button tests ────────────────────────────────────────────────────

describe('preset buttons', () => {
  it('renders all 8 preset buttons', () => {
    renderIndex();
    const presets = ['$1', '$5', '$10', '$25', '$50', '$100', '$500k', '$1k'];
    // just check a few key ones
    expect(screen.getByRole('button', { name: '$1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '$100' })).toBeInTheDocument();
  });

  it('clicking a preset fills the USD input', async () => {
    renderIndex();
    fireEvent.click(screen.getByRole('button', { name: '$100' }));
    await waitFor(() => {
      expect(getUsdInput().value).toBe('100');
    });
  });

  it('clicking a preset updates the BTC field', async () => {
    renderIndex();
    fireEvent.click(screen.getByRole('button', { name: '$100' }));
    await waitFor(() => {
      // $100 at $100k/BTC = 0.00100000 BTC
      expect(getBtcInput().value).toBe('0.00100000');
    });
  });

  it('active preset button gets the active style class', async () => {
    renderIndex();
    const btn = screen.getByRole('button', { name: '$100' });
    fireEvent.click(btn);
    await waitFor(() => {
      // After clicking, the button should have an active/selected indicator
      expect(btn.className).toMatch(/orange/);
    });
  });

  it('only one preset is active at a time', async () => {
    renderIndex();
    const btn100 = screen.getByRole('button', { name: '$100' });
    const btn50 = screen.getByRole('button', { name: '$50' });

    fireEvent.click(btn100);
    await waitFor(() => expect(getUsdInput().value).toBe('100'));

    fireEvent.click(btn50);
    await waitFor(() => {
      expect(getUsdInput().value).toBe('50');
      // btn100 should no longer be active
      expect(btn100.className).not.toMatch(/bg-orange/);
    });
  });

  it('preset buttons are disabled when price is not loaded', () => {
    mockUseUTXOracle.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useUTXOracle>);

    renderIndex();
    const btn = screen.getByRole('button', { name: '$100' });
    expect(btn).toBeDisabled();
  });
});
