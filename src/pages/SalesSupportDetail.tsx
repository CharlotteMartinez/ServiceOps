import Header from "@/components/Layout/Header";
import DetailTopNav from "@/components/Layout/DetailTopNav";
import React from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TicketDetail as TicketDetailType, fetchActivitySupportTicketDetail, updateActivitySupportInfo, updateActivitySupportResult, fetchActivityTypes, fetchCustomers, Customer } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlarmClock, Building2, MapPin, CheckCircle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CustomerCombobox } from "@/components/ui/customer-combobox";
import { toast } from "sonner";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="shadow-card">
    <CardContent className="p-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
      {children}
    </CardContent>
  </Card>
);

const SalesSupportDetail = () => {
  const { id } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ticket-detail", "sales", id],
    queryFn: async () => (await fetchActivitySupportTicketDetail(id || "")).data as TicketDetailType,
    enabled: Boolean(id),
  });

  // Normalize and map status for consistent UI
  const normalizedStatus = (() => {
    const label = String((data as any)?.statusDisplayLabel ?? "").toLowerCase().trim();
    if (label) {
      if (label.includes("tiếp nhận")) return "received";
      if (label.includes("đang thực hiện") || label.includes("đang xử lý")) return "in-progress";
      if (label.includes("hoàn tất") || label.includes("đã hoàn tất") || label.includes("completed")) return "completed";
      if (label.includes("phân công") || label.includes("assigned")) return "assigned";
    }
    const raw = (data?.status || "").toLowerCase();
    return raw as any;
  })();

  const isInProgress = normalizedStatus === "in-progress";
  const isCompleted = normalizedStatus === "completed";

  const statusDisplay = (() => {
    const apiLabel = (data as any)?.statusDisplayLabel;
    if (typeof apiLabel === "string" && apiLabel.trim()) return apiLabel;
    const s = (data?.status || "").toLowerCase();
    switch (s) {
      case "assigned":
        return "Đã phân công";
      case "in-progress":
        return "Đang thực hiện";
      case "completed":
        return "Hoàn tất";
      case "received":
        return "Đã tiếp nhận";
      default:
        return "";
    }
  })();

  const queryClient = useQueryClient();

  const activityName = React.useMemo(() => {
    const sanitize = (value: any): string => {
      if (!value) return "";
      const str = String(value).trim();
      if (!str || str === "undefined" || str === "null") return "";
      return str;
    };

    const subject = sanitize(data?.activityInfo?.subject);
    const title = sanitize(data?.title);
    const subType = sanitize(data?.subTypeLabel);
    if (subject && subject !== subType) return subject;
    if (title) return title;
    if (subType) return subType;
    return "";
  }, [data]);

  const [openResult, setOpenResult] = React.useState(false);
  const [resultNote, setResultNote] = React.useState("");
  const [openUpdateInfo, setOpenUpdateInfo] = React.useState(false);
  
  // Form state giống form tạo ticket
  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
    customer_name: "",
    customer_record_id: "",
    type: "none",
    deadline: "",
    complete_date: "",
    note: "",
    result: ""
  });
  const [isFormCompleted, setIsFormCompleted] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);

  // Fetch customers - luôn fetch vì cần cho form cập nhật
  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => (await fetchCustomers()).data || [],
  });

  // Fetch activity types giống form tạo
  const { data: activityTypes, isLoading: isLoadingTypes } = useQuery({
    queryKey: ["activity-types"],
    queryFn: async () => (await fetchActivityTypes()).data || [],
    enabled: openUpdateInfo,
  });

  const prefillUpdateInfo = React.useCallback(() => {
    if (!data) {
      toast.error("Đang tải dữ liệu, vui lòng thử lại sau");
      return;
    }

    // Tính toán lại normalizedStatus trong hàm này để đảm bảo tính toán đúng
    const statusLabel = String((data as any)?.statusDisplayLabel ?? "").toLowerCase().trim();
    let currentNormalizedStatus = "";
    if (statusLabel) {
      if (statusLabel.includes("tiếp nhận")) currentNormalizedStatus = "received";
      else if (statusLabel.includes("đang thực hiện") || statusLabel.includes("đang xử lý")) currentNormalizedStatus = "in-progress";
      else if (statusLabel.includes("hoàn tất") || statusLabel.includes("đã hoàn tất") || statusLabel.includes("completed")) currentNormalizedStatus = "completed";
      else if (statusLabel.includes("phân công") || statusLabel.includes("assigned")) currentNormalizedStatus = "assigned";
    }
    if (!currentNormalizedStatus) {
      currentNormalizedStatus = (data?.status || "").toLowerCase();
    }

    // Helper function để filter các giá trị "undefined" string
    const filterUndefined = (value: any): string => {
      if (!value) return "";
      const str = String(value).trim();
      if (str === "undefined" || str === "null" || str === "") return "";
      return str;
    };

    // Tên hoạt động: ưu tiên activityInfo.subject, nhưng phải khác subTypeLabel để tránh nhầm
    // Vì activityInfo.subject có thể bị fallback từ activity_type trong API mapping
    const activityTypeFromData = filterUndefined(data?.subTypeLabel);
    let activityName = filterUndefined(data?.activityInfo?.subject);
    
    // Nếu activityName giống activityType thì có thể bị nhầm, tìm lại từ title
    if (activityName === activityTypeFromData && activityTypeFromData) {
      activityName = filterUndefined(data?.title);
    }
    // Nếu vẫn trống thì dùng title
    if (!activityName) {
      activityName = filterUndefined(data?.title);
    }
    
    const description = filterUndefined(data?.activityInfo?.description);
    const customerName = filterUndefined(data?.customerInfo?.name);
    
    // Tìm customer record-id từ customer name (nếu có customers list)
    let customerRecordId = "";
    if (customers && customers.length > 0 && customerName) {
      const foundCustomer = customers.find(
        (c) => c["customer-name"] === customerName
      );
      customerRecordId = foundCustomer?.["record-id"] || "";
    }
    
    // Loại hoạt động: lấy từ subTypeLabel
    const activityType = activityTypeFromData || "none";
    
    // Xử lý deadline với validation date
    let deadline = "";
    if (data?.deadline) {
      try {
        const deadlineDate = new Date(data.deadline);
        if (!isNaN(deadlineDate.getTime())) {
          deadline = deadlineDate.toISOString().slice(0, 16);
        }
      } catch (e) {
        console.warn("Invalid deadline date:", data.deadline);
      }
    }
    
    const isTicketCompleted = currentNormalizedStatus === "completed" || !!data?.activityInfo?.endTime;
    
    // Xử lý completeDate với validation date
    let completeDate = "";
    if (data?.activityInfo?.endTime) {
      try {
        const completeDateObj = new Date(data.activityInfo.endTime);
        if (!isNaN(completeDateObj.getTime())) {
          completeDate = completeDateObj.toISOString().slice(0, 16);
        }
      } catch (e) {
        console.warn("Invalid complete date:", data.activityInfo.endTime);
      }
    }
    
    // Kết quả (summary) lấy từ data.notes, ghi chú lấy từ activityResult.note
    const note = filterUndefined(data?.activityResult?.note);
    const result = filterUndefined(data?.notes);

    setFormData({
      name: activityName,
      description: description,
      customer_name: customerName,
      customer_record_id: customerRecordId,
      type: activityType || "none",
      deadline: deadline,
      complete_date: completeDate,
      note: note,
      result: result
    });
    setIsFormCompleted(isTicketCompleted);
    setOpenUpdateInfo(true);
  }, [data, customers]);

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

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Vui lòng nhập tên hoạt động");
      return;
    }
    
    if (!formData.customer_name.trim() || !formData.customer_record_id) {
      toast.error("Vui lòng chọn khách hàng");
      return;
    }

    if (!id) {
      toast.error("Không tìm thấy ID ticket");
      return;
    }

    // Validation khi đã hoàn thành
    if (isFormCompleted) {
      if (!formData.complete_date) {
        toast.error("Vui lòng nhập ngày hoàn thành");
        return;
      }
      if (!formData.result?.trim()) {
        toast.error("Vui lòng nhập kết quả hoạt động");
        return;
      }
    }

    setIsUpdating(true);

    try {
      // Submit data format giống y như form tạo ticket
      const submitPayload: Parameters<typeof updateActivitySupportInfo>[1] = {
        name: formData.name,
        description: formData.description || "",
        customer_name: formData.customer_name,
        customer_record_id: formData.customer_record_id,
        type: formData.type === "none" ? "" : formData.type,
        deadline: formData.deadline || "",
        status: isFormCompleted ? "Đã hoàn thành" : "Chưa bắt đầu",
        complete_date: isFormCompleted ? formData.complete_date : undefined,
        result: isFormCompleted ? formData.result : undefined, // Chỉ gửi result nếu đã hoàn thành
        note: formData.note || "",
      };

      const result = await updateActivitySupportInfo(id, submitPayload);

      if (result.success) {
        toast.success("Cập nhật thông tin thành công!");
        queryClient.invalidateQueries({ queryKey: ["ticket-detail", "sales", id] });
        setOpenUpdateInfo(false);
      } else {
        toast.error(result.message || "Cập nhật không thành công");
      }
    } catch (error: any) {
      toast.error(error?.message || "Có lỗi xảy ra khi cập nhật");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCompletedChange = (checked: boolean) => {
    setIsFormCompleted(checked);
    if (checked && !formData.complete_date) {
      const now = new Date();
      const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setFormData(prev => ({ ...prev, complete_date: localDateTime }));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DetailTopNav title="Chi tiết Ticket" />
      <main className="container mx-auto px-4 py-6 pb-24 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {id && (
            <div className="px-3 py-1 rounded-md text-sm font-mono bg-blue-50 text-blue-700 border border-blue-200 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]">#{id}</div>
          )}
          <div className="flex items-center gap-2">
            {/* <Button variant="ghost" size="sm" onClick={() => { prefillUpdateInfo(); setOpenUpdateInfo(true); }}>Cập nhật thông tin</Button> */}
            {statusDisplay ? (
              <Badge variant="secondary" className="shrink-0">{statusDisplay}</Badge>
            ) : null}
          </div>
        </div>
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
        {isError && <div className="text-sm text-red-600">Không tải được thông tin ticket.</div>}
        {data && (
          <div className="space-y-4">
            {/* Khách hàng & Liên hệ */}
            <Section title="Khách hàng & Liên hệ">
              <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.customerInfo?.name && (
                  <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{data.customerInfo.name}</span></div>
                )}
                {data.customerInfo?.contactPhone && (
                  <div className="flex items-center gap-2"><span className="text-muted-foreground">SĐT:</span><span>{data.customerInfo.contactPhone}</span></div>
                )}
                {data.customerInfo?.contactEmail && (
                  <div className="flex items-center gap-2"><span className="text-muted-foreground">Email:</span><span>{data.customerInfo.contactEmail}</span></div>
                )}
                {data.customerInfo?.address && (
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span>{data.customerInfo.address}</span></div>
                )}
              </div>
            </Section>

            {/* Thông tin hoạt động */}
            <Section title="Thông tin hoạt động">
              <div className="text-sm space-y-2">
                {activityName && (<div><span className="text-muted-foreground">Tên hoạt động:</span> <span className="font-medium">{activityName}</span></div>)}
                {data.subTypeLabel && (<div><span className="text-muted-foreground">Loại hoạt động:</span> <span className="font-medium">{data.subTypeLabel}</span></div>)}
                {data.activityInfo?.description && (<div><span className="text-muted-foreground">Mô tả:</span> {data.activityInfo.description}</div>)}
                {data.activityInfo?.owner && (<div><span className="text-muted-foreground">Tên liên hệ:</span> {data.activityInfo.owner}</div>)}
                {data.projectCode && (<div><span className="text-muted-foreground">Đơn hàng liên quan:</span> {data.projectCode}</div>)}
              </div>
            </Section>

            {/* Mốc thời gian */}
            <Section title="Mốc thời gian">
              <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.activityInfo?.startTime && (<div><span className="text-muted-foreground">Tạo lúc:</span> {formatDateTime(data.activityInfo.startTime)}</div>)}
                {data.deadline && (<div><span className="text-muted-foreground">Hạn hoàn thành:</span> <span className="text-orange-600 font-medium">{formatDateTime(data.deadline)}</span></div>)}
                {data.activityInfo?.endTime && (<div><span className="text-muted-foreground">Hoàn tất lúc:</span> {formatDateTime(data.activityInfo.endTime)}</div>)}
              </div>
            </Section>

            {/* Kết quả hoạt động */}
            <Section title="Kết quả hoạt động">
              {data.activityResult?.time || data.activityResult?.note || data.notes ? (
                <div className="text-sm space-y-2">
                  {data.activityResult?.time && <div><span className="text-muted-foreground">Thời gian:</span> {formatDateTime(data.activityResult.time)}</div>}
                  {data.notes && <div><span className="text-muted-foreground">Kết quả:</span> {data.notes}</div>}
                  {data.activityResult?.note && <div><span className="text-muted-foreground">Ghi chú:</span> {data.activityResult.note}</div>}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Chưa có thông tin</span>
              )}
            </Section>
          </div>
        )}
      </main>

      {/* Result dialog */}
      <Dialog open={openResult} onOpenChange={setOpenResult}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ghi nhận kết quả</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea placeholder="Nội dung kết quả..." value={resultNote} onChange={(e) => setResultNote(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpenResult(false)}>Hủy</Button>
              <Button onClick={async () => {
                if (!id) return;
                const res = await updateActivitySupportResult(id, { note: resultNote || undefined });
                if (res.success) {
                  toast.success("Đã ghi nhận kết quả, đang tải lại dữ liệu...");
                  setOpenResult(false);
                  setResultNote("");
                  queryClient.invalidateQueries({ queryKey: ["ticket-detail", "sales", id] });
                } else {
                  toast.error(res.message || "Ghi nhận không thành công");
                }
              }}>
                <CheckCircle className="mr-2" /> Lưu
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update info dialog - giống form tạo ticket */}
      <Dialog open={openUpdateInfo} onOpenChange={setOpenUpdateInfo}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cập nhật thông tin</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            {/* Tên hoạt động */}
            <div className="space-y-2">
              <Label htmlFor="update-name">Tên hoạt động *</Label>
              <Input
                id="update-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nhập tên hoạt động"
                required
              />
            </div>

            {/* Mô tả */}
            <div className="space-y-2">
              <Label htmlFor="update-description">Mô tả</Label>
              <Textarea
                id="update-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Nhập mô tả chi tiết"
                rows={3}
              />
            </div>

            {/* Khách hàng */}
            <div className="space-y-2">
              <Label htmlFor="update-customer">Khách hàng *</Label>
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
              <Label htmlFor="update-type">Loại hoạt động</Label>
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
              <Label htmlFor="update-deadline">Hạn hoàn thành</Label>
              <Input
                id="update-deadline"
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
              />
            </div>

            {/* Checkbox Đã hoàn thành */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="update-completed"
                checked={isFormCompleted}
                onCheckedChange={handleCompletedChange}
              />
              <Label htmlFor="update-completed">Đã hoàn thành</Label>
            </div>

            {/* Ngày hoàn thành - chỉ hiển thị khi checkbox được check */}
            {isFormCompleted && (
              <div className="space-y-2">
                <Label htmlFor="update-complete_date">Ngày hoàn thành</Label>
                <Input
                  id="update-complete_date"
                  type="datetime-local"
                  value={formData.complete_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, complete_date: e.target.value }))}
                  required={isFormCompleted}
                />
              </div>
            )}

            {/* Kết quả - chỉ hiển thị khi checkbox được check */}
            {isFormCompleted && (
              <div className="space-y-2">
                <Label htmlFor="update-result">Kết quả *</Label>
                <Textarea
                  id="update-result"
                  value={formData.result}
                  onChange={(e) => setFormData(prev => ({ ...prev, result: e.target.value }))}
                  placeholder="Nhập kết quả hoạt động"
                  rows={3}
                  required={isFormCompleted}
                />
              </div>
            )}

            {/* Ghi chú */}
            <div className="space-y-2">
              <Label htmlFor="update-note">Ghi chú</Label>
              <Textarea
                id="update-note"
                value={formData.note}
                onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                placeholder="Nhập ghi chú"
                rows={3}
              />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpenUpdateInfo(false)}>
                Hủy
              </Button>
              <Button 
                type="submit" 
                disabled={isUpdating}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {isUpdating ? "Đang lưu..." : "Lưu"}
              </Button>
          </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3 flex items-center gap-2">
          <Button size="lg" variant="outline" className="flex-1" onClick={prefillUpdateInfo}>
            Cập nhật thông tin
          </Button>
          {data && (normalizedStatus === "assigned" || isInProgress) && (
            <Button variant="secondary" size="lg" onClick={() => setOpenResult(true)} className="flex-1">
              <CheckCircle className="mr-2" /> Hoàn tất
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesSupportDetail;


