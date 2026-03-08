import Header from "@/components/Layout/Header";
import DetailTopNav from "@/components/Layout/DetailTopNav";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TicketDetail as TicketDetailType, fetchDeliveryInstallTicketDetail, acceptDeliveryInstallTicket, completeDeliveryInstallTicket, createResidualDeliveryTicket } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlarmClock, Building2, Mail, MapPin, Phone, PlayCircle, CheckCircle, Camera, X, Package, Receipt, Wrench, Tag, Info, User, Image as ImageIcon, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, formatDate } from "@/lib/utils";
import { toast as notify } from "@/components/ui/sonner";
import React, { useRef, useState, useEffect } from "react";

const Section = ({ title, icon, accentClass, rightSlot, children }: { title: string; icon?: React.ReactNode; accentClass?: string; rightSlot?: React.ReactNode; children: React.ReactNode }) => (
  <Card className="shadow-card">
    <CardContent className="p-4">
      <div className="mb-3 pb-1 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon ? <span className={cn("h-5 w-5", accentClass)}>{icon}</span> : null}
          <h3 className="text-[13px] font-semibold tracking-wide uppercase text-foreground">{title}</h3>
        </div>
        {rightSlot ? <div className="text-xs text-muted-foreground">{rightSlot}</div> : null}
      </div>
      {children}
    </CardContent>
  </Card>
);

const DeliveryInstallDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedGoods, setSelectedGoods] = useState<string[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFinishedImage, setShowFinishedImage] = useState(false);
  const [finishedImageUrl, setFinishedImageUrl] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Debug: log images state changes
  useEffect(() => {
    console.log('[DeliveryInstall] images state changed:', images.length, 'files');
  }, [images]);

  // Helper function để map trạng thái
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "assigned":
        return { label: "Đã phân công", color: "bg-blue-100 text-blue-800 border-blue-200", icon: <Tag className="h-4 w-4" /> };
      case "in-progress":
        return { label: "Đang thực hiện", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: <PlayCircle className="h-4 w-4" /> };
      case "completed":
        return { label: "Đã hoàn thành", color: "bg-green-100 text-green-800 border-green-200", icon: <CheckCircle className="h-4 w-4" /> };
      default:
        return { label: "Không xác định", color: "bg-gray-100 text-gray-800 border-gray-200", icon: <Info className="h-4 w-4" /> };
    }
  };

  // Helper function để map loại ticket
  const getTicketTypeInfo = (type: string) => {
    switch (type) {
      case "delivery":
        return { label: "Giao hàng & Lắp đặt", color: "bg-purple-100 text-purple-800 border-purple-200", icon: <Package className="h-4 w-4" /> };
      case "maintenance":
        return { label: "Bảo trì & Sửa chữa", color: "bg-orange-100 text-orange-800 border-orange-200", icon: <Wrench className="h-4 w-4" /> };
      case "sales":
        return { label: "Hoạt động & Hỗ trợ", color: "bg-indigo-100 text-indigo-800 border-indigo-200", icon: <Info className="h-4 w-4" /> };
      default:
        return { label: "Không xác định", color: "bg-gray-100 text-gray-800 border-gray-200", icon: <Info className="h-4 w-4" /> };
    }
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["ticket-detail", "delivery", id],
    queryFn: async () => (await fetchDeliveryInstallTicketDetail(id || "")).data as TicketDetailType,
    enabled: Boolean(id),
  });

  // Status từ API: assigned | in-progress | completed
  const isAssigned = data?.status === "assigned";
  const isInProgress = data?.status === "in-progress";
  const isCompleted = data?.status === "completed";

  // Chọn tất cả hàng hóa
  const handleSelectAllGoods = () => {
    const all = data?.orderInfo?.secretCodes?.map((it: any) => it.code) || [];
    if (selectedGoods.length === all.length) setSelectedGoods([]);
    else setSelectedGoods(all);
  };
  // Chọn tất cả thiết bị
  const handleSelectAllDevices = () => {
    const all = data?.deviceInfo?.map((d: any) => d.serial || "") || [];
    if (selectedDevices.length === all.length) setSelectedDevices([]);
    else setSelectedDevices(all);
  };

  // Xử lý chọn hàng hóa
  const handleGoodsChange = (code: string) => {
    setSelectedGoods((prev) => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };
  // Xử lý chọn thiết bị
  const handleDeviceChange = (serial: string) => {
    setSelectedDevices((prev) => prev.includes(serial) ? prev.filter(s => s !== serial) : [...prev, serial]);
  };

  // Xử lý chọn ảnh
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      console.log('[DeliveryInstall] handleImageChange event triggered');
      const files = e?.target?.files;
      console.log('[DeliveryInstall] handleImageChange - files:', files);

      if (files && files.length > 0) {
        const newFiles = Array.from(files);
        console.log('[DeliveryInstall] handleImageChange - newFiles:', newFiles.length, 'files');

        // Validate and process each file
        const validFiles: File[] = [];
        newFiles.forEach((file, idx) => {
          if (file && file.size > 0) {
            console.log(`[DeliveryInstall] File ${idx}:`, {
              name: file.name,
              type: file.type,
              size: file.size,
              lastModified: new Date(file.lastModified).toISOString()
            });
            validFiles.push(file);
          } else {
            console.warn(`[DeliveryInstall] Invalid file at index ${idx}`);
          }
        });

        if (validFiles.length > 0) {
          setImages((prev) => {
            const updated = [...prev, ...validFiles];
            console.log('[DeliveryInstall] Total images after update:', updated.length);
            return updated;
          });
        } else {
          console.warn('[DeliveryInstall] No valid files found');
        }
      } else {
        console.warn('[DeliveryInstall] handleImageChange - no files selected or files is null');
      }
    } catch (error) {
      console.error('[DeliveryInstall] Error in handleImageChange:', error);
    } finally {
      // Reset input để có thể chọn lại cùng file
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRetakeImages = () => {
    setImages([]);
    // Reset input trước khi mở lại
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    fileInputRef.current?.click();
  };

  const handleOpenCamera = () => {
    console.log('[DeliveryInstall] handleOpenCamera called');
    // Reset trước khi mở
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      console.log('[DeliveryInstall] fileInput reset');
    }
    console.log('[DeliveryInstall] triggering file input click');
    fileInputRef.current?.click();
  };

  // Helper: resize image to reduce size (reduce max size for mobile)
  const resizeImage = (file: File, maxWidth = 1024, maxHeight = 1024, quality = 0.7) => new Promise<Blob>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        console.log('[DeliveryInstall] Original image size:', width, 'x', height);

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

        console.log('[DeliveryInstall] Resized image size:', width, 'x', height);

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
            console.log('[DeliveryInstall] Resized blob size:', blob.size, 'bytes');
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

  // Helper: convert File to base64 string (remove data URL prefix)
  const fileToBase64 = async (file: File): Promise<string> => {
    try {
      // Resize image to reduce payload size
      const resizedBlob = await resizeImage(file);
      const resizedFile = new File([resizedBlob], file.name, { type: 'image/jpeg' });

      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || "");
          // Remove data URL prefix and return only base64 string (same as MaintenanceDetail)
          const base64String = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(resizedFile);
      });
    } catch (err) {
      console.error('[DeliveryInstall] Error resizing image:', err);
      // Fallback to original file if resize fails
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || "");
          const base64String = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setImages([]);
    setSelectedGoods([]);
    setSelectedDevices([]);
    setNote("");
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Xử lý hoàn tất báo cáo
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    // Validate: Phải có ít nhất 1 ảnh
    if (images.length === 0) {
      notify.error("Vui lòng chụp ít nhất 1 ảnh kết quả");
      return;
    }

    try {
      // Convert images to base64
      const base64Images = await Promise.all(images.map((f, idx) => {
        console.log(`[DeliveryInstall] Converting image ${idx + 1}/${images.length}`, {
          name: f.name,
          size: f.size,
          type: f.type
        });
        return fileToBase64(f);
      }));

      // Log base64 sizes
      base64Images.forEach((base64, idx) => {
        const sizeInKB = (base64.length * 3) / 4 / 1024;
        const sizeInMB = sizeInKB / 1024;
        console.log(`[DeliveryInstall] Base64 ${idx + 1}: ${base64.length} chars (${sizeInKB.toFixed(2)} KB / ${sizeInMB.toFixed(2)} MB)`);

        // Warn if image is too large
        if (sizeInMB > 1) {
          console.warn(`[DeliveryInstall] Image ${idx + 1} is quite large: ${sizeInMB.toFixed(2)} MB`);
        }
      });

      const totalBase64Length = base64Images.reduce((sum, b) => sum + b.length, 0);
      const totalSizeInMB = (totalBase64Length * 3) / 4 / 1024 / 1024;

      console.log('[DeliveryInstall] Submitting report:', {
        ticketId: id,
        imagesCount: images.length,
        productCodesCount: selectedGoods.length,
        serialsCount: selectedDevices.length,
        note: note || '(empty)',
        totalBase64Length,
        totalSizeMB: totalSizeInMB.toFixed(2)
      });

      console.log('[DeliveryInstall] Sending request to API...');

      const requestStartTime = Date.now();
      const res = await completeDeliveryInstallTicket({
        ticketId: id,
        note,
        productCodes: selectedGoods,
        serials: selectedDevices,
        base64Images,
      });

      const requestDuration = Date.now() - requestStartTime;
      console.log(`[DeliveryInstall] API Response received in ${requestDuration}ms:`, res);

      if (res.success) {
        console.log('[DeliveryInstall] Success! Refreshing data...');

        // Logic tạo ticket mới cho hàng hóa / thiết bị chưa được tick
        const allProductCodes = data?.orderInfo?.secretCodes?.map((it: any) => it.code) || [];
        const allSerials = data?.deviceInfo?.map((d: any) => d.serial || "").filter(Boolean) || [];
        const unfinishedCodes = allProductCodes.filter((c: string) => !selectedGoods.includes(c));
        const unfinishedSerials = allSerials.filter((s: string) => !selectedDevices.includes(s));

        // Toast 1: kết quả hoàn tất chính
        notify.success("Hoàn tất thành công", { description: `Ticket ${id} đã được cập nhật kết quả.` });
        setShowReportForm(false);
        resetForm();
        await refetch();

        // Toast 2: kết quả tạo ticket mới (delay để stack lần lượt)
        if ((unfinishedCodes.length > 0 || unfinishedSerials.length > 0) && data) {
          try {
            console.log('[DeliveryInstall] Creating residual ticket for unfinished items:', { unfinishedCodes, unfinishedSerials });
            const residualRes = await createResidualDeliveryTicket({
              originalTicket: data,
              unfinishedProductCodes: unfinishedCodes,
              unfinishedSerials,
            });
            setTimeout(() => {
              if (residualRes.success) {
                notify.success("Đã tạo ticket mới cho những item chưa hoàn thành.");
              } else {
                console.warn('[DeliveryInstall] Residual ticket creation failed:', residualRes);
                notify.error("Lỗi khi tạo ticket mới, vui lòng kiểm tra lại.");
              }
            }, 400);
          } catch (residualErr) {
            console.error('[DeliveryInstall] Error creating residual ticket:', residualErr);
            setTimeout(() => notify.error("Lỗi khi tạo ticket mới, vui lòng kiểm tra lại."), 400);
          }
        }

      } else {
        console.error('[DeliveryInstall] API returned error:', res);
        notify.error("Hoàn tất thất bại", { description: res.message || "Không thể gửi kết quả." });
      }
    } catch (err: any) {
      console.error('[DeliveryInstall] Error submitting report:', err);
      console.error('[DeliveryInstall] Error details:', {
        message: err?.message,
        stack: err?.stack,
        response: err?.response,
        body: err?.response?.data
      });

      let errorMessage = "Lỗi không xác định";
      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      notify.error("Hoàn tất thất bại", { description: errorMessage });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DetailTopNav title="Chi tiết Ticket" />
      <main className="container mx-auto px-4 py-6 pb-24 space-y-4">
        {/* Thông tin trạng thái và loại ticket */}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {id && (
              <div className="w-full text-center px-3 py-2 rounded-md text-sm font-mono bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]">#{id} </div>
            )}
          </div>
          {/* <div className="flex gap-2 shrink-0">
            {(isInProgress || isCompleted) && <Badge variant="secondary">Đã tiếp nhận</Badge>}
          </div> */}
        </div>
        {data && (
          <div className="flex justify-between gap-3">
            <div className={`flex-1 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getTicketTypeInfo(data.type).color}`}>
              {getTicketTypeInfo(data.type).icon}
              {getTicketTypeInfo(data.type).label}
            </div>
            <div className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusInfo(data.status).color}`}>
              {getStatusInfo(data.status).icon}
              {data.statusDisplayLabel}
            </div>
          </div>
        )}
        {data && isCompleted && (
          <div className="mt-4 rounded-2xl border border-primary/30 bg-gradient-to-r from-emerald-50 to-primary/10 px-4 py-5 sm:px-6 sm:py-6 shadow-sm">
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-inner">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div className="flex flex-col">
                  <div className="text-lg sm:text-xl font-semibold tracking-wide text-primary">ĐÃ HOÀN THÀNH</div>
                  {data.statusDisplayLabel && (
                    <div className="text-xs text-muted-foreground">{data.statusDisplayLabel}</div>
                  )}
                </div>
              </div>

              {(data.activityResult?.time || (data.activityResult?.imageUrls && data.activityResult.imageUrls.length > 0) || data.activityResult?.note) && (
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex gap-4">
                    {data.activityResult?.time && (
                      <div className="flex-1 rounded-xl border bg-white/70 p-3 backdrop-blur">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                          <AlarmClock className="h-4 w-4" /> Thời gian
                        </div>
                        <div className="mt-1 text-sm font-semibold">{formatDate(data.activityResult.time)}</div>
                      </div>
                    )}

                    {data.activityResult?.note && (
                      <div className="flex-1 rounded-xl border bg-white/70 p-3 backdrop-blur">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                          <StickyNote className="h-4 w-4" /> Ghi chú
                        </div>
                        <div className="mt-1 text-sm font-medium text-foreground whitespace-pre-wrap break-words">
                          {data.activityResult.note}
                        </div>
                      </div>
                    )}
                  </div>

                  {data.activityResult?.imageUrls && data.activityResult.imageUrls[0] && (
                    <div className="rounded-xl border bg-white/70 p-3 backdrop-blur">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                        <ImageIcon className="h-4 w-4" /> Hình ảnh
                      </div>
                      <button
                        type="button"
                        onClick={() => { setFinishedImageUrl(data.activityResult?.imageUrls?.[0]); setShowFinishedImage(true); }}
                        className="mt-2 block w-full overflow-hidden rounded-lg border hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                        aria-label="Xem hình ảnh hoàn thành"
                      >
                        <img src={data.activityResult.imageUrls[0]} alt="Hình ảnh hoàn thành" className="h-28 w-full object-cover" />
                      </button>
                    </div>
                  )}
                </div>
              )}
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
            {/* 1. Nhóm thông tin Khách hàng */}
            <Section title="Thông tin khách hàng" icon={<Building2 className="h-5 w-5" />} accentClass="text-sky-600">
              <div className="text-sm space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{data.customerInfo?.name}</span>
                </div>
                {data.customerInfo?.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{data.customerInfo.contactPhone}</span>
                  </div>
                )}
                {data.customerInfo?.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{data.customerInfo.contactEmail}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <AlarmClock className="h-4 w-4 text-orange-500" />
                  <span className="text-orange-600 font-medium">Hạn: {formatDate(data.deadline)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{data.customerInfo?.address}</span>
                </div>
              </div>
            </Section>

            {/* 2. Nhóm thông tin về đơn hàng */}
            {data.orderInfo && (
              <Section title="Thông tin đơn hàng" icon={<Receipt className="h-5 w-5" />} accentClass="text-emerald-600">
                <div className="text-sm space-y-3">
                  {data.orderInfo.orderCode && (
                    <div>
                      Mã đơn hàng: <span className="font-medium">{data.orderInfo.orderCode}</span>
                    </div>
                  )}
                  {data.orderInfo.customerName && (
                    <div>
                      Khách hàng: <span className="font-medium">{data.orderInfo.customerName}</span>
                    </div>
                  )}
                  {data.orderInfo.totalAmount !== undefined && (
                    <div>
                      Tổng tiền: <span className="font-medium">{Intl.NumberFormat('vi-VN').format(Number(data.orderInfo.totalAmount))} đ</span>
                    </div>
                  )}
                  {data.orderInfo.orderDate && (
                    <div>
                      Ngày đặt: <span className="font-medium">{formatDate(data.orderInfo.orderDate)}</span>
                    </div>
                  )}
                  {data.orderInfo.deliveryDate && (
                    <div>
                      Ngày giao dự kiến: <span className="font-medium">{formatDate(data.orderInfo.deliveryDate)}</span>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* 3. Danh sách các hàng hóa */}
            {data.orderInfo?.secretCodes && data.orderInfo.secretCodes.length > 0 && (
              <Section title="Danh sách hàng hóa" icon={<Package className="h-5 w-5" />} accentClass="text-amber-600" rightSlot={<span>{data.orderInfo.secretCodes.length} mặt hàng</span>}>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Mã hàng</TableHead>
                        <TableHead>Tên hàng</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.orderInfo.secretCodes.map((it, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/50">
                          <TableCell className="font-mono text-xs text-muted-foreground">{it.code}</TableCell>
                          <TableCell>
                            {Array.isArray(it.name) ? (
                              <ul className="list-disc pl-4 space-y-1">
                                {it.name.map((n: string, i: number) => (
                                  <li key={i}>{n}</li>
                                ))}
                              </ul>
                            ) : (
                              <div className="whitespace-pre-wrap">{it.name || "Mặt hàng"}</div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Section>
            )}

            {/* 4. Danh sách thiết bị */}
            {data.deviceInfo && data.deviceInfo.length > 0 && (
              <Section title="Danh sách thiết bị" icon={<Wrench className="h-5 w-5" />} accentClass="text-violet-600" rightSlot={<span>{data.deviceInfo.length} thiết bị</span>}>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">S/N hoặc Mã TB</TableHead>
                        <TableHead>Tên thiết bị</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.deviceInfo.map((d, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/50">
                          <TableCell className="font-mono text-xs text-muted-foreground">{d.serial || `TB-${idx + 1}`}</TableCell>
                          <TableCell>
                            {Array.isArray(d.model) ? (
                              <ul className="list-disc pl-4 space-y-1">
                                {d.model.map((m: string, i: number) => (
                                  <li key={i}>{m}</li>
                                ))}
                              </ul>
                            ) : (
                              <div className="whitespace-pre-wrap">{d.model || "Thiết bị"}</div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Section>
            )}
          </div>
        )}

        {/* Form báo cáo kết quả hoàn tất */}
        {showReportForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <form className="bg-background rounded-xl shadow-lg p-4 sm:p-6 w-full max-w-md md:max-w-lg space-y-4 relative max-h-[85vh] overflow-y-auto" onSubmit={handleSubmitReport}>
              <button type="button" aria-label="Đóng" className="absolute top-3 right-3 text-muted-foreground hover:text-foreground" onClick={() => {
                setShowReportForm(false);
                resetForm();
              }}>
                <X className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-bold mb-2">Báo cáo kết quả thực hiện</h2>
              <div>
                <label className="block text-sm font-medium mb-1">Chụp ảnh kết quả</label>
                <input
                  ref={fileInputRef}
                  id="result-images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <Button type="button" variant="outline" size="sm" onClick={handleOpenCamera}>
                    <Camera />
                    {images.length === 0 ? "Chọn ảnh" : "Thêm ảnh"}
                  </Button>
                  {images.length > 0 && (
                    <>
                      <Button type="button" variant="ghost" size="sm" onClick={handleRetakeImages}>
                        Xóa tất cả
                      </Button>
                      <span className="text-sm text-muted-foreground">{images.length} ảnh đã chọn</span>
                    </>
                  )}
                </div>
                {images.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative">
                        <img src={URL.createObjectURL(img)} alt="preview" className="h-16 w-16 object-cover rounded border" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
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
              {data?.orderInfo?.secretCodes?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1">Chọn hàng hóa đã xử lý</label>
                  <button type="button" className="text-xs underline mb-2" onClick={handleSelectAllGoods}>{selectedGoods.length === (data.orderInfo.secretCodes?.length || 0) ? "Bỏ chọn tất cả" : "Chọn tất cả"}</button>
                  <div className="grid grid-cols-1 gap-2">
                    {data.orderInfo.secretCodes.map((it: any, idx: number) => (
                      <label key={idx} className="flex items-center gap-2 border rounded p-2">
                        <input type="checkbox" checked={selectedGoods.includes(it.code)} onChange={() => handleGoodsChange(it.code)} />
                        <span className="text-xs font-mono">{it.code}</span>
                        <span className="text-sm">{it.name || "Mặt hàng"}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {data?.deviceInfo?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1">Chọn thiết bị đã xử lý</label>
                  <button type="button" className="text-xs underline mb-2" onClick={handleSelectAllDevices}>{selectedDevices.length === (data.deviceInfo?.length || 0) ? "Bỏ chọn tất cả" : "Chọn tất cả"}</button>
                  <div className="grid grid-cols-1 gap-2">
                    {data.deviceInfo.map((d: any, idx: number) => (
                      <label key={idx} className="flex items-center gap-2 border rounded p-2">
                        <input type="checkbox" checked={selectedDevices.includes(d.serial)} onChange={() => handleDeviceChange(d.serial)} />
                        <span className="text-xs font-mono">{d.serial || `TB-${idx + 1}`}</span>
                        <span className="text-sm">{d.model || "Thiết bị"}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <textarea className="w-full border rounded p-2" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Nhập ghi chú cho kỹ thuật viên..." />
              </div>
              <Button type="submit" size="lg" className="w-full">
                <CheckCircle />
                Hoàn tất
              </Button>
            </form>
          </div>
        )}
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3 flex items-center gap-2">
          {data && isAssigned && (
            <Button onClick={async () => {
              if (!id) return;
              const res = await acceptDeliveryInstallTicket(id);
              if (res.success) {
                setShowSuccessModal(true);
                await refetch();
              }
            }} size="lg" className="flex-1">
              <PlayCircle />
              Tiếp nhận thực hiện
            </Button>
          )}
          {data && isInProgress && (
            <Button variant="secondary" size="lg" onClick={() => setShowReportForm(true)} className="flex-1">
              <CheckCircle />
              Hoàn tất
            </Button>
          )}
        </div>
      </div>

      {/* Finished Image Preview */}
      <Dialog open={showFinishedImage} onOpenChange={setShowFinishedImage}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-center">Hình ảnh hoàn thành</DialogTitle>
          </DialogHeader>
          {finishedImageUrl && (
            <div className="w-full">
              <img src={finishedImageUrl} alt="Hình ảnh hoàn thành" className="w-full h-auto rounded-lg border" />
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                navigate("/delivery-install");
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

export default DeliveryInstallDetail;


