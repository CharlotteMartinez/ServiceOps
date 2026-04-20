import { useState } from "react";
import Header from "@/components/Layout/Header";
import BottomNav from "@/components/Layout/BottomNav";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getAuthUser, logout } from "@/lib/api";
import { Link } from "react-router-dom";

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Mật khẩu không khớp",
        description: "Vui lòng kiểm tra lại mật khẩu mới và xác nhận mật khẩu",
      });
      return;
    }

    setIsLoading(true);

    // Get user email from auth context
    const user = getAuthUser();
    const userEmail = user?.email || "";

    const res = await apiRequest<{ ok: boolean }>({
      method: "POST",
      path: "/webhook/change-password",
      withAuth: true,
      body: { 
        email: userEmail,
        "old-password": currentPassword, 
        "new-password": newPassword 
      },
    });

    setIsLoading(false);
    if (res.success) {
      toast({
        title: "Đổi mật khẩu thành công",
        description: "Mật khẩu của bạn đã được cập nhật. Vui lòng đăng nhập lại.",
      });
      // Logout user and redirect to login
      logout();
      window.location.href = "/login";
    } else {
      toast({
        variant: "destructive",
        title: "Đổi mật khẩu thất bại",
        description: res.message || "Vui lòng kiểm tra lại mật khẩu hiện tại",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header pageTitle="Đổi mật khẩu" />

      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="grid gap-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="h-5 w-5 mr-2" />
                Đổi mật khẩu
              </CardTitle>
              <CardDescription>
                Cập nhật mật khẩu để bảo mật tài khoản
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Mật khẩu mới</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-primary hover:opacity-90" 
                  disabled={isLoading}
                >
                  {isLoading ? "Đang cập nhật..." : "Đổi mật khẩu"}
                </Button>
                <div className="text-center mt-2">
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                    Quên mật khẩu?
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default ChangePassword;


