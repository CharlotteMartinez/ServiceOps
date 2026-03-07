import Header from "@/components/Layout/Header";
import DetailTopNav from "@/components/Layout/DetailTopNav";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { acceptTicket, getTicketDetail, TicketDetail as TicketDetailType, fetchMaintenanceTicketDetail, updateMaintenanceContactInfo, checkDeviceSerial, updateMaintenanceDeviceInfo, fetchMaintenanceTicketTypes, fetchMaintenanceTicketCategories, updateMaintenanceTypeCategory, updateMaintenanceFirstResponse, updateMaintenanceSupplierInstruction, maintenanceStart, maintenanceResult, acceptMaintenanceRepairTicket } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlarmClock, Building2, Mail, MapPin, Phone, Wrench, Camera, X, CheckCircle, PencilLine, PlayCircle, Package, Circle, Info } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import TicketActions from "@/components/Dashboard/TicketActions";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast as sonnerToast } from "@/components/ui/sonner";
import { useToast } from "@/hooks/use-toast";

const Section = ({ title, icon, accentClass, rightSlot, children }: { title: string; icon?: React.ReactNode; accentClass?: string; rightSlot?: React.ReactNode; children: React.ReactNode }) => (
  <Card className="shadow-card">
    <CardContent className="p-4">
      <div className="mb-3 pb-1 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon ? <span className={accentClass}>{icon}</span> : null}
          <h3 className="text-[13px] font-semibold tracking-wide uppercase text-foreground">{title}</h3>
        </div>
        {rightSlot ? <div className="text-xs text-muted-foreground">{rightSlot}</div> : null}
      </div>
      {children}
    </CardContent>
  </Card>
);

const MaintenanceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ticket-detail", "maintenance", id],
    queryFn: async () => (await fetchMaintenanceTicketDetail(id || "")).data as TicketDetailType,
    enabled: Boolean(id),
  });

  // Normalize status using visible display label first, then fall back to raw status
  const normalizedStatus = (() => {
    const label = String(((data as any)?.statusDisplayLabel ?? "")).toLowerCase().trim();
    if (label) {
      if (label.includes("tiếp nhận")) return "received";
      if (label.includes("đang thực hiện") || label.includes("đang xử lý")) return "in-progress";
      if (label.includes("hoàn tất") || label.includes("đã hoàn tất") || label.includes("completed")) return "completed";
      if (label.includes("phân công") || label.includes("assigned")) return "assigned";
    }
    const raw = (data?.status || "").toLowerCase();
    switch (raw) {
      case "received":
      case "in-progress":
      case "completed":
      case "assigned":
        return raw;
      default:
        return raw;
    }
  })();

  const isAssigned = normalizedStatus === "assigned";
  const isInProgress = normalizedStatus === "in-progress";
  const isCompleted = normalizedStatus === "completed";
  const isReceived = normalizedStatus === "received";

  // Helper function để map trạng thái
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "assigned":
        return { label: "Đã phân công", color: "bg-amber-100 text-amber-700 border-amber-200", icon: <PlayCircle className="h-4 w-4" /> };
      case "received":
        return { label: "Đã tiếp nhận", color: "bg-amber-100 text-amber-700 border-amber-200", icon: <PlayCircle className="h-4 w-4" /> };
      case "in-progress":
        return { label: "Đang thực hiện", color: "bg-blue-100 text-blue-700 border-blue-200", icon: <PlayCircle className="h-4 w-4" /> };
      case "completed":
        return { label: "Đã hoàn thành", color: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle className="h-4 w-4" /> };
      default:
        return { label: "Không xác định", color: "bg-gray-100 text-gray-700 border-gray-200", icon: <Info className="h-4 w-4" /> };
    }
  };

  // Unified status display mapping: prefer API-provided display label; fallback to our mapping
  const statusDisplay = (() => {
    const apiLabel = (data as any)?.statusDisplayLabel;
    if (typeof apiLabel === "string" && apiLabel.trim()) return apiLabel;
    const s = (data?.status || "").toLowerCase();
    switch (s) {
      case "assigned":
        return "Đã phân công";
      case "in-progress":
        return "Đang xử lý";
      case "completed":
        return "Hoàn tất";
      case "received":
        return "Đã tiếp nhận";
      default:
        return "";
    }
  })();

  const acceptMut = useMutation({
    mutationFn: () => acceptMaintenanceRepairTicket(id || ""),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket-detail", "maintenance", id] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      setShowSuccessModal(true);
    },
  });

  // Local states for maintenance flows (UI only)
  const [openFirst, setOpenFirst] = useState(false);
  const [openSupplier, setOpenSupplier] = useState(false);
  const [openStart, setOpenStart] = useState(false);
  const [openResult, setOpenResult] = useState(false);
  const [openContactEdit, setOpenContactEdit] = useState(false);
  const [openDeviceEdit, setOpenDeviceEdit] = useState(false);
  const [openIssueEdit, setOpenIssueEdit] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [firstRecorded, setFirstRecorded] = useState(false);
  const [supplierRecorded, setSupplierRecorded] = useState(false);
  const [startRecorded, setStartRecorded] = useState(false);
  const [resultRecorded, setResultRecorded] = useState(false);

  const [firstTime, setFirstTime] = useState("");
  const [supplierContactTime, setSupplierContactTime] = useState("");
  const [supplierResponseTime, setSupplierResponseTime] = useState("");
  const [startTime, setStartTime] = useState("");
  const [resultTime, setResultTime] = useState("");

  const [firstNote, setFirstNote] = useState("");
  const [supplierNote, setSupplierNote] = useState("");
  const [resultNote, setResultNote] = useState("");

  const firstCameraInputRef = useRef<HTMLInputElement | null>(null);
  const firstFileInputRef = useRef<HTMLInputElement | null>(null);
  const startInputRef = useRef<HTMLInputElement | null>(null);
  const resultInputRef = useRef<HTMLInputElement | null>(null);

  const [firstImages, setFirstImages] = useState<File[]>([]);
  // Prefill First Response when opening dialog
  const openFirstResponse = () => {
    setFirstTime(data?.firstResponse?.time ? data!.firstResponse!.time!.slice(0, 16) : "");
    setFirstNote(data?.firstResponse?.note || "");
    setFirstImages([]);
    setOpenFirst(true);
  };

  // Helper: resize image to reduce size (optimize for mobile)
  const resizeImage = (file: File, maxWidth = 1024, maxHeight = 1024, quality = 0.7) => new Promise<Blob>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        console.log('[MaintenanceDetail] Original image size:', width, 'x', height);

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        console.log('[MaintenanceDetail] Resized image size:', width, 'x', height);

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            console.log('[MaintenanceDetail] Resized blob size:', blob.size, 'bytes');
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  async function fileToBase64(file: File): Promise<string> {
    try {
      // Resize image to reduce payload size
      const resizedBlob = await resizeImage(file);
      const resizedFile = new File([resizedBlob], file.name, { type: 'image/jpeg' });

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1] || "");
        reader.onerror = reject;
        reader.readAsDataURL(resizedFile);
      });
    } catch (err) {
      console.error('[MaintenanceDetail] Error resizing image:', err);
      // Fallback to original file if resize fails
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1] || "");
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  }
  async function getAddressString(): Promise<string> {
    try {
      const coords: GeolocationPosition = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });
      const lat = coords.coords.latitude;
      const lon = coords.coords.longitude;
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
      const res = await fetch(url, { headers: { "Accept": "application/json" } });
      const data = await res.json();
      return data?.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    } catch (_) {
      return "Không xác định";
    }
  }

  const openStartDialog = async () => {
    setStartTime("");
    setStartImages([]);
    setStartLocation("Đang lấy vị trí...");
    setOpenStart(true);
    const loc = await getAddressString();
    setStartLocation(loc);
  };

  const openResultDialog = async () => {
    setResultTime("");
    setResultNote("");
    setResultImages([]);
    setResultLocation("Đang lấy vị trí...");
    setOpenResult(true);
    const loc = await getAddressString();
    setResultLocation(loc);
  };
  // Prefill Supplier Instruction when opening dialog
  const openSupplierInstruction = () => {
    setSupplierContactTime(data?.supplierInstruction?.contactTime ? data!.supplierInstruction!.contactTime!.slice(0, 16) : "");
    setSupplierResponseTime(data?.supplierInstruction?.responseTime ? data!.supplierInstruction!.responseTime!.slice(0, 16) : "");
    setSupplierNote(data?.supplierInstruction?.note || "");
    setOpenSupplier(true);
  };
  const [startImages, setStartImages] = useState<File[]>([]);
  const [resultImages, setResultImages] = useState<File[]>([]);
  const [startLocation, setStartLocation] = useState<string>("");
  const [resultLocation, setResultLocation] = useState<string>("");

  // Contact edit form state
  const [contactName, setContactName] = useState<string>("");
  const [contactCompany, setContactCompany] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");

  // Sync initial values when opening dialog
  const openContact = () => {
    setContactName(data?.customerInfo?.name || "");
    setContactCompany(data?.maintenanceExtra?.company || "");
    setContactPhone(data?.customerInfo?.contactPhone || "");
    setContactEmail(data?.customerInfo?.contactEmail || "");
    setOpenContactEdit(true);
  };

  const updateContactMut = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing ticket id");
      return await updateMaintenanceContactInfo(id, {
        name: contactName || undefined,
        company: contactCompany || undefined,
        phone: contactPhone || undefined,
        mail: contactEmail || undefined,
      });
    },
    onSuccess: (res) => {
      if (res.success) {
        // Beautiful toast via Sonner with a dismiss action
        sonnerToast.success("Đã cập nhật thông tin liên hệ", {
          description: "Thông tin liên hệ của ticket đã được lưu.",
          action: {
            label: "Đóng",
            onClick: () => { },
          },
        });
        // Also show shadcn toast (ensures visibility even if Sonner disabled)
        toast({ title: "Cập nhật thành công", description: "Đã lưu thông tin liên hệ." });
        setOpenContactEdit(false);
        qc.invalidateQueries({ queryKey: ["ticket-detail", "maintenance", id] });
      }
    },
    onError: (err: any) => {
      sonnerToast.error("Cập nhật thất bại", {
        description: err?.message || "Vui lòng thử lại.",
        action: { label: "Đóng", onClick: () => { } },
      });
    },
  });

  // Device edit form state
  const [deviceSerial, setDeviceSerial] = useState<string>("");
  const [deviceBrand, setDeviceBrand] = useState<string>("");
  const [deviceModel, setDeviceModel] = useState<string>("");
  const [deviceInstallDate, setDeviceInstallDate] = useState<string>("");
  const [serialError, setSerialError] = useState<string>("");

  const openDevice = () => {
    setDeviceSerial(data?.maintenanceExtra?.serialNumber || "");
    setDeviceBrand(data?.maintenanceExtra?.deviceBrand || "");
    setDeviceModel(data?.maintenanceExtra?.deviceModel || "");
    setDeviceInstallDate(data?.maintenanceExtra?.installationDate ? data!.maintenanceExtra!.installationDate!.slice(0, 16) : "");
    setSerialError("");
    setOpenDeviceEdit(true);
  };

  const checkSerialMut = useMutation({
    mutationFn: async () => {
      setSerialError("");
      const res = await checkDeviceSerial(deviceSerial);
      if (!res.success) throw new Error(res.message || "Serial not found");
      return res;
    },
    onSuccess: (res) => {
      const info = res.data || {};
      if (info["install-date"]) setDeviceInstallDate((info["install-date"] as string).slice(0, 16));
      if (info.brand) setDeviceBrand(info.brand);
      if (info.model) setDeviceModel(info.model);
    },
    onError: () => {
      setSerialError("Serial không tồn tại!");
    },
  });

  // Issue/Service dialog state
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const openIssue = async () => {
    setSelectedType(data?.maintenanceExtra?.ticketType || "");
    setSelectedCategory(data?.maintenanceExtra?.ticketCategory || "");
    setOpenIssueEdit(true);
    // Parallel load options
    const [t, c] = await Promise.all([fetchMaintenanceTicketTypes(), fetchMaintenanceTicketCategories()]);
    if (t.success && t.data) setTypeOptions(t.data);
    if (c.success && c.data) setCategoryOptions(c.data);
  };

  // Supplier instruction logs (many records support)
  const supplierInstructionLogsRaw =
    ((data as any)?.supplierInstructionLogs ??
      (data as any)?.supplier_instruction_logs ??
      (data as any)?.supplierInstruction?.logs ??
      []) as unknown;
  const supplierInstructionLogs: Array<Record<string, any>> = Array.isArray(supplierInstructionLogsRaw)
    ? (supplierInstructionLogsRaw as Array<Record<string, any>>)
    : [];

  // Selection state for goods when completing ticket
  const [selectedGoodsIds, setSelectedGoodsIds] = useState<string[]>([]);

  // Edit dialogs for sections
  // (states declared above)

  // Build selectable lists from available data
  const goodsCandidates: Array<{ id: string; label: string }> =
    (data?.orderInfo?.secretCodes?.map((it: any, idx: number) => ({ id: String(it.code || idx), label: `${it.code || `MH-${idx + 1}`} ${it.name ? `- ${it.name}` : ""}` })) ||
      data?.goodsInfo?.map((g: any, idx: number) => ({ id: `G-${idx}`, label: `${g.name || `Hạng mục ${idx + 1}`}${g.quantity ? ` - x${g.quantity}` : ""}` })) ||
      []);

  // Removed deviceCandidates section per requirement

  const handleSelectAllGoods = () => {
    const all = goodsCandidates.map((g) => g.id);
    setSelectedGoodsIds((prev) => (prev.length === all.length ? [] : all));
  };
  const handleGoodsChange = (id: string) => {
    setSelectedGoodsIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  // Removed device selection handlers

  // Derived flags for start section to avoid showing empty/placeholder values
  const isNonEmpty = (v: unknown) => typeof v === "string" && v.trim().length > 0 && v.trim().toLowerCase() !== "undefined" && v.trim().toLowerCase() !== "null";
  const startTimeVal = data?.startExecution?.time || "";
  const startLocationVal = data?.maintenanceExtra?.startLocation || "";
  const startImagesArr: string[] = Array.isArray((data as any)?.startExecution?.imageUrls) ? (data as any).startExecution.imageUrls : [];
  const validStartImage = startImagesArr.find((u) => {
    if (!isNonEmpty(u)) return false;
    const val = String(u);
    return val.startsWith("http://") || val.startsWith("https://") || val.startsWith("data:image/") || val.includes("/");
  });
  const hasStartTime = isNonEmpty(startTimeVal);
  const hasStartLocation = isNonEmpty(startLocationVal);
  const hasStartImage = Boolean(validStartImage);

  return (
    <div className="min-h-screen bg-background">
      <DetailTopNav title="Chi tiết Ticket" />
      <main className="container mx-auto px-4 py-6 pb-24 space-y-4">
        {/* Contact Edit Dialog */}
        <Dialog open={openContactEdit} onOpenChange={setOpenContactEdit}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cập nhật thông tin liên hệ</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Tên" />
              <Input value={contactCompany} onChange={(e) => setContactCompany(e.target.value)} placeholder="Công ty/Đơn vị" />
              <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Số điện thoại" />
              <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Email" />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setOpenContactEdit(false)}>Đóng</Button>
                <Button onClick={() => updateContactMut.mutate()} disabled={updateContactMut.isPending}>
                  {updateContactMut.isPending ? "Đang cập nhật..." : "Cập nhật"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Device Edit Dialog */}
        <Dialog open={openDeviceEdit} onOpenChange={setOpenDeviceEdit}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cập nhật thông tin thiết bị</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input value={deviceSerial} onChange={(e) => setDeviceSerial(e.target.value)} placeholder="Serial" className="flex-1" />
                <Button variant="outline" onClick={() => checkSerialMut.mutate()} disabled={!deviceSerial || checkSerialMut.isPending}>
                  {checkSerialMut.isPending ? "Đang kiểm tra..." : "Check"}
                </Button>
              </div>
              {serialError && (<div className="text-xs text-red-600">Serial không tồn tại!</div>)}
              <Input value={deviceBrand} onChange={(e) => setDeviceBrand(e.target.value)} placeholder="Hãng" />
              <Input value={deviceModel} onChange={(e) => setDeviceModel(e.target.value)} placeholder="Model" />
              <Input value={deviceInstallDate} onChange={(e) => setDeviceInstallDate(e.target.value)} type="datetime-local" placeholder="Ngày lắp đặt" />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setOpenDeviceEdit(false)}>Đóng</Button>
                <Button onClick={async () => {
                  if (!id) return;
                  const res = await updateMaintenanceDeviceInfo(id, {
                    brand: deviceBrand || undefined,
                    model: deviceModel || undefined,
                    serial: deviceSerial || undefined,
                    "install-date": deviceInstallDate || undefined,
                  });
                  if (res.success) {
                    sonnerToast.success("Đã cập nhật thông tin thiết bị", { action: { label: "Đóng", onClick: () => { } } });
                    setOpenDeviceEdit(false);
                    qc.invalidateQueries({ queryKey: ["ticket-detail", "maintenance", id] });
                  } else {
                    sonnerToast.error("Cập nhật thất bại", { description: res.message || "Vui lòng thử lại.", action: { label: "Đóng", onClick: () => { } } });
                  }
                }}>Cập nhật</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Issue Edit Dialog */}
        <Dialog open={openIssueEdit} onOpenChange={setOpenIssueEdit}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cập nhật vấn đề / dịch vụ</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Loại dịch vụ</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại dịch vụ" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm mb-1">Nhóm</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn nhóm" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setOpenIssueEdit(false)}>Đóng</Button>
                <Button onClick={async () => {
                  if (!id) return;
                  const res = await updateMaintenanceTypeCategory(id, { type: selectedType || undefined, category: selectedCategory || undefined });
                  if (res.success) {
                    sonnerToast.success("Đã cập nhật phân loại", { action: { label: "Đóng", onClick: () => { } } });
                    setOpenIssueEdit(false);
                    qc.invalidateQueries({ queryKey: ["ticket-detail", "maintenance", id] });
                  } else {
                    sonnerToast.error("Cập nhật thất bại", { description: res.message || "Vui lòng thử lại.", action: { label: "Đóng", onClick: () => { } } });
                  }
                }}>Cập nhật</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {/* Ticket ID */}
        {id && (
          <div className="flex items-center justify-between mb-3">
            <div className="w-full text-center px-3 py-2 rounded-md text-sm font-mono bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]">
              #{id}
            </div>
          </div>
        )}

        {/* Classification and Status Pills */}
        {data && normalizedStatus && (
          <div className="flex justify-between gap-3 mb-4">
            {/* Classification Pill */}
            {data.maintenanceExtra?.ticketCategory && (
              <div className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium border bg-purple-100 text-purple-700 border-purple-200">
                <Package className="h-4 w-4" />
                <span>{data.maintenanceExtra.ticketCategory}</span>
              </div>
            )}
            {/* Status Pill */}
            <div className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium border ${getStatusInfo(normalizedStatus).color}`}>
              {getStatusInfo(normalizedStatus).icon}
              <span>{statusDisplay}</span>
            </div>
          </div>
        )}
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
            {/* Quick actions for maintenance flows */}

            {/* 1/ Nhóm thông tin liên hệ */}
            <Section title="Thông tin liên hệ" icon={<Building2 className="h-5 w-5" />} accentClass="text-sky-600" rightSlot={<button onClick={openContact} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><PencilLine className="h-4 w-4" />Cập nhật</button>}>
              <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{data.customerInfo?.name}</span></div>
                {data.maintenanceExtra?.company && (<div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span>{data.maintenanceExtra.company}</span></div>)}
                {data.customerInfo?.contactPhone && (<div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span>{data.customerInfo.contactPhone}</span></div>)}
                {data.customerInfo?.contactEmail && (<div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span>{data.customerInfo.contactEmail}</span></div>)}
              </div>
            </Section>

            {/* 2/ Nhóm thông tin thiết bị */}
            <Section title="Thông tin thiết bị" icon={<Wrench className="h-5 w-5" />} accentClass="text-violet-600" rightSlot={<button onClick={() => setOpenDeviceEdit(true)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><PencilLine className="h-4 w-4" />Cập nhật</button>}>
              <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.maintenanceExtra?.deviceBrand && (<div><span className="text-muted-foreground">Hãng:</span> <span className="font-medium">{data.maintenanceExtra.deviceBrand}</span></div>)}
                {data.maintenanceExtra?.deviceModel && (<div><span className="text-muted-foreground">Model:</span> <span className="font-medium">{data.maintenanceExtra.deviceModel}</span></div>)}
                {data.maintenanceExtra?.serialNumber && (<div><span className="text-muted-foreground">Serial:</span> <span className="font-mono">{data.maintenanceExtra.serialNumber}</span></div>)}
                {data.maintenanceExtra?.installationDate && (<div><span className="text-muted-foreground">Ngày lắp đặt:</span> <span>{formatDateTime(data.maintenanceExtra.installationDate)}</span></div>)}
              </div>
            </Section>

            {/* 3/ Nhóm thông tin vấn đề */}
            <Section title="Vấn đề / Dịch vụ" icon={<AlarmClock className="h-5 w-5" />} accentClass="text-orange-600" rightSlot={<button onClick={openIssue} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><PencilLine className="h-4 w-4" />Cập nhật</button>}>
              <div className="text-sm space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.maintenanceExtra?.ticketType && (<div><span className="text-muted-foreground">Loại dịch vụ:</span> <span className="font-medium">{data.maintenanceExtra.ticketType}</span></div>)}
                  {data.maintenanceExtra?.ticketCategory && (<div><span className="text-muted-foreground">Nhóm:</span> <span className="font-medium">{data.maintenanceExtra.ticketCategory}</span></div>)}
                  {data.maintenanceExtra?.createdAt && (<div><span className="text-muted-foreground">Tạo lúc:</span> <span>{formatDateTime(data.maintenanceExtra.createdAt)}</span></div>)}
                  {data.maintenanceExtra?.assignedAt && (<div><span className="text-muted-foreground">Phân công lúc:</span> <span>{formatDateTime(data.maintenanceExtra.assignedAt)}</span></div>)}
                </div>
                {data.description && (
                  <div>
                    <div className="text-muted-foreground mb-1">Mô tả vấn đề</div>
                    <div className="whitespace-pre-wrap">{data.description}</div>
                  </div>
                )}
                {data.maintenanceExtra?.imageDeviceUrl && (
                  <div>
                    <div className="text-muted-foreground mb-1">Ảnh</div>
                    <img src={data.maintenanceExtra.imageDeviceUrl} alt="device" className="max-h-64 rounded border block mx-auto" />
                  </div>
                )}
              </div>
            </Section>

            {/* Maintenance flow sections as info blocks */}
            {!isAssigned && (
              <>
                <Section title="First Response" rightSlot={<button onClick={openFirstResponse} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><PencilLine className="h-4 w-4" />Cập nhật</button>}>
                  {data.firstResponse?.time != "undefined" || data.firstResponse?.note != "undefined" ? (
                    <div className="grid grid-cols-[1fr_auto] items-start gap-3 text-sm">
                      <div className="space-y-2">
                        {data.firstResponse?.time && <div><span className="text-muted-foreground">Thời gian:</span> {formatDateTime(data.firstResponse.time)}</div>}
                        {data.firstResponse?.note && <div><span className="text-muted-foreground">Nội dung:</span> {data.firstResponse.note}</div>}
                      </div>
                      {data.firstResponse?.imageUrls && data.firstResponse.imageUrls.length > 0 ? (
                        <img src={data.firstResponse.imageUrls[0]} alt="first-response" className="h-20 w-20 object-cover rounded border justify-self-end" />
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Button variant="outline" size="sm" onClick={() => setOpenFirst(true)} className="w-full">Ghi nhận</Button>
                    </div>
                  )}
                </Section>

                <Section
                  title="Supplier Instruction"
                  rightSlot={
                    <button
                      onClick={openSupplierInstruction}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                    >
                      + Ghi nhận
                    </button>
                  }
                >
                  {supplierInstructionLogs.length > 0 ? (
                    <div className="space-y-3">
                      {supplierInstructionLogs.map((log, idx) => {
                        const contactTime = isNonEmpty(log?.contactTime || log?.contact_time) ? formatDateTime(log?.contactTime || log?.contact_time) : "";
                        const responseTime = isNonEmpty(log?.responseTime || log?.response_time) ? formatDateTime(log?.responseTime || log?.response_time) : "";
                        const responseContent = isNonEmpty(log?.responseContent || log?.response_content) ? (log?.responseContent || log?.response_content) : "";
                        const hasDetails = Boolean(contactTime || responseTime || responseContent);
                        return (
                          <div key={log?.contactCode || log?.contact_code || idx} className="relative rounded-lg border border-border/70 p-3 pl-5 bg-muted/30">
                            <span className="absolute left-2 top-4 h-2 w-2 rounded-full bg-primary"></span>
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lần {idx + 1}</div>
                              {/* {(log?.contactCode || log?.contact_code) && (
                            <Badge variant="secondary" className="text-[11px]">
                              {log?.contactCode || log?.contact_code}
                            </Badge>
                          )} */}
                            </div>
                            {hasDetails ? (
                              <div className="text-sm space-y-1.5">
                                {contactTime && (
                                  <div>
                                    <span className="text-muted-foreground">Liên hệ lúc:</span> {contactTime}
                                  </div>
                                )}
                                {responseTime && (
                                  <div>
                                    <span className="text-muted-foreground">Phản hồi lúc:</span> {responseTime}
                                  </div>
                                )}
                                {responseContent && (
                                  <div>
                                    <span className="text-muted-foreground">Nội dung:</span> {responseContent}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground italic">Chưa có thông tin chi tiết</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">Chưa ghi nhận</div>
                  )}
                </Section>

                {(hasStartTime || hasStartLocation || hasStartImage) ? (
                  <Section title="Bắt đầu thực hiện" icon={<PlayCircle className="h-5 w-5" />} accentClass="text-primary">
                    <div className="grid grid-cols-[1fr_auto] items-start gap-3 text-sm">
                      <div className="space-y-2">
                        {hasStartTime && <div><span className="text-muted-foreground">Thời gian:</span> {formatDateTime(startTimeVal)}</div>}
                        {hasStartLocation && <div><span className="text-muted-foreground">Vị trí:</span> {startLocationVal}</div>}
                      </div>
                      {hasStartImage ? (
                        <img src={validStartImage as string} alt="start" className="h-20 w-20 object-cover rounded border justify-self-end" />
                      ) : null}
                    </div>
                  </Section>
                ) : (
                  // <Section title="Bắt đầu thực hiện" icon={<PlayCircle className="h-5 w-5" />} accentClass="text-primary">
                  //   <div className="flex items-center justify-between">
                  //     <span className="text-sm text-muted-foreground">Chưa có thông tin</span>
                  //     <Button variant="outline" size="sm" onClick={openStartDialog}>Bắt đầu thực hiện</Button>
                  //   </div>
                  // </Section>
                  <div></div>
                )}

                {(data.resultRecord?.time != "undefined" || data.maintenanceExtra?.completeLocation != "undefined") ? (
                  <Section title="Kết quả thực hiện" icon={<CheckCircle className="h-5 w-5" />} accentClass="text-emerald-600">
                    <div className="grid grid-cols-[1fr_auto] items-start gap-3 text-sm">
                      <div className="space-y-2">
                        {data.resultRecord?.time && <div><span className="text-muted-foreground">Thời gian:</span> {formatDateTime(data.resultRecord.time)}</div>}
                        {data.maintenanceExtra?.completeLocation && <div><span className="text-muted-foreground">Vị trí:</span> {data.maintenanceExtra.completeLocation}</div>}
                      </div>
                      {data.resultRecord?.imageUrls && data.resultRecord.imageUrls.length > 0 ? (
                        <img src={data.resultRecord.imageUrls[0]} alt="result" className="h-20 w-20 object-cover rounded border justify-self-end" />
                      ) : null}
                    </div>
                  </Section>
                ) : (
                  // <Section title="Kết quả thực hiện" icon={<CheckCircle className="h-5 w-5" />} accentClass="text-emerald-600">
                  //   <div className="flex items-center justify-between">
                  //     <span className="text-sm text-muted-foreground">Chưa có thông tin</span>
                  //     <Button size="sm" onClick={openResultDialog}>
                  //       Hoàn tất Ticket
                  //     </Button>
                  //   </div>
                  // </Section>
                  <div></div>
                )}
              </>
            )}

            {/* {data.notes && (
              <Section title="Ghi chú">
                <div className="text-sm">{data.notes}</div>
              </Section>
            )} */}
          </div>
        )}
      </main>

      {/* Dialogs */}
      <Dialog open={openFirst} onOpenChange={setOpenFirst}>
        <DialogContent className="max-w-md overflow-hidden">
          <DialogHeader>
            <DialogTitle>Ghi nhận First Response</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2 min-w-0">
              <div className="min-w-0">
                <Input type="datetime-local" value={firstTime} onChange={(e) => setFirstTime(e.target.value)} className="w-full max-w-full min-w-0 text-left" />
              </div>
              <Textarea placeholder="Nhập nội dung ghi nhận..." value={firstNote} onChange={(e) => setFirstNote(e.target.value)} />
            </div>
            {/* Capture images */}
            <div>
              <input
                ref={firstCameraInputRef}
                id="first-images-camera"
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  setFirstImages(files);
                }}
                className="hidden"
              />
              <input
                ref={firstFileInputRef}
                id="first-images-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  setFirstImages(files);
                }}
                className="hidden"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => firstCameraInputRef.current?.click()}>
                  <Camera className="mr-2" /> Chụp ảnh
                </Button>
                <Button size="sm" onClick={() => firstFileInputRef.current?.click()}>
                  Tải ảnh lên
                </Button>
                {firstImages.length > 0 && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => { setFirstImages([]); firstCameraInputRef.current?.click(); }}>Chụp lại</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setFirstImages([]); firstFileInputRef.current?.click(); }}>Chọn ảnh khác</Button>
                    <span className="text-sm text-muted-foreground">{firstImages.length} ảnh đã chọn</span>
                  </>
                )}
              </div>
              {firstImages.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {firstImages.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img src={URL.createObjectURL(img)} alt="preview" className="h-16 w-16 object-cover rounded border" />
                      <button
                        type="button"
                        onClick={() => setFirstImages((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-black/70 text-white text-xs"
                        aria-label="Xóa ảnh"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpenFirst(false)}>Hủy</Button>
              <Button onClick={async () => {
                if (!id) return;
                const imageBase64 = firstImages.length > 0 ? await fileToBase64(firstImages[0]) : undefined;
                const res = await updateMaintenanceFirstResponse(id, {
                  "first-response-time": firstTime || undefined,
                  "first-response-content": firstNote || undefined,
                  "first-response-image": imageBase64,
                });
                if (res.success) {
                  sonnerToast.success("Đã cập nhật First Response", { action: { label: "Đóng", onClick: () => { } } });
                  setOpenFirst(false);
                  qc.invalidateQueries({ queryKey: ["ticket-detail", "maintenance", id] });
                } else {
                  sonnerToast.error("Cập nhật thất bại", { description: res.message || "Vui lòng thử lại.", action: { label: "Đóng", onClick: () => { } } });
                }
              }}>Lưu</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openSupplier} onOpenChange={setOpenSupplier}>
        <DialogContent className="max-w-md overflow-hidden">
          <DialogHeader>
            <DialogTitle>Ghi nhận Supplier Instruction</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Ngày liên hệ</label>
              <Input type="datetime-local" value={supplierContactTime} onChange={(e) => setSupplierContactTime(e.target.value)} className="w-full max-w-full min-w-0 text-left" />
            </div>
            <div>
              <label className="block text-sm mb-1">Ngày phản hồi</label>
              <Input type="datetime-local" value={supplierResponseTime} onChange={(e) => setSupplierResponseTime(e.target.value)} className="w-full max-w-full min-w-0 text-left" />
            </div>
            <Textarea placeholder="Nội dung phản hồi..." value={supplierNote} onChange={(e) => setSupplierNote(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpenSupplier(false)}>Hủy</Button>
              <Button onClick={async () => {
                if (!id) return;
                const res = await updateMaintenanceSupplierInstruction(id, {
                  "contact-date": supplierContactTime || undefined,
                  "response-date": supplierResponseTime || undefined,
                  "response-content": supplierNote || undefined,
                });
                if (res.success) {
                  sonnerToast.success("Đã cập nhật Supplier Instruction", { action: { label: "Đóng", onClick: () => { } } });
                  setOpenSupplier(false);
                  qc.invalidateQueries({ queryKey: ["ticket-detail", "maintenance", id] });
                } else {
                  sonnerToast.error("Cập nhật thất bại", { description: res.message || "Vui lòng thử lại.", action: { label: "Đóng", onClick: () => { } } });
                }
              }}>Lưu</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openStart} onOpenChange={setOpenStart}>
        <DialogContent className="max-w-md overflow-hidden">
          <DialogHeader>
            <DialogTitle>Ghi nhận bắt đầu thực hiện</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {startLocation && <div className="text-xs text-muted-foreground">Vị trí: {startLocation}</div>}
            <div>
              <input
                ref={startInputRef}
                id="start-images"
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  setStartImages(files);
                  if (files.length > 0) setStartTime(new Date().toISOString());
                }}
                className="hidden"
              />
              <Button variant="outline" size="sm" onClick={() => startInputRef.current?.click()}>
                <Camera className="mr-2" /> Chụp ảnh
              </Button>
              {startImages.length > 0 && <div className="text-xs text-muted-foreground mt-1">{startImages.length} ảnh</div>}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpenStart(false)}>Hủy</Button>
              <Button
                onClick={async () => {
                  if (!id) return;
                  const imageBase64 = startImages.length > 0 ? await fileToBase64(startImages[0]) : undefined;
                  const res = await maintenanceStart(id, {
                    "start-image": imageBase64,
                    "start-time": startTime || new Date().toISOString(),
                    "start-location": startLocation || undefined,
                  });
                  if (res.success) {
                    sonnerToast.success("Đã ghi nhận bắt đầu thực hiện", { action: { label: "Đóng", onClick: () => { } } });
                    setOpenStart(false);
                    qc.invalidateQueries({ queryKey: ["ticket-detail", "maintenance", id] });
                  } else {
                    sonnerToast.error("Cập nhật thất bại", { description: res.message || "Vui lòng thử lại.", action: { label: "Đóng", onClick: () => { } } });
                  }
                }}
                disabled={startImages.length === 0}
              >
                Lưu
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openResult} onOpenChange={setOpenResult}>
        <DialogContent className="max-w-md overflow-hidden">
          <DialogHeader>
            <DialogTitle>Ghi nhận kết quả</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Capture images */}
            <div>
              <input
                ref={resultInputRef}
                id="result-images"
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  setResultImages(files);
                  if (files.length > 0) setResultTime(new Date().toISOString());
                }}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => resultInputRef.current?.click()}>
                  <Camera className="mr-2" /> Chụp ảnh
                </Button>
                {resultImages.length > 0 && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => { setResultImages([]); resultInputRef.current?.click(); }}>Chụp lại</Button>
                    <span className="text-sm text-muted-foreground">{resultImages.length} ảnh đã chọn</span>
                  </>
                )}
              </div>
              {resultImages.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {resultImages.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img src={URL.createObjectURL(img)} alt="preview" className="h-16 w-16 object-cover rounded border" />
                      <button
                        type="button"
                        onClick={() => setResultImages((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-black/70 text-white text-xs"
                        aria-label="Xóa ảnh"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Goods selection (if any) */}
            {goodsCandidates.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1">Chọn hàng hóa đã xử lý</label>
                <button type="button" className="text-xs underline mb-2" onClick={handleSelectAllGoods}>
                  {selectedGoodsIds.length === goodsCandidates.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  {goodsCandidates.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 border rounded p-2">
                      <input type="checkbox" checked={selectedGoodsIds.includes(g.id)} onChange={() => handleGoodsChange(g.id)} />
                      <span className="text-sm">{g.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Device selection removed as requested */}

            <Textarea placeholder="Kết quả thực hiện..." value={resultNote} onChange={(e) => setResultNote(e.target.value)} />
            {resultLocation && <div className="text-xs text-muted-foreground">Vị trí: {resultLocation}</div>}
            <div>
              {resultImages.length > 0 && <div className="text-xs text-muted-foreground mt-1">{resultImages.length} ảnh</div>}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpenResult(false)}>Hủy</Button>
              <Button onClick={async () => {
                if (!id) return;
                const imageBase64 = resultImages.length > 0 ? await fileToBase64(resultImages[0]) : undefined;
                const res = await maintenanceResult(id, {
                  note: resultNote || undefined,
                  "result-image": imageBase64,
                  "result-time": resultTime || new Date().toISOString(),
                  "result-location": resultLocation || undefined,
                });
                if (res.success) {
                  sonnerToast.success("Đã ghi nhận kết quả", { action: { label: "Đóng", onClick: () => { } } });
                  setOpenResult(false);
                  qc.invalidateQueries({ queryKey: ["ticket-detail", "maintenance", id] });
                } else {
                  sonnerToast.error("Cập nhật thất bại", { description: res.message || "Vui lòng thử lại.", action: { label: "Đóng", onClick: () => { } } });
                }
              }}>
                <CheckCircle className="mr-2" /> Lưu kết quả
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Bottom Action Bar (Tiếp nhận/Hoàn tất) */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3 flex items-center gap-2">
          {data && isAssigned && (
            <Button onClick={() => acceptMut.mutate()} size="lg" className="flex-1" disabled={acceptMut.isPending}>
              <PlayCircle className="mr-2" />
              {acceptMut.isPending ? "Đang tiếp nhận..." : "Tiếp nhận thực hiện"}
            </Button>
          )}
          {data && isReceived && (
            <Button onClick={openStartDialog} size="lg" className="flex-1">
              <PlayCircle className="mr-2" />
              Bắt đầu thực hiện
            </Button>
          )}
          {data && isInProgress && (
            <Button variant="secondary" size="lg" onClick={openResultDialog} className="flex-1">
              <CheckCircle className="mr-2" />
              Ghi nhận Kết quả
            </Button>
          )}
        </div>
      </div>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Tiếp nhận thành công</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Ticket #{id} đã chuyển sang trạng thái đang thực hiện.
              </p>
            </div>
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                navigate("/maintenance");
              }}
              className="w-full"
            >
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaintenanceDetail;


