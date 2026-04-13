import { Link } from "react-router-dom";
import yunixLogo from "/yunix logo.png";

interface YunixLogoProps {
  isAdmin?: boolean;
  adminRoute?: string;
  className?: string;
  collapsed?: boolean;
}

export default function YunixLogo({ 
  isAdmin = false, 
  adminRoute = "/app/admin/ceo", 
  className = "",
  collapsed = false 
}: YunixLogoProps) {
  const targetRoute = isAdmin ? adminRoute : "/app/dashboard";
  
  return (
    <Link to={targetRoute} className={`flex items-center gap-3 ${className}`}>
      <img 
        src={yunixLogo} 
        alt="YUNIX Logo" 
        className="h-8 w-8 object-contain"
      />
      {!collapsed && (
        <div>
          <h1 className={`text-xl font-bold bg-gradient-to-r ${isAdmin ? 'from-yellow-400 to-yellow-600' : 'from-primary to-secondary'} bg-clip-text text-transparent`}>
            {isAdmin ? 'YUNIX ADMIN' : 'YUNIX'}
          </h1>
        </div>
      )}
    </Link>
  );
}
