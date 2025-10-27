import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface GlowButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "accent";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
}

const GlowButton = ({ 
  children, 
  variant = "primary", 
  size = "md", 
  onClick, 
  className = "" 
}: GlowButtonProps) => {
  const variants = {
    primary: "bg-gradient-to-r from-primary to-accent text-primary-foreground glow-primary hover:glow-accent",
    secondary: "glass text-foreground border-primary/20 hover:border-primary/40",
    accent: "bg-gradient-to-r from-accent to-primary text-accent-foreground glow-accent"
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };

  return (
    <Button
      onClick={onClick}
      className={`
        ${variants[variant]} 
        ${sizes[size]} 
        transition-smooth 
        hover:scale-105 
        font-semibold 
        rounded-xl
        ${className}
      `}
    >
      {children}
    </Button>
  );
};

export default GlowButton;