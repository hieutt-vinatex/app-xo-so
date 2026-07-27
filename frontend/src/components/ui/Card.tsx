import type { ReactNode } from "react";
import { classNames } from "../../utils/format";

interface CardProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}

export function Card({ children, className, as = "div" }: CardProps): JSX.Element {
  const Tag = as;
  return (
    <Tag
      className={classNames(
        "rounded-xl2 bg-surface-card dark:bg-slate-800/70 border border-line dark:border-slate-700 shadow-card p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

interface SectionCardProps extends CardProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  id?: string;
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  id,
}: SectionCardProps): JSX.Element {
  return (
    <Card as="section" className={className}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 id={id} className="text-base font-semibold text-ink dark:text-slate-100">
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-ink-soft dark:text-slate-400 mt-0.5">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </Card>
  );
}
