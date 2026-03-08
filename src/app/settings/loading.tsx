import { Card, CardContent } from '@/components/ui/card';

export default function SettingsLoading() {
  return (
    <div className="container mx-auto space-y-8 py-8">
      <div className="h-10 w-32 animate-pulse rounded bg-muted" />
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-1/3 rounded bg-muted" />
            <div className="h-4 w-2/3 rounded bg-muted" />
            <div className="h-10 w-full rounded bg-muted" />
            <div className="h-10 w-full rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
