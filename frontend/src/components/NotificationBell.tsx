import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "../hooks/useNotifications";

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data, isLoading } = useNotifications();
  const markAsRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = (id: string, status: string, appointmentId: string | null) => {
    if (status === "PENDING") {
      markAsRead.mutate(id);
    }
    if (appointmentId) {
      setIsOpen(false);
      navigate({
        to: "/doctor/appointments/$appointmentId",
        params: { appointmentId },
      });
    }
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full transition-colors relative flex items-center justify-center"
        title="Notifications"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined text-[22px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-error text-on-error rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface dark:bg-surface-container-high border border-outline-variant rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 border-b border-outline-variant/60 flex items-center justify-between bg-surface-container-lowest dark:bg-surface-container-low">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">notifications_active</span>
              <h4 className="text-title-sm font-bold text-on-surface">Notifications</h4>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-label-sm font-bold rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markAllRead.isPending}
                className="text-label-sm font-medium text-primary hover:underline transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-outline-variant/30">
            {isLoading ? (
              <div className="p-6 text-center text-secondary text-body-sm">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-outline text-[32px]">notifications_off</span>
                <p className="text-body-sm text-secondary font-medium">No notifications yet</p>
                <p className="text-label-sm text-secondary/70">
                  New appointment requests and updates will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = n.status === "PENDING";
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n.id, n.status, n.appointmentId)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                      isUnread
                        ? "bg-primary-container/15 hover:bg-primary-container/25"
                        : "hover:bg-surface-container-low"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        isUnread
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-high text-secondary"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {n.type === "APPOINTMENT_CONFIRMED" ? "event_available" : "notifications"}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-label-md truncate ${isUnread ? "font-bold text-on-surface" : "font-medium text-secondary"}`}>
                          {n.subject || "Appointment Update"}
                        </p>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-body-sm text-on-surface-variant line-clamp-2 mt-0.5">
                        {n.body}
                      </p>
                      <p className="text-label-sm text-secondary/60 mt-1">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
