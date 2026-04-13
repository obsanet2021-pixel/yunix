import { ChevronDown, User, Shield, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface RoleSwitcherProps {
  currentMode: 'user' | 'admin';
  staffRoleName: string | null;
  isStaff: boolean;
  onSwitchToUser: () => void;
  onSwitchToAdmin: () => void;
  onSignOut: () => void;
}

export default function RoleSwitcher({
  currentMode,
  staffRoleName,
  isStaff,
  onSwitchToUser,
  onSwitchToAdmin,
  onSignOut,
}: RoleSwitcherProps) {
  const displayRole = currentMode === 'admin' ? staffRoleName : 'USER';

  // If in user mode and NOT a staff member, just show USER with sign out only
  const showAdminSwitch = currentMode === 'user' && isStaff && staffRoleName;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-3">
          <div className="flex items-center gap-2">
            {currentMode === 'admin' ? (
              <Shield className="h-4 w-4 text-yellow-500" />
            ) : (
              <User className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">{displayRole}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover border border-border z-50">
        <div className="px-3 py-2 border-b border-border">
          <p className="text-xs text-muted-foreground">Logged in as</p>
          <p className="font-medium text-sm">{displayRole}</p>
        </div>
        
        {/* Show "Switch to User" only when in admin mode */}
        {currentMode === 'admin' && (
          <DropdownMenuItem onClick={onSwitchToUser} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Switch to User
          </DropdownMenuItem>
        )}
        
        {/* Show "Switch to Admin" ONLY if user is in Staff Management with active status */}
        {showAdminSwitch && (
          <DropdownMenuItem onClick={onSwitchToAdmin} className="cursor-pointer">
            <Shield className="mr-2 h-4 w-4 text-yellow-500" />
            Switch to Admin ({staffRoleName})
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={onSignOut} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
