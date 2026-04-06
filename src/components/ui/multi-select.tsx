"use client"

import * as PopoverPrimitive from "@radix-ui/react-popover"
import { IconChevronDown } from "@tabler/icons-react"
import * as React from "react"

import { cn } from "@/lib/utils"
import { Checkbox } from "./checkbox"

export interface MultiSelectOption {
  value: string
  label: string
}

export interface MultiSelectProps {
  options: MultiSelectOption[]
  value?: string[]
  onChange?: (value: string[]) => void
  placeholder?: string
  name?: string
  disabled?: boolean
  className?: string
}

export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = "Sélectionner...",
  name,
  disabled = false,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const toggle = (optValue: string) => {
    if (!onChange) return
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue))
    } else {
      onChange([...value, optValue])
    }
  }

  const selectedLabels = options
    .filter((o) => value.includes(o.value))
    .map((o) => o.label)
    .join(", ")

  return (
    <>
      {name &&
        value.map((v) => (
          <input key={v} type="hidden" name={`${name}[]`} value={v} />
        ))}
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild disabled={disabled}>
          <button
            type="button"
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-lg border border-dark-700 bg-dark-950 px-3 py-2 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-600 focus-visible:border-primary-600 disabled:cursor-not-allowed disabled:opacity-50",
              value.length === 0 ? "text-gray-600" : "text-white",
              className
            )}
          >
            <span className="truncate">{selectedLabels || placeholder}</span>
            <IconChevronDown className="h-4 w-4 text-gray-500 shrink-0 ml-2" />
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-50 rounded-lg border border-dark-700 bg-dark-900 shadow-xl p-1 outline-none"
          style={{ width: "var(--radix-popover-trigger-width)" }}
        >
          <div className="max-h-60 overflow-y-auto">
            {options.map((option) => (
              <div
                key={option.value}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white cursor-pointer hover:bg-dark-700 select-none"
                onClick={() => toggle(option.value)}
              >
                <Checkbox
                  checked={value.includes(option.value)}
                  onCheckedChange={() => toggle(option.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Root>
    </>
  )
}
