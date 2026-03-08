import { Card, CardContent } from '@/components/ui/card';

export default function DashboardLoading() {
  return (
    <div className="container mx-auto space-y-8 py-8">
      <div className="space-y-4 text-center">
        <div className="mx-auto h-10 w-64 animate-pulse rounded bg-muted" />
        <div className="mx-auto h-6 w-96 animate-pulse rounded bg-muted" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-1/2 rounded bg-muted" />
                <div className="h-8 w-1/3 rounded bg-muted" />
                <div className="h-3 w-2/3 rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="h-[300px] animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
