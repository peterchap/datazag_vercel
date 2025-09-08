"use client"

import * as React from "react"
import { Check, ChevronsUpDown, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// Define the shape of each item in the combobox list
type ComboboxItem = {
  value: string;
  label: string;
};

// Define the props for the reusable Combobox component
interface ComboboxProps {
  items: ComboboxItem[];
  value: string | null;
  setValue: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  icon?: LucideIcon;
}

export function Combobox({
  items,
  value,
  setValue,
  placeholder = "Select an item...",
  searchPlaceholder = "Search items...",
  noResultsText = "No item found.",
  icon: Icon,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedItem = items.find((item) => item.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full md:w-[250px] justify-between font-normal"
        >
          <div className="flex items-center">
            {Icon && <Icon className="mr-2 h-4 w-4 text-muted-foreground" />}
            {selectedItem ? selectedItem.label : placeholder}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{noResultsText}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={(currentValue) => {
                    // If the user selects the same item, clear the selection. Otherwise, set the new value.
                    setValue(currentValue === value ? null : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
