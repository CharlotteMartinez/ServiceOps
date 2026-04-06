import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  checkDeviceBySerial, 
  fetchMaintenanceTicketCategories, 
  fetchMaintenanceTicketTypes, 
  createEmergencyMaintenanceTicket, 
  CreateEmergencyMaintenanceInput,
  DeviceInfo,
  fetchCustomers,
  Customer,
  fetchDevices,
  Device,
  fetchBrands
} from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CustomerCombobox } from "@/components/ui/customer-combobox";
import { DeviceCombobox } from "@/components/ui/device-combobox";
import { toast } from "sonner";
import { Check, AlertCircle, Pencil } from "lucide-react";

interface CreateEmergencyMaintenanceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateEmergencyMaintenanceForm: React.FC<CreateEmergencyMaintenanceFormProps> = ({ open, onOpenChange }) => {
  const queryClient = useQueryClient();
  
  // Form state
  const [formData, setFormData] = useState<CreateEmergencyMaintenanceInput>({
    name: "",
    phone: "",
    email: "",
    company: "",
    serial: "",
    issue: "",
    category: "none",
    service_type: "none",
    arrive_time: "",
    complete_time: "",
    install_date: ""
  });
  
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isCheckingDevice, setIsCheckingDevice] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isManualDeviceInput, setIsManualDeviceInput] = useState(false);
  const [manualDeviceData, setManualDeviceData] = useState({
    brand: "",
    model: "",
    serial: "",
    installDate: "",
  });

  // Fetch customers
  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => (await fetchCustomers()).data || [],
    enabled: open,
  });

  // Fetch devices
  const { data: devices, isLoading: isLoadingDevices } = useQuery({
    queryKey: ["devices"],
    queryFn: async () => (await fetchDevices()).data || [],
    enabled: open,
  });

  // Fetch brands
  const { data: brands, isLoading: isLoadingBrands } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => (await fetchBrands()).data || [],
    enabled: open,
  });
  const brandOptions = brands ?? [];

  // Fetch maintenance ticket categories
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["maintenance-categories"],
    queryFn: async () => (await fetchMaintenanceTicketCategories()).data || [],
    enabled: open,
  });

  // Fetch maintenance ticket types
  const { data: serviceTypes, isLoading: isLoadingTypes } = useQuery({
    queryKey: ["maintenance-types"],
    queryFn: async () => (await fetchMaintenanceTicketTypes()).data || [],
    enabled: open,
  });

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: createEmergencyMaintenanceTicket,
    onSuccess: () => {
      toast.success("Tạo ticket khẩn cấp thành công!");
      queryClient.invalidateQueries({ queryKey: ["tickets", "maintenance"] });
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Có lỗi xảy ra khi tạo ticket");
    },
  });

  const handleClose = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      company: "",
      serial: "",
      issue: "",
      category: "none",
      service_type: "none",
      arrive_time: "",
      complete_time: "",
      install_date: ""
    });
    setDeviceInfo(null);
    setSelectedCustomer(null);
    setSelectedDevice(null);
    setIsManualDeviceInput(false);
    setManualDeviceData({
      brand: "",
      model: "",
      serial: "",
      installDate: "",
    });
    onOpenChange(false);
  };

  const sanitizeCustomerField = (value?: string | null) => {
    if (!value || value === "undefined") return "";
    return value;
  };

  const formatDisplayValue = (value?: string | null) => {
    const sanitized = sanitizeCustomerField(value);
    return sanitized || "Không có";
  };

  const handleCustomerSelect = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    if (customer) {
      // Auto-fill form fields from selected customer
      setFormData(prev => ({
        ...prev,
        name: sanitizeCustomerField(customer["contact-name"]),
        phone: sanitizeCustomerField(customer["phone"]),
        email: sanitizeCustomerField(customer["email"]),
        company: sanitizeCustomerField(customer["customer-name"]),
      }));
    } else {
      // Clear customer fields if deselected
      setFormData(prev => ({
        ...prev,
        name: "",
        phone: "",
        email: "",
        company: "",
      }));
    }
  };

  const handleDeviceSelect = (device: Device | null) => {
    setSelectedDevice(device);
    setIsManualDeviceInput(false);
    if (device) {
      // Auto-fill form fields from selected device
      setFormData(prev => ({
        ...prev,
        serial: sanitizeCustomerField(device["serial-number"]),
        install_date: sanitizeCustomerField(device["install-date"]),
      }));
      setDeviceInfo({
        brand: sanitizeCustomerField(device.brand) || undefined,
        model: sanitizeCustomerField(device.model) || undefined,
        "install-date": sanitizeCustomerField(device["install-date"]) || undefined,
      });
    } else {
      // Clear device fields if deselected
      setFormData(prev => ({
        ...prev,
        serial: "",
        install_date: "",
      }));
      setDeviceInfo(null);
    }
  };

  const handleToggleManualDeviceInput = () => {
    setIsManualDeviceInput(!isManualDeviceInput);
    if (!isManualDeviceInput) {
      // Switching to manual mode - clear selected device
      setSelectedDevice(null);
      setDeviceInfo(null);
    } else {
      // Switching back to dropdown mode - clear manual data
      setManualDeviceData({
        brand: "",
        model: "",
        serial: "",
        installDate: "",
      });
      setFormData(prev => ({
        ...prev,
        serial: "",
        install_date: "",
      }));
    }
  };

  const handleCheckDevice = async () => {
    if (!formData.serial.trim()) {
      toast.error("Vui lòng nhập Serial Number");
      return;
    }

    setIsCheckingDevice(true);
    try {
      console.log("Checking device with serial:", formData.serial);
      const result = await checkDeviceBySerial(formData.serial);
      console.log("Device check result:", result);
      
      if (result.success && result.data) {
        setDeviceInfo(result.data);
        setFormData(prev => ({
          ...prev,
          install_date: sanitizeCustomerField(result.data["install-date"]),
        }));
        toast.success("Kiểm tra thiết bị thành công!");
      } else {
        setDeviceInfo(null);
        setFormData(prev => ({
          ...prev,
          install_date: "",
        }));
        toast.error(result.message || "Serial không tồn tại");
      }
    } catch (error) {
      console.error("Device check error:", error);
      setDeviceInfo(null);
      toast.error("Có lỗi xảy ra khi kiểm tra thiết bị");
    } finally {
      setIsCheckingDevice(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer) {
      toast.error("Vui lòng chọn khách hàng");
      return;
    }
    
    if (!formData.name.trim()) {
      toast.error("Vui lòng nhập họ và tên");
      return;
    }
    
    if (!formData.phone.trim()) {
      toast.error("Vui lòng nhập số điện thoại");
      return;
    }

    // Validate device info
    if (!isManualDeviceInput && !selectedDevice) {
      toast.error("Vui lòng chọn thiết bị hoặc nhập thông tin thiết bị");
      return;
    }

    if (isManualDeviceInput && !manualDeviceData.serial.trim()) {
      toast.error("Vui lòng nhập Serial Number");
      return;
    }

    if (!isManualDeviceInput && !formData.serial.trim()) {
      toast.error("Vui lòng chọn thiết bị");
      return;
    }

    // Prepare device info for submission
    let brand = "";
    let model = "";
    let serial = "";
    let installDate = "";

    if (isManualDeviceInput) {
      // Use manual input data
      brand = manualDeviceData.brand;
      model = manualDeviceData.model;
      serial = manualDeviceData.serial;
      installDate = manualDeviceData.installDate;
    } else if (selectedDevice) {
      // Use selected device data
      brand = sanitizeCustomerField(selectedDevice.brand) || "";
      model = sanitizeCustomerField(selectedDevice.model) || "";
      serial = sanitizeCustomerField(selectedDevice["serial-number"]) || "";
      installDate = sanitizeCustomerField(selectedDevice["install-date"]) || "";
    }

    const submitData = {
      ...formData,
      serial: serial || formData.serial,
      category: formData.category === "none" ? "" : formData.category,
      service_type: formData.service_type === "none" ? "" : formData.service_type,
      // Add device info
      brand: brand,
      model: model,
      install_date: installDate || formData.install_date || "",
    };

    createTicketMutation.mutate(submitData);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN");
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Tạo xử lý khẩn cấp</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Chọn khách hàng */}
          <div className="space-y-2">
            <Label>Khách hàng *</Label>
            <CustomerCombobox
              customers={customers || []}
              value={selectedCustomer?.["record-id"]}
              onSelect={handleCustomerSelect}
              placeholder="Chọn khách hàng..."
              disabled={isLoadingCustomers}
            />
            {isLoadingCustomers && (
              <p className="text-sm text-muted-foreground">Đang tải danh sách khách hàng...</p>
            )}
          </div>

          {/* Hiển thị thông tin khách hàng đã chọn */}
          {selectedCustomer && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md space-y-2">
              <div className="text-sm font-medium text-blue-900">Thông tin khách hàng đã chọn:</div>
              <div className="text-sm space-y-1">
                <div>
                  <span className="font-medium">Khách hàng:</span>{" "}
                  {formatDisplayValue(selectedCustomer["customer-name"])}
                </div>
                <div>
                  <span className="font-medium">Họ và tên:</span>{" "}
                  {formatDisplayValue(selectedCustomer["contact-name"])}
                </div>
                <div>
                  <span className="font-medium">Email:</span>{" "}
                  {formatDisplayValue(selectedCustomer["email"])}
                </div>
              </div>
            </div>
          )}

          {/* Chọn thiết bị */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Thiết bị *</Label>
              {!isManualDeviceInput && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleManualDeviceInput}
                  className="h-8 px-2"
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  <span className="text-xs">Nhập thủ công</span>
                </Button>
              )}
            </div>

            {isManualDeviceInput ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Nhập thông tin thiết bị</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleManualDeviceInput}
                    className="h-8 px-2 text-xs"
                  >
                    Chọn từ danh sách
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="manual-serial">Serial Number *</Label>
                    <Input
                      id="manual-serial"
                      value={manualDeviceData.serial}
                      onChange={(e) => setManualDeviceData(prev => ({ ...prev, serial: e.target.value }))}
                      placeholder="Nhập Serial Number"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="manual-brand">Hãng thiết bị</Label>
                    <Input
                      id="manual-brand"
                      list="brand-suggestions"
                      value={manualDeviceData.brand}
                      onChange={(e) => setManualDeviceData(prev => ({ ...prev, brand: e.target.value }))}
                      placeholder={isLoadingBrands ? "Đang tải danh sách hãng..." : "Nhập hoặc chọn hãng thiết bị"}
                      disabled={isLoadingBrands && brandOptions.length === 0}
                    />
                    <datalist id="brand-suggestions">
                      {brandOptions.map((brand) => (
                        <option key={brand} value={brand} />
                      ))}
                    </datalist>
                  </div>
                  
                  <div>
                    <Label htmlFor="manual-model">Model</Label>
                    <Input
                      id="manual-model"
                      value={manualDeviceData.model}
                      onChange={(e) => setManualDeviceData(prev => ({ ...prev, model: e.target.value }))}
                      placeholder="Nhập model"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="manual-install-date">Ngày lắp đặt</Label>
                    <Input
                      id="manual-install-date"
                      type="date"
                      value={manualDeviceData.installDate}
                      onChange={(e) => setManualDeviceData(prev => ({ ...prev, installDate: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <DeviceCombobox
                  devices={devices || []}
                  value={selectedDevice?.["record-id"]}
                  onSelect={handleDeviceSelect}
                  placeholder="Chọn thiết bị..."
                  disabled={isLoadingDevices}
                />
                {isLoadingDevices && (
                  <p className="text-sm text-muted-foreground">Đang tải danh sách thiết bị...</p>
                )}
                
                {/* Hiển thị thông tin thiết bị đã chọn */}
                {selectedDevice && deviceInfo && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="text-sm font-medium text-green-900 mb-2">Thông tin thiết bị đã chọn:</div>
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="font-medium">Serial:</span>{" "}
                        {formatDisplayValue(selectedDevice["serial-number"])}
                      </div>
                      {deviceInfo.brand && deviceInfo.brand !== "undefined" && (
                        <div>
                          <span className="font-medium">Hãng:</span> {deviceInfo.brand}
                        </div>
                      )}
                      {deviceInfo.model && deviceInfo.model !== "undefined" && (
                        <div>
                          <span className="font-medium">Model:</span> {deviceInfo.model}
                        </div>
                      )}
                      {deviceInfo["install-date"] && deviceInfo["install-date"] !== "undefined" && (
                        <div>
                          <span className="font-medium">Ngày lắp đặt:</span> {formatDate(deviceInfo["install-date"])}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Mô tả vấn đề */}
          <div className="space-y-2">
            <Label htmlFor="issue">Mô tả vấn đề</Label>
            <Textarea
              id="issue"
              value={formData.issue}
              onChange={(e) => setFormData(prev => ({ ...prev, issue: e.target.value }))}
              placeholder="Nhập mô tả chi tiết vấn đề"
              rows={3}
            />
          </div>

          {/* Phân loại */}
          <div className="space-y-2">
            <Label htmlFor="category">Phân loại</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn phân loại" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingCategories ? (
                  <SelectItem value="loading" disabled>Đang tải...</SelectItem>
                ) : (
                  <>
                    <SelectItem value="none">-- Chọn phân loại --</SelectItem>
                    {categories?.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Loại dịch vụ */}
          <div className="space-y-2">
            <Label htmlFor="service_type">Loại dịch vụ</Label>
            <Select
              value={formData.service_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, service_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn loại dịch vụ" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingTypes ? (
                  <SelectItem value="loading" disabled>Đang tải...</SelectItem>
                ) : (
                  <>
                    <SelectItem value="none">-- Chọn loại dịch vụ --</SelectItem>
                    {serviceTypes?.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Đến nơi lúc */}
          <div className="space-y-2">
            <Label htmlFor="arrive_time">Đến nơi lúc</Label>
            <Input
              id="arrive_time"
              type="datetime-local"
              value={formData.arrive_time}
              onChange={(e) => setFormData(prev => ({ ...prev, arrive_time: e.target.value }))}
            />
          </div>

          {/* Hoàn thành lúc */}
          <div className="space-y-2">
            <Label htmlFor="complete_time">Hoàn thành lúc</Label>
            <Input
              id="complete_time"
              type="datetime-local"
              value={formData.complete_time}
              onChange={(e) => setFormData(prev => ({ ...prev, complete_time: e.target.value }))}
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
              className="bg-red-500 hover:bg-red-600"
            >
              {createTicketMutation.isPending ? "Đang tạo..." : "Tạo ticket khẩn cấp"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEmergencyMaintenanceForm;
