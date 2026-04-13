import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { roleRoutes } from "@/hooks/useStaffPermissions";

interface StaffRole {
  name: string;
}

interface StaffData {
  id: string;
  user_id: string | null;
  role: StaffRole | StaffRole[];
}

export interface RoleSwitchingState {
  user: User | null;
  currentMode: 'user' | 'admin';
  staffRoleName: string | null;
  isCEO: boolean;
  isStaff: boolean;
  loading: boolean;
  availableRoles: string[];
}

export function useRoleSwitching(currentMode: 'user' | 'admin' = 'user') {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [staffRoleName, setStaffRoleName] = useState<string | null>(null);
  const [isCEO, setIsCEO] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [availableRoles, setAvailableRoles] = useState<string[]>(['USER']);

  const checkStaffRole = useCallback(async (userId: string, userEmail?: string | null) => {
    let staff: StaffData | null = null;
    
    const { data: staffById } = await supabase
      .from("staff")
      .select(`id, user_id, role:admin_roles(name)`)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    staff = staffById;

    if (!staff && userEmail) {
      const { data: staffByEmail } = await supabase
        .from("staff")
        .select(`id, user_id, role:admin_roles(name)`)
        .eq("email", userEmail.toLowerCase())
        .eq("status", "active")
        .single();
      
      staff = staffByEmail;
      
      // Auto-link user_id if found by email
      if (staffByEmail && !staffByEmail.user_id) {
        await supabase
          .from("staff")
          .update({ user_id: userId, status: 'active' })
          .eq("id", staffByEmail.id);
      }
    }

    if (staff) {
      const role = Array.isArray(staff.role) ? staff.role[0] : staff.role;
      const roleName = role?.name || null;
      setStaffRoleName(roleName);
      setIsCEO(roleName === "CEO");
      setIsStaff(true);
      setAvailableRoles(['USER', roleName || ''].filter(Boolean));
    } else {
      setStaffRoleName(null);
      setIsCEO(false);
      setIsStaff(false);
      setAvailableRoles(['USER']);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        checkStaffRole(session.user.id, session.user.email);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        checkStaffRole(session.user.id, session.user.email);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, checkStaffRole]);

  const switchToUser = useCallback(() => {
    navigate("/app/dashboard");
  }, [navigate]);

  const switchToAdmin = useCallback(() => {
    if (staffRoleName && roleRoutes[staffRoleName]) {
      navigate(roleRoutes[staffRoleName]);
    }
  }, [navigate, staffRoleName]);

  const getAdminRoute = useCallback(() => {
    if (staffRoleName && roleRoutes[staffRoleName]) {
      return roleRoutes[staffRoleName];
    }
    return '/app/admin/ceo';
  }, [staffRoleName]);

  return {
    user,
    currentMode,
    staffRoleName,
    isCEO,
    isStaff,
    loading,
    availableRoles,
    switchToUser,
    switchToAdmin,
    getAdminRoute,
    checkStaffRole,
  };
}
