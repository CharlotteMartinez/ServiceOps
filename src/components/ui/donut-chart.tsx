import { cn } from "@/lib/utils";

interface DonutChartProps {
  percentage: number;
  size?: "sm" | "md" | "lg";
  strokeWidth?: number;
  className?: string;
}

const DonutChart = ({ percentage, size = "md", strokeWidth = 8, className }: DonutChartProps) => {
  const sizeClasses = {
    sm: "h-12 w-12",
    md: "h-16 w-16", 
    lg: "h-20 w-20"
  };

  const radius = size === "sm" ? 20 : size === "md" ? 28 : 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Percentage text */}
      <div className="text-center">
        <span className="text-2xl font-bold text-foreground">
          {percentage}%
        </span>
      </div>
      
      {/* Donut chart */}
      <div className={cn("relative", sizeClasses[size])}>
        <svg className="absolute inset-0 transform -rotate-90" width="100%" height="100%">
          {/* Background circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted-foreground/20"
          />
          {/* Progress circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-primary transition-all duration-500 ease-out"
          />
        </svg>
      </div>
    </div>
  );
};

export default DonutChart;
