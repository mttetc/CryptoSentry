import { Card, CardContent } from '@/components/ui/card';

export default function SettingsLoading() {
  return (
    <div className="container mx-auto space-y-8 py-8">
      <div className="bg-muted h-10 w-32 animate-pulse rounded" />
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="bg-muted h-6 w-1/3 rounded" />
            <div className="bg-muted h-4 w-2/3 rounded" />
            <div className="bg-muted h-10 w-full rounded" />
            <div className="bg-muted h-10 w-full rounded" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
