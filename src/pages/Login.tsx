import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { loginWithCredentials } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { oneSignalCompleteSetup, debugOneSignalStatus } from "@/lib/onesignal";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await loginWithCredentials(email, password);

      if (res.success && res.data?.token && res.data?.user) {
        // Use AuthContext to store auth data
        login(res.data.token, res.data.user);

        // OneSignal: Complete setup with email as external_user_id
        const userEmail = String(res.data.user?.email || "").trim().toLowerCase();
        if (userEmail) {
          // Debug OneSignal status first
          debugOneSignalStatus();
          // Then setup OneSignal
          oneSignalCompleteSetup(userEmail);
        }
        
        toast({
          title: "Đăng nhập thành công",
          description: "Chào mừng bạn trở lại!",
        });

        // Redirect to intended page or home
        const from = location.state?.from?.pathname || "/";
        navigate(from, { replace: true });
      } else {
        toast({
          variant: "destructive",
          title: "Đăng nhập không thành công",
          description: res.message || "Vui lòng kiểm tra email và mật khẩu.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lỗi đăng nhập",
        description: "Đã xảy ra lỗi, vui lòng thử lại.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="h-16 w-auto mx-auto mb-4 flex items-center justify-center">
            <img 
              src="https://github.com/lanoanh-osi/OSI-Image/raw/main/logo-bg-blue.png"
              alt="OSI Logo"
              className="h-16 w-auto rounded-xl"
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            O.S.I Service Ops
          </h1>
          <p className="text-blue-100">
            Hệ thống quản lý kỹ thuật viên
          </p>
        </div>

        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle>Đăng nhập</CardTitle>
            <CardDescription>
              Nhập thông tin đăng nhập để truy cập hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@osi.com.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center justify-end">
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-primary hover:text-primary-dark transition-colors"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:opacity-90" 
                disabled={isLoading}
              >
                {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-blue-100 text-sm">
            © 2024 O.S.I Co., Ltd - Thiết bị Khoa học Lan Oanh
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;