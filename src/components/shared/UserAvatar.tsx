import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  nome: string;
  avatar?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
};

export function UserAvatar({ nome, avatar, size = "md", className }: UserAvatarProps) {
  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatar && <AvatarImage src={avatar} alt={nome} />}
      <AvatarFallback className="bg-primary/10 text-primary font-medium">
        {initials(nome)}
      </AvatarFallback>
    </Avatar>
  );
}
