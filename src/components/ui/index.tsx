import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes } from 'react'

// NativeShad-inspired composition, using semantic DOM for Capacitor and web.
export function Button({ variant = 'primary', size = 'default', className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'default' | 'icon' | 'sm' }) {
  return <button type={type} className={`ui-button ui-button-${variant} ui-button-${size} ${className}`} {...props} />
}
export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`ui-card ${className}`} {...props} />
}
export function CardHeader({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`ui-card-header ${className}`} {...props} />
}
export function CardContent({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`ui-card-content ${className}`} {...props} />
}
export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`ui-input ${className}`} {...props} />
}
