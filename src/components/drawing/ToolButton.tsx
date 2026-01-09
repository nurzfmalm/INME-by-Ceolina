import { ReactNode } from "react";

interface ToolButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  variant?: "default" | "danger" | "success" | "primary";
  className?: string;
}

/**
 * Кнопка инструмента
 * Крупная, чёткая, с понятной иконкой и лейблом
 */
export const ToolButton = ({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
  variant = "default",
  className = ""
}: ToolButtonProps) => {
  const variantStyles = {
    default: active 
      ? "bg-primary/10 ring-2 ring-primary text-primary" 
      : "bg-white hover:bg-gray-50 text-gray-700",
    danger: "bg-white hover:bg-red-50 text-gray-700 hover:text-red-600",
    success: "bg-green-500 hover:bg-green-600 text-white shadow-md",
    primary: "bg-primary hover:bg-primary/90 text-white shadow-md",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-3 
        px-4 py-3 
        rounded-xl 
        transition-all duration-200
        touch-manipulation
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${className}
      `}
    >
      <div className="w-8 h-8 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
};
