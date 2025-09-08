"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X, type LucideIcon } from "lucide-react"

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
import { Badge } from "@/components/ui/badge"

type ComboboxItem = {
  value: string;
  label: string;
};

interface MultiSelectComboboxProps {
  items: ComboboxItem[];
  selected: string[];
  setSelected: (selected: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  icon?: LucideIcon;
}

export function MultiSelectCombobox({
  items,
  selected,
  setSelected,
  placeholder = "Select items...",
  searchPlaceholder = "Search items...",
  noResultsText = "No item found.",
  icon: Icon,
}: MultiSelectComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (value: string) => {
    const isSelected = selected.includes(value);
    if (isSelected) {
      setSelected(selected.filter((item) => item !== value));
    } else {
      setSelected([...selected, value]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full md:w-[300px] justify-between font-normal h-10"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
            {selected.length > 0 ? (
              <div className="flex flex-nowrap gap-1">
                 {selected.slice(0, 2).map((value) => (
                    <Badge variant="secondary" key={value} className="shrink-0">
                      {items.find(item => item.value === value)?.label}
                    </Badge>
                  ))}
                  {selected.length > 2 && (
                    <Badge variant="secondary" className="shrink-0">+{selected.length - 2} more</Badge>
                  )}
              </div>
            ) : (
              placeholder
            )}
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
              {/* This check ensures 'items' is an array before mapping, resolving the TS error. */}
              {Array.isArray(items) && items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={() => handleSelect(item.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.includes(item.value) ? "opacity-100" : "opacity-0"
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