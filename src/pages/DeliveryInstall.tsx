import { useState } from "react";
import Header from "@/components/Layout/Header";
import BottomNav from "@/components/Layout/BottomNav";
import TicketList from "@/components/Dashboard/TicketList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

const DeliveryInstall = () => {
  const [completedSearchQuery, setCompletedSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <Header pageTitle="Giao hàng & Lắp đặt" />

      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        <Tabs defaultValue="assigned" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="assigned" className="relative">
              Tiếp nhận
            </TabsTrigger>
            <TabsTrigger value="in-progress" className="relative">
              Đang thực hiện
              {/* {ticketCounts["in-progress"] > 0 && (
                <span className={`absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs flex items-center justify-center font-medium ${getCountBadgeColor("in-progress")}`}>
                  {ticketCounts["in-progress"]}
                </span>
              )} */}
            </TabsTrigger>
            <TabsTrigger value="completed" className="relative">
              Đã hoàn thành
              {/* {ticketCounts.completed > 0 && (
                <span className={`absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs flex items-center justify-center font-medium ${getCountBadgeColor("completed")}`}>
                  {ticketCounts.completed}
                </span>
              )} */}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assigned" className="mt-4">
            <TicketList type="delivery" status="assigned" />
          </TabsContent>
          <TabsContent value="in-progress" className="mt-4">
            <TicketList type="delivery" status="in-progress" />
          </TabsContent>
          <TabsContent value="completed" className="mt-4">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Tìm kiếm theo tên khách hàng..."
                  value={completedSearchQuery}
                  onChange={(e) => setCompletedSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {completedSearchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
                    onClick={() => setCompletedSearchQuery("")}
                    aria-label="Xóa tìm kiếm"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            </div>
            <TicketList type="delivery" status="completed" searchQuery={completedSearchQuery} />
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

export default DeliveryInstall;