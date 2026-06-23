import { FloatingPanel } from '@/components/ui/floating-panel';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-white/10 ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <ImmersiveScreen contentClassName="mx-auto max-w-xl">
      <FloatingPanel className="w-full border-2 border-white/10">
        {/* Back link skeleton */}
        <SkeletonBlock className="mb-6 h-4 w-32" />

        {/* Modality + Group name */}
        <SkeletonBlock className="h-3 w-20" />
        <SkeletonBlock className="mt-2 h-10 w-56" />

        {/* Admin buttons grid */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
        </div>

        {/* Next match section */}
        <div className="mt-10">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="mt-3 h-14 w-full" />
        </div>

        {/* Create match button */}
        <SkeletonBlock className="mt-4 h-12 w-full" />

        {/* Recent matches */}
        <div className="mt-10">
          <SkeletonBlock className="h-7 w-40" />
          <div className="mt-4 space-y-3">
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-24 w-full" />
          </div>
        </div>

        {/* Player card section */}
        <div className="mt-10">
          <SkeletonBlock className="h-48 w-full" />
        </div>

        {/* Support section */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <SkeletonBlock className="h-7 w-40" />
          <SkeletonBlock className="mt-3 h-4 w-full" />
          <SkeletonBlock className="mt-6 h-12 w-40" />
        </div>
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
