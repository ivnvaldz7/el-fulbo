import { FloatingPanel } from '@/components/ui/floating-panel';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-white/10 ${className}`} />;
}

export default function GroupsHubLoading() {
  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto max-w-[390px] w-full py-8 px-4">
      <FloatingPanel className="border-2 border-white/10 p-6">
        {/* Header */}
        <div className="mb-8">
          <SkeletonBlock className="h-9 w-40" />
          <SkeletonBlock className="mt-2 h-3 w-24" />
        </div>

        {/* Group cards */}
        <div className="flex flex-col gap-4">
          <SkeletonBlock className="h-24 w-full" />
          <SkeletonBlock className="h-24 w-full" />
        </div>

        {/* Create button */}
        <div className="mt-10">
          <SkeletonBlock className="h-14 w-full" />
        </div>
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
