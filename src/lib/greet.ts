/**
 * ทักทายด้วยอิโมจิ — ตัวกลางเล็ก ๆ ระหว่าง store (คนรับสัญญาณ) กับ GreetBurst (คนแสดงผล)
 * แยกไว้เพื่อไม่ให้แอนิเมชันต้องรู้จัก state ทั้งก้อน
 */
type Greeting = { emoji: string; from: string }
type Listener = (g: Greeting) => void

const listeners = new Set<Listener>()

export function onGreetReceived(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function emitGreetReceived(g: Greeting): void {
  listeners.forEach((fn) => fn(g))
}
