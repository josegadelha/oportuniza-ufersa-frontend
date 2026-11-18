import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import styles from './CustomSelect.module.css'

export interface CustomSelectOption {
  value: string
  label: string
}

interface CustomSelectProps {
  align?: 'left' | 'right'
  ariaLabel: string
  className?: string
  menuClassName?: string
  onChange: (value: string) => void
  options: CustomSelectOption[]
  triggerClassName?: string
  value: string
}

function CustomSelect({
  align = 'left',
  ariaLabel,
  className,
  menuClassName,
  onChange,
  options,
  triggerClassName,
  value,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLDivElement | null>>([])
  const listboxId = useId()
  const selectedIndex = options.findIndex((option) => option.value === value)
  const selectedOption = options[selectedIndex]
  const boundedActiveIndex = Math.max(0, Math.min(activeIndex, options.length - 1))

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    optionRefs.current[boundedActiveIndex]?.focus()
  }, [boundedActiveIndex, isOpen])

  const open = (index = selectedIndex >= 0 ? selectedIndex : 0) => {
    setActiveIndex(index)
    setIsOpen(true)
  }

  const close = (restoreFocus: boolean) => {
    setIsOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault()
      close(true)
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      if (!isOpen) {
        open(event.key === 'ArrowDown'
          ? (selectedIndex >= 0 ? selectedIndex : 0)
          : (selectedIndex >= 0 ? selectedIndex : options.length - 1))
      } else {
        setActiveIndex((boundedActiveIndex + direction + options.length) % options.length)
      }
      return
    }

    if (isOpen && event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
    } else if (isOpen && event.key === 'End') {
      event.preventDefault()
      setActiveIndex(options.length - 1)
    } else if (isOpen && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      const activeOption = options[boundedActiveIndex]
      if (activeOption) {
        onChange(activeOption.value)
        close(true)
      }
    }
  }

  return (
    <div
      className={`${styles.root} ${className ?? ''}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false)
        }
      }}
      onKeyDown={handleKeyDown}
      ref={rootRef}
    >
      <button
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={`${styles.trigger} ${triggerClassName ?? ''}`}
        onClick={() => {
          if (isOpen) close(false)
          else open()
        }}
        ref={triggerRef}
        type="button"
      >
        <span className={styles.triggerLabel}>{selectedOption?.label ?? ''}</span>
        <ChevronDown aria-hidden="true" className={styles.chevron} size={16} />
      </button>
      {isOpen && (
        <div
          aria-label={ariaLabel}
          className={`${styles.menu} ${align === 'right' ? styles.menuRight : ''} ${
            menuClassName ?? ''
          }`}
          id={listboxId}
          role="listbox"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value
            const isActive = index === boundedActiveIndex
            return (
              <div
                aria-selected={isSelected}
                className={`${styles.option} ${isSelected ? styles.optionSelected : ''} ${
                  isActive ? styles.optionActive : ''
                }`}
                id={`${listboxId}-option-${index}`}
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  close(true)
                }}
                onMouseEnter={() => setActiveIndex(index)}
                ref={(element) => { optionRefs.current[index] = element }}
                role="option"
                tabIndex={isActive ? 0 : -1}
              >
                <span>{option.label}</span>
                {isSelected && <Check aria-hidden="true" className={styles.check} size={16} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CustomSelect
