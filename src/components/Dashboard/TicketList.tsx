import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Package, FileText } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getTickets, TicketStatus, TicketSummary, TicketType } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type Ticket = TicketSummary;

const getTypeColor = (type: Ticket['type']) => {
  switch (type) {
    case 'delivery': return 'bg-blue-100 text-blue-800';
    case 'maintenance': return 'bg-orange-100 text-orange-800';
    case 'sales': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getTypeLabel = (type: Ticket['type']) => {
  switch (type) {
    case 'delivery': return 'Giao hàng';
    case 'maintenance': return 'Bảo trì';
    case 'sales': return 'Kinh doanh';
    default: return 'Khác';
  }
};

const getStatusColor = (status: Ticket['status']) => {
  switch (status) {
    case 'assigned': return 'bg-orange-100 text-orange-800';
    case 'in-progress': return 'bg-blue-100 text-blue-800';
    case 'completed': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusLabel = (status: Ticket['status']) => {
  switch (status) {
    case 'assigned': return 'Đã phân công';
    case 'in-progress': return 'Đang thực hiện';
    case 'completed': return 'Đã hoàn thành';
    default: return 'Trạng thái';
  }
};


type Props = {
  type?: TicketType;
  status?: TicketStatus;
  searchQuery?: string; // Optional search query for filtering by customer name
};

const TicketList = ({ type, status, searchQuery }: Props) => {
  const navigate = useNavigate();
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["tickets", { type, status }],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await getTickets({ type, status, page: Number(pageParam), pageSize: 20 });
      if (!res.success || !res.data) {
        throw new Error(res.message || "Không tải được danh sách ticket");
      }
      return res.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.reduce((sum, p) => sum + (p?.items?.length || 0), 0);
      const total = lastPage?.total ?? totalLoaded;
      return totalLoaded < total ? allPages.length + 1 : undefined;
    },
  });
  const allTickets = ((data?.pages || []).flatMap((p) => p?.items || []) || []) as Ticket[];

  // Filter tickets based on searchQuery
  // For maintenance tickets: search by device serial, device model, or customer name
  // For sales tickets: search by activity name (title) or description
  // For delivery tickets: search by customer name
  const list = searchQuery?.trim()
    ? allTickets.filter((ticket) => {
      const query = searchQuery.toLowerCase().trim();
      if (type === "maintenance") {
        // For maintenance tickets, search in device serial, device model, and customer name
        const matchesSerial = (ticket as any).deviceSerial?.toLowerCase().includes(query);
        const matchesModel = (ticket as any).deviceModel?.toLowerCase().includes(query);
        const matchesCustomer = ticket.customer?.toLowerCase().includes(query);
        const matchesTitle = ticket.title?.toLowerCase().includes(query);
        return matchesSerial || matchesModel || matchesCustomer || matchesTitle;
      } else if (type === "sales") {
        // For sales tickets, search in activity name (title) and description
        const matchesTitle = ticket.title?.toLowerCase().includes(query);
        const matchesDescription = ticket.description?.toLowerCase().includes(query);
        return matchesTitle || matchesDescription;
      } else {
        // For delivery tickets, search by customer name
        return ticket.customer?.toLowerCase().includes(query);
      }
    })
    : allTickets;
  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}
      {isError && (
        <div className="text-sm text-red-600">Không tải được danh sách ticket.</div>
      )}
      {!isLoading && !isError && list.length === 0 && (
        <div className="text-sm text-muted-foreground">
          {searchQuery?.trim()
            ? type === "maintenance"
              ? `Không tìm thấy ticket nào với serial/model/dòng sản phẩm "${searchQuery}"`
              : type === "sales"
                ? `Không tìm thấy ticket nào với tên hoạt động "${searchQuery}"`
                : `Không tìm thấy ticket nào với tên khách hàng "${searchQuery}"`
            : "Không có ticket phù hợp."}
        </div>
      )}
      {list.map((ticket) => (
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
              <Badge className={cn("text-xs", getTypeColor(ticket.type))}>
                {ticket.subTypeLabel || getTypeLabel(ticket.type)}
              </Badge>
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

          <div className="flex flex-col space-y-2 text-sm text-muted-foreground">
            {ticket.type === 'sales' ? (
              <div className="flex items-start space-x-1">
                <FileText className="h-4 w-4 mt-0.5" />
                <span className="line-clamp-2">
                  {String((ticket as any).description || '').split(/\s+/).slice(0, 20).join(' ')}
                  {(((ticket as any).description || '').split(/\s+/).length || 0) > 20 ? '…' : ''}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span className="truncate">{ticket.address}</span>
              </div>
            )}
            {/* {Array.isArray((ticket as any).products) && (ticket as any).products.length > 0 && (
              <div className="flex items-start space-x-1">
                <Package className="h-4 w-4 mt-0.5" />
                <div className="flex-1">
                  {((ticket as any).products as string[]).slice(0, 2).map((p, idx) => (
                    <div key={idx} className="truncate">{p}</div>
                  ))}
                  {((ticket as any).products as string[]).length > 2 && (
                    <div className="text-xs text-primary">see more…</div>
                  )}
                </div>
              </div>
            )} */}
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-1 text-sm">
              <Clock className={cn("h-4 w-4", ticket.type === 'maintenance' ? "text-primary" : "text-orange-500")} />
              <span className={cn("font-medium", ticket.type === 'maintenance' ? "text-primary" : "text-orange-600")}>
                {ticket.type === 'maintenance' ? 'Yêu cầu lúc:' : 'Hạn:'} {formatDateTime(ticket.deadline)}
              </span>
            </div>
            <Badge className={cn("text-xs", getStatusColor(ticket.status))}>
              {(ticket as any).statusDisplayLabel || getStatusLabel(ticket.status)}
            </Badge>
          </div>
        </div>
      ))}
      {hasNextPage && !isLoading && !isError && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? "Đang tải..." : "Tải thêm"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default TicketList;