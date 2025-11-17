export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 border-4 border-muted rounded-full border-t-primary animate-spin"></div>
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  )
}
