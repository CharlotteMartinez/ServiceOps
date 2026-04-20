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
import { Paperclip, X, FileText, Upload } from "lucide-react";

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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE_MB = 5;
  const ACCEPTED_TYPES = [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string); // data:mime;base64,...
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const valid = fileArray.filter(f => {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        toast.error(`File "${f.name}" không được hỗ trợ`);
        return false;
      }
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast.error(`File "${f.name}" vượt quá ${MAX_FILE_SIZE_MB}MB`);
        return false;
      }
      return true;
    });
    if (attachments.length + valid.length > 5) {
      toast.error("Tối đa 5 tệp đính kèm");
      return;
    }
    const converted = await Promise.all(
      valid.map(async (f) => {
        const base64 = await fileToBase64(f);
        return {
          name: f.name,
          type: f.type,
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
    e.target.value = ""; // reset so same file can be re-added after removal
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
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
              <span className="text-xs text-muted-foreground font-normal">(tối đa 5 tệp, mỗi tệp ≤ 5&nbsp;MB)</span>
            </Label>

            {/* Drop zone */}
            <div
              className={`relative border-2 border-dashed rounded-lg px-4 py-5 text-center transition-colors cursor-pointer ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-muted-foreground/30 hover:border-blue-400 hover:bg-blue-50/40"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={handleFileChange}
              />
              <Upload className="h-7 w-7 mx-auto mb-1.5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Kéo thả file vào đây hoặc{" "}
                <span className="text-blue-500 font-medium">chọn tệp</span>
              </p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                Hỗ trợ: JPG, PNG, GIF, WEBP, PDF, DOC, DOCX, XLS, XLSX
              </p>
            </div>

            {/* Preview grid */}
            {attachments.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {attachments.map((att, i) => (
                  <div
                    key={i}
                    className="relative flex items-center gap-2 border rounded-md p-2 bg-muted/30 group"
                  >
                    {/* Thumbnail or file icon */}
                    {att.previewUrl ? (
                      <img
                        src={att.previewUrl}
                        alt={att.name}
                        className="h-10 w-10 object-cover rounded shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 flex items-center justify-center rounded bg-muted shrink-0">
                        {att.type === "application/pdf" ? (
                          <FileText className="h-5 w-5 text-red-500" />
                        ) : (
                          <FileText className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                    )}
                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" title={att.name}>{att.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(att.size)}</p>
                    </div>
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeAttachment(i); }}
                      className="absolute top-1 right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Xóa"
                    >
                      <X className="h-2.5 w-2.5" />
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
