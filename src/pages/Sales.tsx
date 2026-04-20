import { useState, useEffect } from "react";
import Header from "@/components/Layout/Header";
import BottomNav from "@/components/Layout/BottomNav";
import TicketList from "@/components/Dashboard/TicketList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, X } from "lucide-react";
import React from "react";
import CreateActivityTicketForm from "@/components/CreateActivityTicketForm";
import { getTickets } from "@/lib/api";

const Sales = () => {
  const [openCreateForm, setOpenCreateForm] = React.useState(false);
  const [ticketCounts, setTicketCounts] = useState({
    assigned: 0,
    "in-progress": 0,
    completed: 0,
  });
  const [completedSearchQuery, setCompletedSearchQuery] = useState("");

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [assignedRes, inProgressRes, completedRes] = await Promise.all([
          getTickets({ type: "sales", status: "assigned", pageSize: 1 }),
          getTickets({ type: "sales", status: "in-progress", pageSize: 1 }),
          getTickets({ type: "sales", status: "completed", pageSize: 1 }),
        ]);

        setTicketCounts({
          assigned: assignedRes.success ? assignedRes.data?.total || 0 : 0,
          "in-progress": inProgressRes.success ? inProgressRes.data?.total || 0 : 0,
          completed: completedRes.success ? completedRes.data?.total || 0 : 0,
        });
      } catch (error) {
        console.error("Error fetching ticket counts:", error);
      }
    };

    fetchCounts();
  }, []);

  const getCountBadgeColor = (status: string) => {
    switch (status) {
      case "assigned":
        return "bg-orange-500 text-white";
      case "in-progress":
        return "bg-blue-500 text-white";
      case "completed":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header pageTitle="Hoạt động & Hỗ trợ" />
      
      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="mb-3">
          <Button
            variant="outline"
            onClick={() => setOpenCreateForm(true)}
            className="w-full justify-center bg-white border-primary text-primary hover:bg-primary/5"
          >
            <Plus className="mr-2 h-4 w-4" />
            Tạo mới
          </Button>
        </div>

        <Tabs defaultValue="assigned" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="assigned" className="relative">
              Cần thực hiện
              {ticketCounts.assigned > 0 && (
                <span className={`absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs flex items-center justify-center font-medium ${getCountBadgeColor("assigned")}`}>
                  {ticketCounts.assigned}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="in-progress" className="relative">
              Đang thực hiện
              {ticketCounts["in-progress"] > 0 && (
                <span className={`absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs flex items-center justify-center font-medium ${getCountBadgeColor("in-progress")}`}>
                  {ticketCounts["in-progress"]}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="relative">
              Đã hoàn thành
              {ticketCounts.completed > 0 && (
                <span className={`absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs flex items-center justify-center font-medium ${getCountBadgeColor("completed")}`}>
                  {ticketCounts.completed}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="assigned" className="mt-4">
            <TicketList type="sales" status="assigned" />
          </TabsContent>
          <TabsContent value="in-progress" className="mt-4">
            <TicketList type="sales" status="in-progress" />
          </TabsContent>
          <TabsContent value="completed" className="mt-4">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Tìm kiếm theo tên hoạt động..."
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
            <TicketList type="sales" status="completed" searchQuery={completedSearchQuery} />
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />

      {/* Create Activity Ticket Form */}
      <CreateActivityTicketForm 
        open={openCreateForm} 
        onOpenChange={setOpenCreateForm} 
      />
    </div>
  );
};

export default Sales;