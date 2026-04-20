import { User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { handleLogout } from "@/lib/onesignal";

type HeaderProps = {
  pageTitle?: string;
};

const Header = ({ pageTitle }: HeaderProps) => {
  const navigate = useNavigate();
  
  // Get user data from localStorage
  const getUserData = () => {
    try {
      const userStr = localStorage.getItem("auth_user");
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  };
  
  const user = getUserData();
  const displayName = user?.name || user?.fullName || "Nguyễn Văn A";
  const displayEmail = user?.email || "kythuatvien@osi.com.vn";

  const onLogout = () => {
    handleLogout();
    navigate("/login");
  };
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-gradient-card backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <img 
            src="https://github.com/lanoanh-osi/OSI-Image/raw/main/logo-bg-blue.png"
            alt="OSI Logo"
            className="h-8 w-auto rounded-lg"
          />
          <div className="flex flex-col">
            <span className={`${pageTitle ? "text-base md:text-lg" : "text-sm"} font-semibold text-foreground`}>
              {pageTitle || "O.S.I Service Ops"}
            </span>
            {!pageTitle && (
              <span className="text-xs text-muted-foreground">Kỹ thuật viên</span>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2">
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/placeholder-avatar.jpg" alt="User" />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <User className="h-10 w-10" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{displayEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="mr-2 h-4 w-4" />
                Thông tin cá nhân
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;