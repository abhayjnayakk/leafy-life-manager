"use client"

import { motion, AnimatePresence, useSpring, useMotionValue, useTransform, type Variants } from "framer-motion"
import { useEffect, useRef, type ReactNode } from "react"

// ============================================================
// ANIMATION VARIANTS
// ============================================================

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
}

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.02,
    },
  },
}

export const listStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
}

// ============================================================
// ANIMATED PAGE WRAPPER
// ============================================================

export function AnimatedPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ============================================================
// ANIMATED CARD with stagger support
// ============================================================

export function AnimatedCard({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      transition={{
        duration: 0.4,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ============================================================
// STAGGER WRAPPER for lists of cards
// ============================================================

export function StaggerGroup({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      variants={fadeInUp}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ============================================================
// ANIMATED NUMBER (count-up effect)
// ============================================================

export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  className,
  formatFn,
}: {
  value: number
  prefix?: string
  suffix?: string
  className?: string
  formatFn?: (n: number) => string
}) {
  const motionValue = useMotionValue(value)
  const springValue = useSpring(motionValue, {
    stiffness: 100,
    damping: 20,
    mass: 0.5,
  })
  const display = useTransform(springValue, (v) => {
    const rounded = Math.round(v)
    const formatted = formatFn ? formatFn(rounded) : rounded.toLocaleString("en-IN")
    return `${prefix}${formatted}${suffix}`
  })

  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => {
      if (ref.current) ref.current.textContent = v
    })
    return unsubscribe
  }, [display])

  const initialDisplay = formatFn ? formatFn(value) : value.toLocaleString("en-IN")
  return <span ref={ref} className={className}>{prefix}{initialDisplay}{suffix}</span>
}

// ============================================================
// ANIMATED BADGE (spring pop-in)
// ============================================================

export function AnimatedBadge({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className={className}
    >
      {children}
    </motion.span>
  )
}

// ============================================================
// SCALE ON TAP (tactile press effect)
// ============================================================

export function ScaleOnTap({
  children,
  className,
  scale = 0.97,
}: {
  children: ReactNode
  className?: string
  scale?: number
}) {
  return (
    <motion.div
      whileTap={{ scale }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ============================================================
// ANIMATED EXPAND/COLLAPSE
// ============================================================

export function AnimatedCollapse({
  open,
  children,
  className,
}: {
  open: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className={`overflow-hidden ${className ?? ""}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================
// ANIMATED PRESENCE WRAPPER (for conditional renders)
// ============================================================

export function AnimatedPresence({
  show,
  children,
  className,
}: {
  show: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================
// FLASH EFFECT (brief highlight on action)
// ============================================================

export function FlashOverlay({ color = "rgba(91, 140, 90, 0.2)" }: { color?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0.7 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 rounded-[inherit] pointer-events-none"
      style={{ backgroundColor: color }}
    />
  )
}

// ============================================================
// CIRCULAR PROGRESS
// ============================================================

export function CircularProgress({
  value,
  size = 64,
  strokeWidth = 5,
  className,
}: {
  value: number
  size?: number
  strokeWidth?: number
  className?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(value, 100) / 100) * circumference

  const springOffset = useSpring(circumference, {
    stiffness: 60,
    damping: 20,
  })

  useEffect(() => {
    springOffset.set(offset)
  }, [offset, springOffset])

  return (
    <svg width={size} height={size} className={className}>
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/40"
      />
      {/* Animated progress arc */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className="text-primary"
        strokeDasharray={circumference}
        style={{ strokeDashoffset: springOffset }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}

// Re-export motion for direct use
export { motion, AnimatePresence }
