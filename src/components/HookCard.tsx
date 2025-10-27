import { ReactNode } from "react";

interface HookCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  image: string;
  features: string[];
}

const HookCard = ({ title, description, icon, image, features }: HookCardProps) => {
  return (
    <div className="glass rounded-2xl p-8 glow-accent transition-smooth hover:scale-105 float">
      <div className="flex items-center gap-4 mb-6">
        <div className="text-4xl">{icon}</div>
        <h3 className="text-2xl font-bold gradient-text">{title}</h3>
      </div>
      
      <div className="relative overflow-hidden rounded-xl mb-6">
        <img 
          src={image} 
          alt={title}
          className="w-full h-48 object-cover transition-smooth hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
      </div>

      <p className="text-muted-foreground mb-6 leading-relaxed">{description}</p>

      <div className="space-y-3">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary glow-primary" />
            <span className="text-sm text-foreground/80">{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HookCard;