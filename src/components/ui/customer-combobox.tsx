import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Customer, searchCustomers } from "@/lib/api";

interface CustomerComboboxProps {
  customers: Customer[];
  value?: string; // record-id
  onSelect?: (customer: Customer | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CustomerCombobox({
  customers: initialCustomers,
  value,
  onSelect,
  placeholder = "Chọn khách hàng...",
  disabled = false,
}: CustomerComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [dynamicCustomers, setDynamicCustomers] = React.useState<Customer[]>(initialCustomers);
  // Cache khách hàng đã chọn từ kết quả tìm kiếm để giữ hiển thị tên sau khi search bị reset
  const [selectedCustomerCache, setSelectedCustomerCache] = React.useState<Customer | null>(null);

  // Sync initial customers when they change
  React.useEffect(() => {
    setDynamicCustomers(initialCustomers);
  }, [initialCustomers]);

  const selectedCustomer = React.useMemo(() => {
    // Tìm trong danh sách hiện tại trước
    const found = dynamicCustomers.find((c) => c["record-id"] === value);
    if (found) return found;
    // Fallback: dùng cache nếu record-id khớp (khi customer từ search không còn trong list)
    if (selectedCustomerCache && selectedCustomerCache["record-id"] === value) return selectedCustomerCache;
    return null;
  }, [dynamicCustomers, value, selectedCustomerCache]);

  // Debounced search effect
  React.useEffect(() => {
    if (!search.trim()) {
      // Khi xoá search, giữ lại khách hàng đã chọn (nếu có) bên cạnh danh sách gốc
      if (selectedCustomerCache && value === selectedCustomerCache["record-id"]) {
        const alreadyInList = initialCustomers.some((c) => c["record-id"] === selectedCustomerCache["record-id"]);
        if (!alreadyInList) {
          setDynamicCustomers([selectedCustomerCache, ...initialCustomers]);
          return;
        }
      }
      setDynamicCustomers(initialCustomers);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchCustomers(search);
        if (res.success && res.data) {
          setDynamicCustomers(res.data);
        }
      } catch (error) {
        console.error("Failed to search customers:", error);
      } finally {
        setLoading(false);
      }
    }, 1000); // 1000ms debounce (1s delay)

    return () => clearTimeout(timer);
  }, [search, initialCustomers, selectedCustomerCache, value]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10 py-2"
          disabled={disabled}
        >
          {selectedCustomer ? (
            <div className="flex flex-col items-start flex-1 min-w-0 text-left pr-2">
              <span className="w-full text-left whitespace-normal break-words leading-tight">
                {selectedCustomer["customer-name"]}
              </span>
              <span className="text-xs text-muted-foreground w-full text-left mt-1">
                {selectedCustomer["customer-id"]}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground text-left">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command className="h-[300px]" shouldFilter={false}>
          <CommandInput
            placeholder="Tìm theo tên hoặc ID khách hàng..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList
            className="max-h-[250px] overflow-y-auto"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Đang tìm kiếm...</span>
              </div>
            ) : dynamicCustomers.length === 0 ? (
              <CommandEmpty>Không tìm thấy khách hàng.</CommandEmpty>
            ) : (
              <CommandGroup>
                {dynamicCustomers.map((customer) => (
                  <CommandItem
                    key={customer["record-id"]}
                    value={customer["record-id"]}
                    onSelect={() => {
                      const isSelected = value === customer["record-id"];
                      if (!isSelected) {
                        // Cache khách hàng được chọn để hiển thị tên kể cả sau khi search reset
                        setSelectedCustomerCache(customer);
                      } else {
                        setSelectedCustomerCache(null);
                      }
                      onSelect?.(isSelected ? null : customer);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 flex-shrink-0 h-4 w-4",
                        value === customer["record-id"]
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1 min-w-0 py-1">
                      <span className="whitespace-normal break-words leading-tight text-left">{customer["customer-name"]}</span>
                      <span className="text-xs text-muted-foreground text-left mt-0.5">
                        {customer["customer-id"]}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
