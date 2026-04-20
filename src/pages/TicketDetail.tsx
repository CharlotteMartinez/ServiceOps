import Header from "@/components/Layout/Header";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getTicketDetail, TicketDetail as TicketDetailType } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, Phone, Clock, MapPin, Package, Wrench } from "lucide-react";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="shadow-card">
    <CardContent className="p-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
      {children}
    </CardContent>
  </Card>
);

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ticket-detail", id],
    queryFn: async () => (await getTicketDetail(id || "")).data as TicketDetailType,
    enabled: Boolean(id),
  });

  return (
    <div className="min-h-screen bg-background">
      <Header pageTitle={`Chi tiết Ticket ${id || ""}`} />

      <main className="container mx-auto px-4 py-6 space-y-4">
        {/* Navigation Back */}
        <div className="flex items-center space-x-2 mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại danh sách</span>
          </Button>
        </div>

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {isError && (
          <div className="text-sm text-red-600">Không tải được thông tin ticket.</div>
        )}

        {data && (
          <div className="space-y-4">
            {/* Ticket Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Chi tiết Ticket</h1>
                <p className="text-muted-foreground">Ticket #{id}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default" className="bg-blue-600 text-white">
                  Đã tiếp nhận
                </Badge>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <Button className="flex-1 sm:flex-none">
                Tiếp nhận công việc
              </Button>
              <Button variant="outline" className="flex-1 sm:flex-none">
                Tiếp theo...
              </Button>
              <Button variant="default" className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700">
                Cập nhật trạng thái
              </Button>
            </div>

            {/* Note Section */}
            <Card className="shadow-card">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Ghi chú</h3>
                <div className="space-y-3">
                  <textarea 
                    placeholder="Thêm ghi chú..." 
                    className="w-full min-h-[100px] p-3 border rounded-lg resize-none"
                  />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" className="flex-1 sm:flex-none">
                      Lưu ghi chú
                    </Button>
                    <Button variant="outline" className="flex-1 sm:flex-none">
                      Choose Files
                    </Button>
                    <span className="text-sm text-muted-foreground self-center">No file chosen</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Section title="Thông tin khách hàng">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{data.customerInfo?.name || "Công ty ABC"}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{data.customerInfo?.contactPhone || "0901 234 567"}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Hạn: 9/28/2025</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{data.customerInfo?.address || "123 Nguyễn Huệ, Q1, TP.HCM"}</span>
                </div>
              </div>
            </Section>

            {/* Order Information */}
            {data.orderInfo && (
              <Section title="Thông tin đơn hàng">
                <div className="space-y-3">
                  <div className="text-sm">
                    <span className="font-medium">Mã đơn hàng:</span> {data.orderInfo.orderCode || "SO-1001"}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Danh sách hàng hóa:</span> ({data.orderInfo.itemsCount || 1})
                  </div>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">MH-01 Máy phân tích</span>
                        </div>
                        <span className="text-sm font-medium">x1</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </Section>
            )}

            {/* Device Information */}
            {data.deviceInfo && data.deviceInfo.length > 0 && (
              <Section title="Thiết bị">
                <div className="space-y-2">
                  {data.deviceInfo.map((d, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {d.model || "Analyzer X"} {d.serial ? `- SN ${d.serial}` : "- SN SN123"}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Notes */}
            {data.notes && (
              <Section title="Ghi chú">
                <div className="text-sm">{data.notes}</div>
              </Section>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default TicketDetail;


