import { CheckCircle, MapPin } from "lucide-react";
import Header from "@/components/Layout/Header";
import BottomNav from "@/components/Layout/BottomNav";
import StatsCard from "@/components/Dashboard/StatsCard";
import RatingStatsCard from "@/components/Dashboard/RatingStatsCard";
import DonutStatsCard from "@/components/Dashboard/DonutStatsCard";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { useNavigate } from "react-router-dom";
import { getPerformanceMetrics, getUnassignedTickets } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const navigate = useNavigate();
  
  // Get performance metrics
  const { data: performanceData, isLoading: isPerformanceLoading } = useQuery({
    queryKey: ["performance-metrics"],
    queryFn: async () => {
      const res = await getPerformanceMetrics();
      if (!res.success || !res.data) {
        throw new Error(res.message || "Không tải được thông số hiệu suất");
      }
      return res.data;
    },
  });

  // Get unassigned tickets
  const { data: unassignedTicketsData, isLoading: isUnassignedLoading } = useQuery({
    queryKey: ["unassigned-tickets"],
    queryFn: async () => {
      const res = await getUnassignedTickets();
      if (!res.success || !res.data) {
        throw new Error(res.message || "Không tải được danh sách ticket chưa phân công");
      }
      return res.data;
    },
  });

  // Debug: log unassigned tickets
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      console.debug('[Index] unassignedTicketsData:', unassignedTicketsData);
    }
  }, [unassignedTicketsData]);

  const isLoading = isPerformanceLoading || isUnassignedLoading;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Main Content */}  
      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-hero rounded-lg p-6 text-white mb-6">
            <h1 className="text-2xl font-bold mb-2">
              Chào mừng, Kỹ thuật viên!
            </h1>
            <p className="text-blue-100">
              O.S.I có <span className="font-semibold">{unassignedTicketsData?.total || 0} ticket</span> chưa được phân công
            </p>
          </div>
        </div>

        {/* Stats Grid - Layout theo hình ảnh: 1 lớn ở trên, 2 nhỏ ở dưới */}
        <div className="mb-8">
          {/* Card lớn - Ticket hoàn thành */}
          <div className="mb-4">
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <StatsCard
                title="Ticket hoàn thành trong tháng"
                value={performanceData?.tickets_completed ?? 0}
                icon={CheckCircle}
              />
            )}
          </div>
          
          {/* 2 cards nhỏ */}
          <div className="grid grid-cols-2 gap-4">
            {isLoading ? (
              <>
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </>
            ) : (
              <>
                {(() => {
                  const avg = Number(performanceData?.avg_customer_rating ?? 0);
                  const oneDecimal = Math.round(avg * 10) / 10; // e.g. 3.33 -> 3.3
                  return (
                    <RatingStatsCard
                      title="Đánh giá TB"
                      value={oneDecimal.toFixed(1)}
                      rating={oneDecimal}
                    />
                  );
                })()}
                <DonutStatsCard title="Phản hồi nhanh" percentage={performanceData?.quick_response_rate ?? 0} />
              </>
            )}
          </div>
        </div>


        {/* Unassigned Ticket List */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Ticket chưa được phân công</h2>
        </div>
        {isUnassignedLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : unassignedTicketsData?.items && unassignedTicketsData.items.length > 0 ? (
          <div className="space-y-4">
            {unassignedTicketsData.items.map((ticket) => (
              <div
                key={ticket.id}
                className="p-4 rounded-lg border hover:shadow-card transition-all duration-200 cursor-pointer"
                onClick={() => {
                  const base = ticket.type === 'delivery' ? '/delivery-install' : ticket.type === 'maintenance' ? '/maintenance' : '/sales';
                  navigate(`${base}/${ticket.id}`);
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      ticket.type === 'delivery' ? 'bg-blue-100 text-blue-800' :
                      ticket.type === 'maintenance' ? 'bg-orange-100 text-orange-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {ticket.type === 'delivery' ? 'Giao hàng' : 
                       ticket.type === 'maintenance' ? 'Bảo trì' : 'Kinh doanh'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-muted-foreground">
                      {ticket.id}
                    </span>
                  </div>
                </div>
                
                <h4 className="font-semibold text-foreground mb-2">
                  {ticket.title}
                </h4>
                {ticket.address ? (
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground mb-1">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{ticket.address}</span>
                  </div>
                ) : null}
                
                <div className="flex items-center justify-end mt-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800">
                    Chưa phân công
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Không có ticket chưa được phân công.</div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
