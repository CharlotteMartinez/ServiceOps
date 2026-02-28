import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { Customer } from "@/lib/api";

interface CustomerComboboxProps {
  customers: Customer[];
  value?: string; // record-id
  onSelect?: (customer: Customer | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CustomerCombobox({
  customers,
  value,
  onSelect,
  placeholder = "Chọn khách hàng...",
  disabled = false,
}: CustomerComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedCustomer = React.useMemo(() => {
    return customers.find((c) => c["record-id"] === value) || null;
  }, [customers, value]);

  const filteredCustomers = React.useMemo(() => {
    if (!search.trim()) return customers;
    const searchLower = search.toLowerCase();
    return customers.filter(
      (customer) =>
        customer["customer-name"].toLowerCase().includes(searchLower) ||
        customer["customer-id"].toLowerCase().includes(searchLower)
    );
  }, [customers, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedCustomer ? (
            <div className="flex flex-col items-start flex-1 min-w-0 text-left">
              <span className="truncate w-full text-left">
                {selectedCustomer["customer-name"]}
              </span>
              <span className="text-xs text-muted-foreground truncate w-full text-left">
                {selectedCustomer["customer-id"]}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground text-left">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Tìm theo tên hoặc ID khách hàng..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Không tìm thấy khách hàng.</CommandEmpty>
            <CommandGroup>
              {filteredCustomers.map((customer) => (
                <CommandItem
                  key={customer["record-id"]}
                  value={customer["record-id"]}
                  onSelect={() => {
                    const isSelected = value === customer["record-id"];
                    onSelect?.(isSelected ? null : customer);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === customer["record-id"]
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{customer["customer-name"]}</span>
                    <span className="text-xs text-muted-foreground">
                      {customer["customer-id"]}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

