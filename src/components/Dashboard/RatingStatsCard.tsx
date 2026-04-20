import { Card, CardContent } from "@/components/ui/card";
import RatingStars from "@/components/ui/rating-stars";
import { cn } from "@/lib/utils";

interface RatingStatsCardProps {
  title: string;
  value: string | number;
  rating: number;
  className?: string;
}

const RatingStatsCard = ({ title, value, rating, className }: RatingStatsCardProps) => {
  return (
    <Card className={cn("shadow-card hover:shadow-elevated transition-all duration-300", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <div className="flex items-baseline space-x-2 mb-1">
              <p className="text-2xl font-bold text-foreground">
                {value}
              </p>
            </div>
            <div className="mt-1">
              <RatingStars rating={rating} size="md" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RatingStatsCard;
