'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Wallet, X, Check } from 'lucide-react';
import { addPosition, updatePosition, removePosition } from '@/actions/portfolio';

// --- Types ---

interface PortfolioPosition {
  id: string;
  symbol: string;
  coingecko_id: string;
  amount: number;
  avg_buy_price: number;
}

interface PortfolioManagerProps {
  initialPositions: unknown[];
}

// --- Helpers ---

function castPosition(raw: unknown): PortfolioPosition {
  const obj = raw as Record<string, unknown>;
  return {
    id: String(obj.id),
    symbol: String(obj.symbol),
    coingecko_id: String(obj.coingecko_id),
    amount: Number(obj.amount),
    avg_buy_price: Number(obj.avg_buy_price),
  };
}

interface CoinSearchResult {
  id: string;
  symbol: string;
  name: string;
  thumb: string;
}

// --- Component ---

export function PortfolioManager({ initialPositions }: PortfolioManagerProps) {
  const [positions, setPositions] = useState<PortfolioPosition[]>(
    initialPositions.map((p) => castPosition(p))
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Add form state
  const [coinQuery, setCoinQuery] = useState('');
  const [coinResults, setCoinResults] = useState<CoinSearchResult[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<CoinSearchResult | null>(null);
  const [amount, setAmount] = useState('');
  const [avgBuyPrice, setAvgBuyPrice] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Edit form state
  const [editAmount, setEditAmount] = useState('');
  const [editAvgBuyPrice, setEditAvgBuyPrice] = useState('');

  async function handleCoinSearch(query: string) {
    setCoinQuery(query);
    setSelectedCoin(null);

    if (query.length < 2) {
      setCoinResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/coins/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      const data = (await response.json()) as { results: CoinSearchResult[] };
      setCoinResults(data.results ?? []);
    } catch {
      setCoinResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  function handleSelectCoin(coin: CoinSearchResult) {
    setSelectedCoin(coin);
    setCoinQuery(`${coin.name} (${coin.symbol.toUpperCase()})`);
    setCoinResults([]);
  }

  function resetAddForm() {
    setCoinQuery('');
    setCoinResults([]);
    setSelectedCoin(null);
    setAmount('');
    setAvgBuyPrice('');
    setShowAddForm(false);
  }

  async function handleAdd() {
    if (!selectedCoin) {
      toast.error('Please select a coin');
      return;
    }

    const amountNum = Number.parseFloat(amount);
    const priceNum = Number.parseFloat(avgBuyPrice);

    if (Number.isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      toast.error('Please enter a valid average buy price');
      return;
    }

    setIsSaving(true);
    try {
      const result = await addPosition({
        symbol: selectedCoin.symbol.toUpperCase(),
        coingeckoId: selectedCoin.id,
        amount: amountNum,
        avgBuyPrice: priceNum,
      });

      if (!result.success) {
        toast.error(result.error ?? 'Failed to add position');
        return;
      }

      // Optimistic update
      setPositions((prev) => [
        {
          id: crypto.randomUUID(),
          symbol: selectedCoin.symbol.toUpperCase(),
          coingecko_id: selectedCoin.id,
          amount: amountNum,
          avg_buy_price: priceNum,
        },
        ...prev,
      ]);

      toast.success('Position added');
      resetAddForm();
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  }

  function startEdit(position: PortfolioPosition) {
    setEditingId(position.id);
    setEditAmount(String(position.amount));
    setEditAvgBuyPrice(String(position.avg_buy_price));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditAmount('');
    setEditAvgBuyPrice('');
  }

  async function handleUpdate(id: string) {
    const amountNum = Number.parseFloat(editAmount);
    const priceNum = Number.parseFloat(editAvgBuyPrice);

    if (Number.isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      toast.error('Please enter a valid average buy price');
      return;
    }

    setIsSaving(true);
    try {
      const result = await updatePosition({
        id,
        amount: amountNum,
        avgBuyPrice: priceNum,
      });

      if (!result.success) {
        toast.error(result.error ?? 'Failed to update position');
        return;
      }

      setPositions((prev) =>
        prev.map((p) => (p.id === id ? { ...p, amount: amountNum, avg_buy_price: priceNum } : p))
      );

      toast.success('Position updated');
      cancelEdit();
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(id: string) {
    setIsSaving(true);
    try {
      const result = await removePosition(id);

      if (!result.success) {
        toast.error(result.error ?? 'Failed to remove position');
        return;
      }

      setPositions((prev) => prev.filter((p) => p.id !== id));
      toast.success('Position removed');
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="text-primary h-5 w-5" />
            Portfolio Positions
          </CardTitle>
          {!showAddForm && (
            <Button size="sm" onClick={() => setShowAddForm(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Add Position
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add form */}
        {showAddForm && (
          <div className="border-border/50 bg-muted/20 space-y-3 rounded-lg border p-4">
            <div className="space-y-2">
              <Label htmlFor="coin-search" className="text-sm">
                Search coin
              </Label>
              <div className="relative">
                <Input
                  id="coin-search"
                  placeholder="Search by name or symbol..."
                  value={coinQuery}
                  onChange={(e) => handleCoinSearch(e.target.value)}
                  disabled={isSaving}
                />
                {(coinResults.length > 0 || isSearching) && (
                  <div className="bg-popover absolute z-50 mt-1 w-full rounded-md border shadow-md">
                    {isSearching ? (
                      <div className="text-muted-foreground p-2 text-sm">Searching...</div>
                    ) : (
                      <ul className="max-h-48 overflow-auto">
                        {coinResults.map((coin) => (
                          <li
                            key={coin.id}
                            className="hover:bg-accent flex cursor-pointer items-center gap-2 px-3 py-2 text-sm"
                            onClick={() => handleSelectCoin(coin)}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={coin.thumb}
                              alt={coin.name}
                              className="h-5 w-5 rounded-full"
                            />
                            <span>{coin.name}</span>
                            <span className="text-muted-foreground">
                              {coin.symbol.toUpperCase()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="position-amount" className="text-sm">
                  Amount
                </Label>
                <Input
                  id="position-amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isSaving}
                  min="0"
                  step="any"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position-price" className="text-sm">
                  Avg buy price (USD)
                </Label>
                <Input
                  id="position-price"
                  type="number"
                  placeholder="0.00"
                  value={avgBuyPrice}
                  onChange={(e) => setAvgBuyPrice(e.target.value)}
                  disabled={isSaving}
                  min="0"
                  step="any"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={isSaving || !selectedCoin}>
                {isSaving ? 'Adding...' : 'Add Position'}
              </Button>
              <Button size="sm" variant="outline" onClick={resetAddForm} disabled={isSaving}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Positions table */}
        {positions.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No positions yet. Add your first position to track portfolio impact.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border/50 text-muted-foreground border-b text-left">
                  <th className="pb-2 font-medium">Symbol</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Avg Buy Price</th>
                  <th className="pb-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => (
                  <tr key={position.id} className="border-border/30 border-b">
                    {editingId === position.id ? (
                      <>
                        <td className="py-3 font-mono font-medium">{position.symbol}</td>
                        <td className="py-3">
                          <Input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="h-8 w-28"
                            min="0"
                            step="any"
                          />
                        </td>
                        <td className="py-3">
                          <Input
                            type="number"
                            value={editAvgBuyPrice}
                            onChange={(e) => setEditAvgBuyPrice(e.target.value)}
                            className="h-8 w-28"
                            min="0"
                            step="any"
                          />
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUpdate(position.id)}
                              disabled={isSaving}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEdit}
                              disabled={isSaving}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 font-mono font-medium">{position.symbol}</td>
                        <td className="py-3">{position.amount}</td>
                        <td className="py-3">${position.avg_buy_price.toLocaleString()}</td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(position)}
                              disabled={isSaving}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemove(position.id)}
                              disabled={isSaving}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
