import Image from "next/image";

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background">
      <Image
        src="/favicon.png"
        alt="FITXNET"
        width={56}
        height={56}
        priority
        className="animate-pulse"
      />
      <div className="h-1 w-28 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/3 animate-loading-bar rounded-full bg-primary" />
      </div>
    </div>
  );
}
