import { Bell } from "lucide-react";

export default function Notification() {
  const notifications = [
    {
      id: 1,
      title: "New application request",
      message: "A new application has been submitted.",
      time: "5 min ago",
    },
    {
      id: 2,
      title: "System update",
      message: "MWS Hub has been updated successfully.",
      time: "1 hour ago",
    },
    {
      id: 3,
      title: "Maintenance reminder",
      message: "Scheduled maintenance is coming soon.",
      time: "3 hours ago",
    },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition hover:bg-card hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />

        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
      </button>

      <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-border/60 bg-white shadow-lg">
        <div className="border-b border-border/60 px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">
            Notifications
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            You have {notifications.length} new notifications.
          </p>
        </div>

        <div className="divide-y divide-border/50">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              className="block w-full px-4 py-3 text-left transition hover:bg-slate-50"
            >
              <p className="text-sm font-medium text-slate-900">
                {notification.title}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {notification.message}
              </p>
              <p className="mt-1.5 text-[11px] text-slate-400">
                {notification.time}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}