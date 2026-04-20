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
import { Device } from "@/lib/api";

interface DeviceComboboxProps {
  devices: Device[];
  value?: string; // record-id
  onSelect?: (device: Device | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DeviceCombobox({
  devices,
  value,
  onSelect,
  placeholder = "Chọn thiết bị...",
  disabled = false,
}: DeviceComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedDevice = React.useMemo(() => {
    return devices.find((d) => d["record-id"] === value) || null;
  }, [devices, value]);

  const filteredDevices = React.useMemo(() => {
    if (!search.trim()) return devices;
    const searchLower = search.toLowerCase();
    return devices.filter(
      (device) =>
        device["serial-number"].toLowerCase().includes(searchLower) ||
        device.brand.toLowerCase().includes(searchLower) ||
        device.model.toLowerCase().includes(searchLower)
    );
  }, [devices, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left"
          disabled={disabled}
        >
          {selectedDevice ? (
            <div className="flex flex-col items-start flex-1 min-w-0">
              <span className="truncate">
                {selectedDevice.brand} - {selectedDevice.model}
              </span>
              <span className="text-xs text-muted-foreground truncate w-full">
                {selectedDevice["serial-number"]}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Tìm theo serial, hãng hoặc model..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Không tìm thấy thiết bị.</CommandEmpty>
            <CommandGroup>
              {filteredDevices.map((device) => (
                <CommandItem
                  key={device["record-id"]}
                  value={device["record-id"]}
                  onSelect={() => {
                    const isSelected = value === device["record-id"];
                    onSelect?.(isSelected ? null : device);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === device["record-id"]
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>
                      {device.brand} - {device.model}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {device["serial-number"]}
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

