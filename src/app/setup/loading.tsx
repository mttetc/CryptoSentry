import { Card, CardContent } from '@/components/ui/card';

export default function SetupLoading() {
  return (
    <div className="container mx-auto space-y-8 py-8">
      <div className="space-y-4 text-center">
        <div className="mx-auto h-10 w-64 animate-pulse rounded bg-muted" />
        <div className="mx-auto h-6 w-96 animate-pulse rounded bg-muted" />
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-1/3 rounded bg-muted" />
            <div className="h-4 w-2/3 rounded bg-muted" />
            <div className="h-10 w-full rounded bg-muted" />
            <div className="h-10 w-full rounded bg-muted" />
            <div className="h-10 w-1/3 rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
