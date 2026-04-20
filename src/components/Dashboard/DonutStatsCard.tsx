import { Card, CardContent } from "@/components/ui/card";
import DonutChart from "@/components/ui/donut-chart";
import { cn } from "@/lib/utils";

interface DonutStatsCardProps {
  title: string;
  percentage: number;
  className?: string;
}

const DonutStatsCard = ({ title, percentage, className }: DonutStatsCardProps) => {
  return (
    <Card className={cn("shadow-card hover:shadow-elevated transition-all duration-300", className)}>
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center">
          <p className="text-sm font-medium text-muted-foreground mb-4">
            {title}
          </p>
          <DonutChart percentage={percentage} size="sm" />
        </div>
      </CardContent>
    </Card>
  );
};

export default DonutStatsCard;
