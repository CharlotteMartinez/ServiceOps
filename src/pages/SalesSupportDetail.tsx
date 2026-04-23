import Header from "@/components/Layout/Header";
import DetailTopNav from "@/components/Layout/DetailTopNav";
import React, { useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TicketDetail as TicketDetailType, fetchActivitySupportTicketDetail, updateActivitySupportInfo, updateActivitySupportResult, fetchActivityTypes, fetchCustomers, Customer } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlarmClock, Building2, MapPin, CheckCircle, Paperclip, FileText, X, ChevronLeft, ChevronRight, Camera, FolderOpen } from "lucide-react";
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
  const [isSubmittingResult, setIsSubmittingResult] = React.useState(false);

  // Prefill file đã lưu vào dialog Ghi nhận kết quả mỗi khi mở
  React.useEffect(() => {
    if (openResult) {
      const existing = (attachmentsMeta || []).map(m => ({
        kind: 'existing' as const,
        url: m.url,
        name: m.name || '',
        type: m.type || '',
        token: m.token || '',
      }));
      setResultDialogAttachments(existing);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openResult]);

  // ---- DialogAttachment: union type cho file đã lưu (existing) và file mới (new) ----
  type DialogAttachment =
    | { kind: 'existing'; url: string; name: string; type: string; token: string }
    | { kind: 'new'; name: string; type: string; size: number; base64: string; previewUrl?: string };

  // ---- Attachment state cho dialog Hoàn tất ----
  const [resultDialogAttachments, setResultDialogAttachments] = React.useState<DialogAttachment[]>([]);
  const resultCameraRef = useRef<HTMLInputElement>(null);
  const resultFileRef = useRef<HTMLInputElement>(null);

  // Lightbox state cho ảnh đính kèm
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  // Attachment meta list: [{url, name, type}] cho display
  const attachmentsMeta = React.useMemo(() => {
    const meta = data?.activityResult?.attachmentsMeta;
    if (Array.isArray(meta) && meta.length > 0) {
      return meta.filter(m => m.url && m.url !== "undefined" && m.url !== "null");
    }
    // fallback: nếu chưa có meta, dùng imageUrls cũ — detect type từ URL/tên file
    const urls = data?.activityResult?.imageUrls || [];
    return urls
      .filter(u => u && u !== "undefined" && u !== "null")
      .map(url => {
        const fileName = url.split("/").pop()?.split("?")[0] || "";
        let type = "";
        if (/\.(jpe?g|jpg|png|gif|webp|bmp)$/i.test(fileName)) type = "image/jpeg";
        else if (/\.pdf$/i.test(fileName)) type = "application/pdf";
        else if (/\.docx?$/i.test(fileName)) type = "application/msword";
        else if (/\.xlsx?$/i.test(fileName)) type = "application/vnd.ms-excel";
        return { url, name: fileName, type };
      });
  }, [data]);

  // Chỉ lấy những item là ảnh để lightbox
  const lightboxImageMeta = React.useMemo(
    () => attachmentsMeta.filter(m => m.type.startsWith("image/")),
    [attachmentsMeta]
  );

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

  // ---- Attachment state cho dialog Cập nhật ----
  const [updateDialogAttachments, setUpdateDialogAttachments] = React.useState<DialogAttachment[]>([]);
  const updateCameraRef = useRef<HTMLInputElement>(null);
  const updateFileRef = useRef<HTMLInputElement>(null);
  const MAX_ATTACHMENTS = 5;
  const MAX_FILE_SIZE_MB = 5;
  const MAX_TOTAL_SIZE_MB = 10;
  const ACCEPTED_TYPES = [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

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
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("canvas unavailable")); return; }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("toBlob failed")), "image/jpeg", quality);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const fileToBase64Update = async (file: File): Promise<string> => {
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

  // Helper: convert file sang DialogAttachment kind='new'
  const convertFilesToNew = async (files: File[]): Promise<DialogAttachment[]> =>
    Promise.all(files.map(async (f) => {
      const base64 = await fileToBase64Update(f);
      return {
        kind: 'new' as const,
        name: f.name,
        type: f.type.startsWith("image/") ? "image/jpeg" : f.type,
        size: f.size,
        base64,
        previewUrl: f.type.startsWith("image/") ? base64 : undefined,
      };
    }));

  // Helper: validate và lọc files trước khi thêm
  const validateFiles = (files: File[], currentList: DialogAttachment[]): File[] => {
    const newCount = currentList.filter(a => a.kind === 'new').length;
    return files.filter(f => {
      if (!ACCEPTED_TYPES.includes(f.type)) { toast.error(`File "${f.name}" không được hỗ trợ`); return false; }
      const sizeMB = f.size / (1024 * 1024);
      if (sizeMB > MAX_FILE_SIZE_MB) { toast.error(`File "${f.name}" quá lớn (${sizeMB.toFixed(1)}MB). Tối đa ${MAX_FILE_SIZE_MB}MB/file`); return false; }
      return true;
    }).filter((_, i) => {
      if (newCount + i >= MAX_ATTACHMENTS) { if (i === 0) toast.error(`Tối đa ${MAX_ATTACHMENTS} tệp đính kèm`); return false; }
      return true;
    });
  };

  const processUpdateFiles = useCallback(async (files: FileList | File[]) => {
    const valid = validateFiles(Array.from(files), updateDialogAttachments);
    if (!valid.length) return;
    const converted = await convertFilesToNew(valid);
    setUpdateDialogAttachments(prev => [...prev, ...converted]);
  }, [updateDialogAttachments]);

  const handleUpdateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processUpdateFiles(e.target.files);
    e.target.value = "";
  };

  const processResultFiles = useCallback(async (files: FileList | File[]) => {
    const valid = validateFiles(Array.from(files), resultDialogAttachments);
    if (!valid.length) return;
    const converted = await convertFilesToNew(valid);
    setResultDialogAttachments(prev => [...prev, ...converted]);
  }, [resultDialogAttachments]);

  const handleResultFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processResultFiles(e.target.files);
    e.target.value = "";
  };
  // ---- End attachment state ----

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
        const d = new Date(data.deadline);
        if (!isNaN(d.getTime())) {
          const pad = (n: number) => String(n).padStart(2, "0");
          deadline = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
        const d = new Date(data.activityInfo.endTime);
        if (!isNaN(d.getTime())) {
          const pad = (n: number) => String(n).padStart(2, "0");
          completeDate = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

    // Load file đã lưu từ ticket vào dialog
    const existingFiles: DialogAttachment[] = (attachmentsMeta || [])
      .map(m => ({ kind: 'existing' as const, url: m.url, name: m.name || '', type: m.type || '', token: m.token || '' }));
    setUpdateDialogAttachments(existingFiles);

    setOpenUpdateInfo(true);
  }, [data, customers, attachmentsMeta]);

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
        result: isFormCompleted ? formData.result : undefined,
        note: formData.note || "",
        // File cũ giữ lại
        existing_attachments: updateDialogAttachments
          .filter(a => a.kind === 'existing')
          .map(a => ({ url: (a as any).url, name: (a as any).name, type: (a as any).type, token: (a as any).token })),
        // File mới upload thêm
        attachments: updateDialogAttachments.filter(a => a.kind === 'new').length > 0
          ? updateDialogAttachments.filter(a => a.kind === 'new').map(a => (a as any).base64)
          : undefined,
      };

      const result = await updateActivitySupportInfo(id, submitPayload);

      if (result.success) {
        toast.success("Cập nhật thông tin thành công!");
        queryClient.invalidateQueries({ queryKey: ["ticket-detail", "sales", id] });
        setOpenUpdateInfo(false);
        setUpdateDialogAttachments([]);
      } else {
        toast.error(result.message || "Cập nhật không thành công");
      }
    } catch (error: any) {
      const msg = error?.message || "";
      if (msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("network")) {
        toast.error("Không thể gửi dữ liệu — tệp đính kèm có thể quá lớn. Thử giảm kích thước hoặc xóa bớt tệp.");
      } else {
        toast.error(msg || "Có lỗi xảy ra khi cập nhật");
      }
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

            {/* Hình ảnh / Tệp đính kèm - chỉ hiển thị khi có dữ liệu */}
            {attachmentsMeta.length > 0 && (
              <Section title="Hình ảnh / Tệp đính kèm">
                <div className="grid grid-cols-3 gap-2">
                  {attachmentsMeta.map((meta, i) => {
                    const isImage = meta.type.startsWith("image/");
                    const isPdf = meta.type === "application/pdf";
                    const fileName = meta.name || meta.url.split("/").pop()?.split("?")[0] || `Tệp ${i + 1}`;
                    // Index trong mảng ảnh để mở đúng lightbox
                    const imageIndex = isImage ? lightboxImageMeta.findIndex(m => m.url === meta.url) : -1;
                    return isImage ? (
                      <button
                        key={i}
                        type="button"
                        className="relative w-full aspect-square rounded-md overflow-hidden border bg-muted focus:outline-none"
                        onClick={() => setLightboxIndex(imageIndex)}
                      >
                        <img
                          src={meta.url}
                          alt={`Ảnh đính kèm ${i + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Nếu load ảnh lỗi (URL hết hạn), hiển thị icon fallback
                            (e.target as HTMLImageElement).style.display = "none";
                            (e.target as HTMLImageElement).parentElement?.classList.add("flex", "items-center", "justify-center");
                          }}
                        />
                      </button>
                    ) : (
                      <a
                        key={i}
                        href={meta.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={fileName}
                        className="flex flex-col items-center justify-center w-full aspect-square rounded-md border bg-muted gap-1 px-1 text-center"
                      >
                        <FileText className={`h-7 w-7 ${isPdf ? "text-red-500" : "text-blue-500"}`} />
                        <span className="text-[10px] text-muted-foreground truncate w-full px-1" title={fileName}>
                          {fileName}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </Section>
            )}
          </div>
        )}
      </main>

      {/* Lightbox - chỉ hiển thị các file ảnh */}
      {lightboxIndex !== null && lightboxImageMeta.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="h-7 w-7" />
          </button>
          {/* Prev */}
          {lightboxIndex > 0 && (
            <button
              className="absolute left-3 text-white/80 hover:text-white"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i! - 1); }}
            >
              <ChevronLeft className="h-9 w-9" />
            </button>
          )}
          {/* Image */}
          <img
            src={lightboxImageMeta[lightboxIndex].url}
            alt={lightboxImageMeta[lightboxIndex].name || `Ảnh ${lightboxIndex + 1}`}
            className="max-w-full max-h-[90vh] object-contain rounded"
            onClick={(e) => e.stopPropagation()}
          />
          {/* Next */}
          {lightboxIndex < lightboxImageMeta.length - 1 && (
            <button
              className="absolute right-3 text-white/80 hover:text-white"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i! + 1); }}
            >
              <ChevronRight className="h-9 w-9" />
            </button>
          )}
          {/* Counter */}
          <div className="absolute bottom-5 left-0 right-0 text-center text-white/70 text-sm">
            {lightboxImageMeta[lightboxIndex].name && (
              <div className="text-white/50 text-xs mb-1">{lightboxImageMeta[lightboxIndex].name}</div>
            )}
            {lightboxIndex + 1} / {lightboxImageMeta.length}
          </div>
        </div>
      )}

      {/* Result dialog */}
      <Dialog open={openResult} onOpenChange={(open) => {
        if (!open) {
          setResultDialogAttachments([]);
          setResultNote("");
        }
        setOpenResult(open);
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ghi nhận kết quả</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Nội dung kết quả */}
            <div className="space-y-2">
              <Label htmlFor="result-note">Nội dung kết quả</Label>
              <Textarea
                id="result-note"
                placeholder="Nhập nội dung kết quả..."
                value={resultNote}
                onChange={(e) => setResultNote(e.target.value)}
                rows={4}
              />
            </div>

            {/* Hình ảnh / Tệp đính kèm */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Paperclip className="h-4 w-4" />
                Hình ảnh/Tệp đính kèm
              </Label>
              {/* Hidden inputs */}
              <input ref={resultCameraRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleResultFileChange} />
              <input ref={resultFileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={handleResultFileChange} />
              {/* Buttons */}
              <div className="flex gap-2">
                <Button
                  type="button" variant="outline" className="flex-1 h-10 gap-2"
                  disabled={resultDialogAttachments.filter(a => a.kind === 'new').length >= MAX_ATTACHMENTS}
                  onClick={() => resultCameraRef.current?.click()}
                >
                  <Camera className="h-4 w-4" /> Chụp ảnh
                </Button>
                <Button
                  type="button" variant="outline" className="flex-1 h-10 gap-2"
                  disabled={resultDialogAttachments.filter(a => a.kind === 'new').length >= MAX_ATTACHMENTS}
                  onClick={() => resultFileRef.current?.click()}
                >
                  <FolderOpen className="h-4 w-4" /> Tải lên hình ảnh/tệp
                </Button>
              </div>
              {/* Preview grid — hiển thị cả file đã lưu lẫn file mới */}
              {resultDialogAttachments.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {resultDialogAttachments.map((att, i) => {
                    const isImg = att.type.startsWith('image/');
                    const isPdf = att.type === 'application/pdf';
                    const previewSrc = att.kind === 'existing' ? att.url : (att as any).previewUrl;
                    return (
                      <div key={i} className="relative">
                        {/* Badge phân biệt */}
                        <span className={`absolute top-0.5 left-0.5 z-10 text-[8px] px-1 py-0.5 rounded font-medium text-white ${
                          att.kind === 'existing' ? 'bg-emerald-500/90' : 'bg-blue-500/90'
                        }`}>{att.kind === 'existing' ? 'Đã lưu' : 'Mới'}</span>
                        {isImg && previewSrc ? (
                          <img src={previewSrc} alt={att.name} className="w-full aspect-square object-cover rounded-md border" />
                        ) : (
                          <div className="w-full aspect-square flex flex-col items-center justify-center rounded-md border bg-muted gap-1 px-1">
                            <FileText className={`h-6 w-6 ${isPdf ? 'text-red-500' : 'text-blue-500'}`} />
                            <p className="text-[10px] text-muted-foreground text-center truncate w-full px-1" title={att.name}>{att.name || 'Tệp'}</p>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setResultDialogAttachments(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => { setOpenResult(false); setResultDialogAttachments([]); setResultNote(""); }}>Hủy</Button>
              <Button
                disabled={isSubmittingResult}
                onClick={async () => {
                  if (!id) return;
                  setIsSubmittingResult(true);
                  try {
                    const res = await updateActivitySupportResult(id, {
                      note: resultNote || undefined,
                      // File cũ giữ lại
                      existing_attachments: resultDialogAttachments
                        .filter(a => a.kind === 'existing')
                        .map(a => ({ url: (a as any).url, name: (a as any).name, type: (a as any).type })),
                      // File mới upload thêm
                      attachments: resultDialogAttachments.filter(a => a.kind === 'new').length > 0
                        ? resultDialogAttachments.filter(a => a.kind === 'new').map(a => (a as any).base64)
                        : undefined,
                    });
                    if (res.success) {
                      toast.success("Đã ghi nhận kết quả, đang tải lại dữ liệu...");
                      setOpenResult(false);
                      setResultNote("");
                      setResultDialogAttachments([]);
                      queryClient.invalidateQueries({ queryKey: ["ticket-detail", "sales", id] });
                    } else {
                      toast.error(res.message || "Ghi nhận không thành công");
                    }
                  } finally {
                    setIsSubmittingResult(false);
                  }
                }}
              >
                <CheckCircle className="mr-2" /> {isSubmittingResult ? "Đang lưu..." : "Lưu"}
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

            {/* Hình ảnh / Tệp đính kèm */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Paperclip className="h-4 w-4" />
                Hình ảnh/Tệp đính kèm
              </Label>
              {/* Hidden inputs */}
              <input ref={updateCameraRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleUpdateFileChange} />
              <input ref={updateFileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={handleUpdateFileChange} />
              {/* Buttons */}
              <div className="flex gap-2">
                <Button
                  type="button" variant="outline" className="flex-1 h-10 gap-2"
                  disabled={updateDialogAttachments.filter(a => a.kind === 'new').length >= MAX_ATTACHMENTS}
                  onClick={() => updateCameraRef.current?.click()}
                >
                  <Camera className="h-4 w-4" /> Chụp ảnh
                </Button>
                <Button
                  type="button" variant="outline" className="flex-1 h-10 gap-2"
                  disabled={updateDialogAttachments.filter(a => a.kind === 'new').length >= MAX_ATTACHMENTS}
                  onClick={() => updateFileRef.current?.click()}
                >
                  <FolderOpen className="h-4 w-4" /> Tải lên hình ảnh/tệp
                </Button>
              </div>
              {/* Preview grid — hiển thị cả file đã lưu lẫn file mới */}
              {updateDialogAttachments.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {updateDialogAttachments.map((att, i) => {
                    const isImg = att.type.startsWith('image/');
                    const isPdf = att.type === 'application/pdf';
                    const previewSrc = att.kind === 'existing' ? att.url : (att as any).previewUrl;
                    return (
                      <div key={i} className="relative">
                        {/* Badge phân biệt */}
                        <span className={`absolute top-0.5 left-0.5 z-10 text-[8px] px-1 py-0.5 rounded font-medium text-white ${
                          att.kind === 'existing' ? 'bg-emerald-500/90' : 'bg-blue-500/90'
                        }`}>{att.kind === 'existing' ? 'Đã lưu' : 'Mới'}</span>
                        {isImg && previewSrc ? (
                          <img src={previewSrc} alt={att.name} className="w-full aspect-square object-cover rounded-md border" />
                        ) : (
                          <div className="w-full aspect-square flex flex-col items-center justify-center rounded-md border bg-muted gap-1 px-1">
                            <FileText className={`h-6 w-6 ${isPdf ? 'text-red-500' : 'text-blue-500'}`} />
                            <p className="text-[10px] text-muted-foreground text-center truncate w-full px-1" title={att.name}>{att.name || 'Tệp'}</p>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setUpdateDialogAttachments(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
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


