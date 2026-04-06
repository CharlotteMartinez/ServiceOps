import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchActivityTypes, fetchCustomers, createActivitySupportTicket, CreateActivitySupportTicketInput, Customer } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CustomerCombobox } from "@/components/ui/customer-combobox";
import { toast } from "sonner";

const STATUS_OPTIONS = ["Chưa bắt đầu", "Đang thực hiện", "Đã hoàn thành"] as const;

const getLocalDateTimeInputValue = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

interface CreateActivityTicketFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateActivityTicketForm: React.FC<CreateActivityTicketFormProps> = ({ open, onOpenChange }) => {
  const queryClient = useQueryClient();
  
  // Form state
  const [formData, setFormData] = useState<CreateActivitySupportTicketInput>({
    name: "",
    description: "",
    customer_name: "",
    customer_record_id: "",
    type: "none",
    deadline: "",
    status: "Chưa bắt đầu",
    complete_date: "",
    note: "",
    result: ""
  });
  const isCompleted = formData.status === "Đã hoàn thành";

  // Fetch customers
  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => (await fetchCustomers()).data || [],
    enabled: open,
  });

  // Fetch activity types
  const { data: activityTypes, isLoading: isLoadingTypes } = useQuery({
    queryKey: ["activity-types"],
    queryFn: async () => (await fetchActivityTypes()).data || [],
    enabled: open,
  });

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: createActivitySupportTicket,
    onSuccess: () => {
      toast.success("Tạo ticket thành công!");
      queryClient.invalidateQueries({ queryKey: ["tickets", "sales"] });
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Có lỗi xảy ra khi tạo ticket");
    },
  });

  const handleClose = () => {
    setFormData({
      name: "",
      description: "",
      customer_name: "",
      customer_record_id: "",
      type: "none",
      deadline: "",
      status: "Chưa bắt đầu",
      complete_date: "",
      note: "",
      result: ""
    });
    onOpenChange(false);
  };

  const handleCustomerSelect = (customer: Customer | null) => {
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customer_name: customer["customer-name"],
        customer_record_id: customer["record-id"]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        customer_name: "",
        customer_record_id: ""
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Vui lòng nhập tên hoạt động");
      return;
    }
    
    if (!formData.customer_name.trim() || !formData.customer_record_id) {
      toast.error("Vui lòng chọn khách hàng");
      return;
    }

    // Validation khi đã hoàn thành
    if (isCompleted) {
      if (!formData.complete_date) {
        toast.error("Vui lòng nhập ngày hoàn thành");
        return;
      }
      if (!formData.result?.trim()) {
        toast.error("Vui lòng nhập kết quả hoạt động");
        return;
      }
    }

    const submitData = {
      ...formData,
      type: formData.type === "none" ? "" : formData.type,
      status: formData.status,
      complete_date: isCompleted ? formData.complete_date : undefined,
      result: isCompleted ? formData.result : undefined, // Chỉ gửi result nếu đã hoàn thành
    };

    createTicketMutation.mutate(submitData);
  };

  const handleStatusChange = (value: string) => {
    const nextStatus = value as (typeof STATUS_OPTIONS)[number];
    setFormData((prev) => {
      const isStatusCompleted = nextStatus === "Đã hoàn thành";
      return {
        ...prev,
        status: nextStatus,
        complete_date: isStatusCompleted ? prev.complete_date || getLocalDateTimeInputValue() : "",
        result: isStatusCompleted ? prev.result : "",
      };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Tạo Ticket Hoạt động & Hỗ trợ</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tên hoạt động */}
          <div className="space-y-2">
            <Label htmlFor="name">Tên hoạt động *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nhập tên hoạt động"
              required
            />
          </div>

          {/* Mô tả */}
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Nhập mô tả chi tiết"
              rows={3}
            />
          </div>

          {/* Khách hàng */}
          <div className="space-y-2">
            <Label htmlFor="customer">Khách hàng *</Label>
            {isLoadingCustomers ? (
              <Input disabled placeholder="Đang tải danh sách khách hàng..." />
            ) : (
              <CustomerCombobox
                customers={customers || []}
                value={formData.customer_record_id}
                onSelect={handleCustomerSelect}
                placeholder="Chọn khách hàng..."
              />
            )}
          </div>

          {/* Loại hoạt động */}
          <div className="space-y-2">
            <Label htmlFor="type">Loại hoạt động</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn loại hoạt động" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingTypes ? (
                  <SelectItem value="loading" disabled>Đang tải...</SelectItem>
                ) : (
                  <>
                    <SelectItem value="none">-- Chọn loại hoạt động --</SelectItem>
                    {activityTypes?.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Hạn hoàn thành */}
          <div className="space-y-2">
            <Label htmlFor="deadline">Hạn hoàn thành</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
            />
          </div>

          {/* Trạng thái */}
          <div className="space-y-2">
            <Label htmlFor="status">Trạng thái *</Label>
            <Select value={formData.status} onValueChange={handleStatusChange}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ngày hoàn thành - chỉ hiển thị khi trạng thái là Đã hoàn thành */}
          {isCompleted && (
            <div className="space-y-2">
              <Label htmlFor="complete_date">Ngày hoàn thành</Label>
              <Input
                id="complete_date"
                type="datetime-local"
                value={formData.complete_date}
                onChange={(e) => setFormData(prev => ({ ...prev, complete_date: e.target.value }))}
                required={isCompleted}
              />
            </div>
          )}

          {/* Kết quả - chỉ hiển thị khi trạng thái là Đã hoàn thành */}
          {isCompleted && (
            <div className="space-y-2">
              <Label htmlFor="result">Kết quả *</Label>
              <Textarea
                id="result"
                value={formData.result}
                onChange={(e) => setFormData(prev => ({ ...prev, result: e.target.value }))}
                placeholder="Nhập kết quả hoạt động"
                rows={3}
                required={isCompleted}
              />
            </div>
          )}

          {/* Ghi chú */}
          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
              placeholder="Nhập ghi chú"
              rows={3}
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Hủy
            </Button>
            <Button 
              type="submit" 
              disabled={createTicketMutation.isPending}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {createTicketMutation.isPending ? "Đang tạo..." : "Tạo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateActivityTicketForm;
