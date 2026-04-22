import React, { useState, useRef, useCallback } from "react";
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
import { Paperclip, X, FileText, Camera, FolderOpen } from "lucide-react";

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

  // Attachment state
  interface AttachmentFile {
    name: string;
    type: string;
    size: number;
    base64: string;
    previewUrl?: string; // only for images
  }
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_ATTACHMENTS = 5;
  const ACCEPTED_TYPES = [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  // Auto-resize images before encoding (mirrors MaintenanceDetail pattern)
  const resizeImage = (file: File, maxWidth = 1024, maxHeight = 1024, quality = 0.7): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > height) {
            if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
          } else {
            if (height > maxHeight) { width = (width * maxHeight) / height; height = maxHeight; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("canvas context unavailable")); return; }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("toBlob failed")), "image/jpeg", quality);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const fileToBase64 = async (file: File): Promise<string> => {
    try {
      if (file.type.startsWith("image/")) {
        const blob = await resizeImage(file);
        const resized = new File([blob], file.name, { type: "image/jpeg" });
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(resized);
        });
      }
    } catch (_) { /* fallback below */ }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const valid = fileArray.filter(f => {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        toast.error(`File "${f.name}" không được hỗ trợ`);
        return false;
      }
      return true;
    });
    if (attachments.length + valid.length > MAX_ATTACHMENTS) {
      toast.error(`Tối đa ${MAX_ATTACHMENTS} tệp đính kèm`);
      return;
    }
    const converted = await Promise.all(
      valid.map(async (f) => {
        const base64 = await fileToBase64(f);
        return {
          name: f.name,
          type: f.type.startsWith("image/") ? "image/jpeg" : f.type,
          size: f.size,
          base64,
          previewUrl: f.type.startsWith("image/") ? base64 : undefined,
        } as AttachmentFile;
      })
    );
    setAttachments(prev => [...prev, ...converted]);
  }, [attachments]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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
    setAttachments([]);
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
      attachments: attachments.length > 0 ? attachments.map(a => a.base64) : undefined,
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

          {/* Hình ảnh / Tệp đính kèm */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Paperclip className="h-4 w-4" />
              Hình ảnh/Tệp đính kèm
            </Label>

            {/* Hidden inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-10 gap-2"
                disabled={attachments.length >= MAX_ATTACHMENTS}
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
                Chụp ảnh
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-10 gap-2"
                disabled={attachments.length >= MAX_ATTACHMENTS}
                onClick={() => fileInputRef.current?.click()}
              >
                <FolderOpen className="h-4 w-4" />
                Tải lên hình ảnh/tệp
              </Button>
            </div>

            {/* Preview grid */}
            {attachments.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-1">
                {attachments.map((att, i) => (
                  <div key={i} className="relative">
                    {att.previewUrl ? (
                      <img
                        src={att.previewUrl}
                        alt={att.name}
                        className="w-full aspect-square object-cover rounded-md border"
                      />
                    ) : (
                      <div className="w-full aspect-square flex flex-col items-center justify-center rounded-md border bg-muted gap-1 px-1">
                        <FileText className={`h-6 w-6 ${att.type === "application/pdf" ? "text-red-500" : "text-blue-500"}`} />
                        <p className="text-[10px] text-muted-foreground text-center truncate w-full px-1" title={att.name}>
                          {att.name}
                        </p>
                      </div>
                    )}
                    {/* Remove button — always visible on mobile */}
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
