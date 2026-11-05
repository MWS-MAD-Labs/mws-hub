import { memo, useId, useMemo } from "react";
import AppCard from "./AppCard";
import { MOBILE_LAUNCHER_PAGE_CLASS } from "./hubGrid";
import type {
  HubApplication,
  HubCategoryFilterOption,
} from "@/model/hub-model";

type ScopeAppGroupsProps = {
  apps: HubApplication[];
  scopes: HubCategoryFilterOption[];
  className?: string;
  onRequestAccess?: (app: HubApplication) => void;
  onReportProblem?: (app: HubApplication) => void;
};

type AppScopeGroup = {
  id: string;
  label: string;
  apps: HubApplication[];
};

const UNSCOPED_GROUP = "__other__";

const fallbackScopeLabel = (scope: string): string =>
  scope
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");

const ScopeAppGroups = memo(
  ({
    apps,
    scopes,
    className,
    onRequestAccess,
    onReportProblem,
  }: ScopeAppGroupsProps) => {
    const headingIdPrefix = useId();
    const groups = useMemo<AppScopeGroup[]>(() => {
      const appsByScope = new Map<string, HubApplication[]>();
      apps.forEach((app) => {
        const scopeId = app.scope || UNSCOPED_GROUP;
        const group = appsByScope.get(scopeId) || [];
        group.push(app);
        appsByScope.set(scopeId, group);
      });

      const scopeLabels = new Map(
        scopes
          .filter((scope) => scope.id !== "all")
          .map((scope) => [scope.id, scope.label]),
      );
      const scopeOrder = scopes
        .filter((scope) => scope.id !== "all")
        .map((scope) => scope.id);
      const knownScopeIds = new Set(scopeOrder);
      const additionalScopeIds = [...appsByScope.keys()].filter(
        (scopeId) =>
          scopeId !== UNSCOPED_GROUP && !knownScopeIds.has(scopeId),
      );

      return [...scopeOrder, ...additionalScopeIds, UNSCOPED_GROUP]
        .map((scopeId) => ({
          id: scopeId,
          label:
            scopeId === UNSCOPED_GROUP
              ? "Other apps"
              : scopeLabels.get(scopeId) || fallbackScopeLabel(scopeId),
          apps: appsByScope.get(scopeId) || [],
        }))
        .filter((group) => group.apps.length > 0);
    }, [apps, scopes]);

    return (
      <div className={className}>
        {groups.map((group, index) => {
          const headingId = `${headingIdPrefix}-${index}`;

          return (
            <section
              key={group.id}
              aria-labelledby={headingId}
              className={index === 0 ? "pt-1" : "border-t border-border/55 pt-4"}
            >
              <div className="flex items-baseline gap-2 px-1">
                <h3
                  id={headingId}
                  className="text-xs font-semibold text-foreground sm:text-sm"
                >
                  {group.label}
                </h3>
                <span className="text-[10px] font-medium tabular-nums text-muted-foreground sm:text-xs">
                  {group.apps.length}
                </span>
              </div>

              <div className={MOBILE_LAUNCHER_PAGE_CLASS}>
                {group.apps.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    onRequestAccess={onRequestAccess}
                    onReportProblem={onReportProblem}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  },
);

ScopeAppGroups.displayName = "ScopeAppGroups";

export default ScopeAppGroups;
