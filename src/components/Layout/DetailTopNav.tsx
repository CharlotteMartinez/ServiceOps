import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Props = {
  title: string;
  onBack?: () => void;
};

const DetailTopNav = ({ title, onBack }: Props) => {
  const navigate = useNavigate();
  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b touch-pan-y">
      <div className="container mx-auto px-4 h-12 flex items-center justify-center relative">
        <button
          aria-label="Quay lại"
          className="absolute left-4 inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted"
          onClick={() => (onBack ? onBack() : navigate(-1))}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="text-base font-semibold tracking-wide text-foreground">{title}</div>
      </div>
    </div>
  );
};

export default DetailTopNav;


