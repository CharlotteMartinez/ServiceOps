import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const RatingStars = ({ rating, maxRating = 5, size = "md", className }: RatingStarsProps) => {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4", 
    lg: "h-5 w-5"
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: maxRating }, (_, index) => {
        const starRating = index + 1;
        const isFilled = starRating <= rating;
        const isHalfFilled = starRating - 0.5 <= rating && starRating > rating;
        
        return (
          <Star
            key={index}
            className={cn(
              sizeClasses[size],
              isFilled || isHalfFilled 
                ? "fill-primary text-primary" 
                : "fill-muted text-muted-foreground"
            )}
          />
        );
      })}
    </div>
  );
};

export default RatingStars;
