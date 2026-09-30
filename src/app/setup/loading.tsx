import { Card, CardContent } from '@/components/ui/card';

export default function SetupLoading() {
  return (
    <div className="container mx-auto space-y-8 py-8">
      <div className="space-y-4 text-center">
        <div className="bg-muted mx-auto h-10 w-64 animate-pulse rounded" />
        <div className="bg-muted mx-auto h-6 w-96 animate-pulse rounded" />
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="bg-muted h-6 w-1/3 rounded" />
            <div className="bg-muted h-4 w-2/3 rounded" />
            <div className="bg-muted h-10 w-full rounded" />
            <div className="bg-muted h-10 w-full rounded" />
            <div className="bg-muted h-10 w-1/3 rounded" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
