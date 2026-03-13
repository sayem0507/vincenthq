import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'outline' | 'ghost' | 'destructive';
}

export function Button({ children, isLoading, variant = 'primary', className, disabled, ...props }: ButtonProps) {
  const baseStyles = "relative flex items-center justify-center font-bold rounded-xl transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none overflow-hidden";
  
  const variants = {
    primary: "bg-blue-600/80 hover:bg-blue-500/80 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-500/50 py-3.5 px-6",
    secondary: "bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-md shadow-lg py-2 px-4 text-sm",
    success: "bg-emerald-600/80 hover:bg-emerald-500/80 text-white shadow-[0_0_20px_rgba(52,211,153,0.4)] border border-emerald-500/50 py-3.5 px-6",
    outline: "bg-transparent hover:bg-white/5 text-white border border-white/20 py-2 px-4 text-sm",
    ghost: "bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white py-2 px-4 text-sm",
    destructive: "bg-red-600/80 hover:bg-red-500/80 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] border border-red-500/50 py-3.5 px-6"
  };

  return (
    <button 
      className={cn(baseStyles, variants[variant], className)} 
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      <span className={cn("flex items-center", isLoading && "opacity-80")}>
        {children}
      </span>
    </button>
  );
}
