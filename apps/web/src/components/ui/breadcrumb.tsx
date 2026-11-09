import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

const Breadcrumb = ({
  ref,
  ...props
}: React.ComponentPropsWithoutRef<'nav'> & {
  separator?: React.ReactNode;
} & { ref?: React.Ref<HTMLElement> }) => {
  const { t } = useTranslation();
  return <nav ref={ref} aria-label={t('auto.breadcrumb')} {...props} />;
};
Breadcrumb.displayName = 'Breadcrumb';

const BreadcrumbList = ({
  ref,
  className,
  ...props
}: React.ComponentPropsWithoutRef<'ol'> & {
  ref?: React.Ref<HTMLOListElement>;
}) => (
  <ol
    ref={ref}
    className={cn(
      'flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5',
      className,
    )}
    {...props}
  />
);

BreadcrumbList.displayName = 'BreadcrumbList';

const BreadcrumbItem = ({
  ref,
  className,
  ...props
}: React.ComponentPropsWithoutRef<'li'> & {
  ref?: React.Ref<HTMLLIElement>;
}) => (
  <li
    ref={ref}
    className={cn('inline-flex items-center gap-1.5', className)}
    {...props}
  />
);

BreadcrumbItem.displayName = 'BreadcrumbItem';

const BreadcrumbLink = ({
  ref,
  asChild,
  className,
  ...props
}: React.ComponentPropsWithoutRef<'a'> & {
  asChild?: boolean;
} & { ref?: React.Ref<HTMLAnchorElement> }) => {
  const Comp = asChild ? Slot : 'a';

  return (
    <Comp
      ref={ref}
      className={cn('transition-colors hover:text-foreground', className)}
      {...props}
    />
  );
};
BreadcrumbLink.displayName = 'BreadcrumbLink';

const BreadcrumbPage = ({
  ref,
  className,
  ...props
}: React.ComponentPropsWithoutRef<'span'> & {
  ref?: React.Ref<HTMLSpanElement>;
}) => {
  const { t } = useTranslation();
  return (
    <span
      ref={ref}
      role="link"
      aria-disabled="true"
      aria-current={t('auto.page')}
      className={cn('font-normal text-foreground', className)}
      {...props}
    />
  );
};

BreadcrumbPage.displayName = 'BreadcrumbPage';

const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: React.ComponentProps<'li'>) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={cn('[&>svg]:size-3.5', className)}
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
);
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

const BreadcrumbEllipsis = ({
  className,
  ...props
}: React.ComponentProps<'span'>) => {
  const { t } = useTranslation();
  return (
    <span
      role="presentation"
      aria-hidden="true"
      className={cn('flex size-9 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">{t('auto.more')}</span>
    </span>
  );
};
BreadcrumbEllipsis.displayName = 'BreadcrumbElipssis';

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
