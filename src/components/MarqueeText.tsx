import { ReactNode } from "react";

interface MarqueeTextProps {
  children: ReactNode;
  reverse?: boolean;
  speed?: number;
  className?: string;
}

const MarqueeText = ({ children, reverse = false, speed = 30, className = "" }: MarqueeTextProps) => {
  return (
    <div className={`overflow-hidden whitespace-nowrap ${className}`}>
      <div 
        className={`inline-flex ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'}`}
        style={{ 
          animationDuration: `${speed}s`,
          minWidth: '200%'
        }}
      >
        <span className="w-full flex-shrink-0">{children}</span>
        <span className="w-full flex-shrink-0">{children}</span>
      </div>
    </div>
  );
};

export default MarqueeText;