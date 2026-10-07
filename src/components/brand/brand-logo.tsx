import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/nexofit-favicon.png"
      alt="NexoFit"
      width={size}
      height={size}
      priority
      className={cn("shrink-0 rounded-[22%] object-contain", className)}
    />
  );
}
