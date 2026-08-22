import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { BreadcrumbItem } from "@/lib/seo";

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const trail: BreadcrumbItem[] = [
    { name: "Home", path: "/" },
    ...items,
  ];

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[var(--muted)] select-none">
      {trail.map((item, index) => {
        const isLast = index === trail.length - 1;
        return (
          <div key={item.path} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight size={12} className="text-[var(--muted)] opacity-60" />}
            {isLast ? (
              <span className="text-[var(--ink)] font-medium" aria-current="page">
                {item.name}
              </span>
            ) : (
              <Link href={item.path} className="hover:text-[var(--ink)] transition-colors">
                {item.name}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
