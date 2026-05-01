import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/** TabsContent — wrapper opcional alrededor de los `TabPanel`s para spacing/CSS. */
export function TabsContent({
  className,
  children,
  ref,
  ...rest
}: TabsContentProps) {
  return (
    <div ref={ref} className={cn("ig-tabs-content", className)} {...rest}>
      {children}
    </div>
  );
}
