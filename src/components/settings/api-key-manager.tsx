'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Key, Plus, Copy, AlertTriangle } from 'lucide-react';
import { createApiKey, revokeApiKey } from '@/actions/api-keys';

// --- Types ---

interface ApiKeyItem {
  id: string;
  prefix: string;
  name: string;
  scopes: string[];
  last_used_at: string | null;
  created_at: string;
  is_active: boolean;
}

interface ApiKeyManagerProps {
  initialKeys: ApiKeyItem[];
}

// --- Constants ---

const AVAILABLE_SCOPES = [
  { value: 'alerts:read', label: 'Read alerts' },
  { value: 'alerts:write', label: 'Write alerts' },
  { value: 'portfolio:read', label: 'Read portfolio' },
  { value: 'portfolio:write', label: 'Write portfolio' },
] as const;

// --- Helpers ---

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// --- Component ---

export function ApiKeyManager({ initialKeys }: ApiKeyManagerProps) {
  const [keys, setKeys] = useState<ApiKeyItem[]>(initialKeys);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState<string | null>(null);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Create form state
  const [keyName, setKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['alerts:read']);

  function toggleScope(scope: string) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  function resetCreateForm() {
    setKeyName('');
    setSelectedScopes(['alerts:read']);
    setNewKeyValue(null);
    setShowCreateDialog(false);
  }

  async function handleCreate() {
    if (!keyName.trim()) {
      toast.error('Please enter a key name');
      return;
    }
    if (selectedScopes.length === 0) {
      toast.error('Please select at least one scope');
      return;
    }

    setIsSaving(true);
    try {
      const result = await createApiKey({
        name: keyName.trim(),
        scopes: selectedScopes,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      // Show the key to the user
      setNewKeyValue(result.key);

      // Add to list with optimistic data
      setKeys((prev) => [
        {
          id: crypto.randomUUID(),
          prefix: `${result.key.slice(0, 12)}...`,
          name: keyName.trim(),
          scopes: selectedScopes,
          last_used_at: null,
          created_at: new Date().toISOString(),
          is_active: true,
        },
        ...prev,
      ]);

      toast.success('API key created');
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRevoke(id: string) {
    setIsSaving(true);
    try {
      const result = await revokeApiKey(id);

      if (!result.success) {
        toast.error(result.error ?? 'Failed to revoke key');
        return;
      }

      setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, is_active: false } : k)));
      toast.success('API key revoked');
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSaving(false);
      setShowRevokeDialog(null);
    }
  }

  function handleCopyKey() {
    if (newKeyValue) {
      navigator.clipboard.writeText(newKeyValue).then(
        () => toast.success('Key copied to clipboard'),
        () => toast.error('Failed to copy key')
      );
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Key className="text-primary h-5 w-5" />
              API Keys
            </CardTitle>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Generate New Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No API keys yet. Generate a key to access the CryptoSentry REST API.
            </p>
          ) : (
            <div className="space-y-3">
              {keys.map((apiKey) => (
                <div
                  key={apiKey.id}
                  className="border-border/50 flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{apiKey.name}</span>
                      {!apiKey.is_active && (
                        <Badge variant="outline" className="text-destructive">
                          Revoked
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                      <code className="bg-muted rounded px-1.5 py-0.5 font-mono">
                        {apiKey.prefix}
                      </code>
                      <span>Created {formatDate(apiKey.created_at)}</span>
                      {apiKey.last_used_at && (
                        <span>Last used {formatDate(apiKey.last_used_at)}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {apiKey.scopes.map((scope) => (
                        <Badge key={scope} variant="outline" className="text-xs">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {apiKey.is_active && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive ml-3 shrink-0"
                      onClick={() => setShowRevokeDialog(apiKey.id)}
                      disabled={isSaving}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create key dialog */}
      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          if (!open) {
            resetCreateForm();
          }
        }}
      >
        <DialogContent>
          {newKeyValue ? (
            <>
              <DialogHeader>
                <DialogTitle>API Key Created</DialogTitle>
                <DialogDescription>
                  Copy your key now. It will not be shown again.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="border-border bg-muted/30 flex items-center gap-2 rounded-lg border p-3">
                  <code className="flex-1 font-mono text-sm break-all">{newKeyValue}</code>
                  <Button size="sm" variant="ghost" onClick={handleCopyKey}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                  <p className="text-muted-foreground text-xs">
                    This key will not be shown again. Store it securely.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={resetCreateForm}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Generate API Key</DialogTitle>
                <DialogDescription>
                  Create a new API key to access the CryptoSentry REST API.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="key-name">Key name</Label>
                  <Input
                    id="key-name"
                    placeholder="My integration"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Scopes</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_SCOPES.map((scope) => {
                      const isSelected = selectedScopes.includes(scope.value);
                      return (
                        <Badge
                          key={scope.value}
                          variant={isSelected ? 'default' : 'outline'}
                          className="cursor-pointer select-none"
                          onClick={() => toggleScope(scope.value)}
                        >
                          {scope.label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={isSaving || !keyName.trim()}>
                  {isSaving ? 'Creating...' : 'Generate Key'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation dialog */}
      <AlertDialog
        open={showRevokeDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setShowRevokeDialog(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Any integrations using this key will stop working
              immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (showRevokeDialog) {
                  handleRevoke(showRevokeDialog);
                }
              }}
            >
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
