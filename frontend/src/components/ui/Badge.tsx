import React from "react";
import { clsx } from "clsx";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "danger" | "info" | "gray";
  size?: "sm" | "md";
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "gray",
  size = "sm",
}) => {
  const variants = {
    success: "bg-green-50 text-green-700 ring-green-600/20",
    warning: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
    danger: "bg-red-50 text-red-700 ring-red-600/20",
    info: "bg-red-50 text-red-700 ring-red-600/20",
    gray: "bg-gray-50 text-gray-600 ring-gray-500/10",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full font-medium ring-1 ring-inset",
        variants[variant],
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
      )}
    >
      {children}
    </span>
  );
};

export default Badge;
