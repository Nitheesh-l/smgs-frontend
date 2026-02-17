import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

const PageWrapper = ({ children, className }: PageWrapperProps) => {
  return (
    <div className={cn("min-h-screen mesh-gradient pt-24 pb-8 px-4 md:px-8", className)}>
      <div className="max-w-7xl mx-auto fade-in-up">
        {children}
      </div>
    </div>
  );
};

export default PageWrapper;
