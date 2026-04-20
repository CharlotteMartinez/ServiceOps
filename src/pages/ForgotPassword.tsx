import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { apiRequest } from "@/lib/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { toast } = useToast();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const res = await apiRequest<{ ok: boolean }>({
      method: "POST",
      path: "/webhook/sent-otp",
      body: { email },
    });

    setIsLoading(false);
    if (res.success) {
      setIsOtpSent(true);
      toast({
        title: "OTP đã được gửi",
        description: "Vui lòng kiểm tra email của bạn",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Gửi OTP thất bại",
        description: res.message || "Vui lòng thử lại",
      });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
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

    const res = await apiRequest<{ ok: boolean }>({
      method: "POST",
      path: "/webhook/reset-otp",
      body: { email, otp, newPassword },
    });

    setIsLoading(false);
    if (res.success) {
      toast({
        title: "Đổi mật khẩu thành công",
        description: "Bạn có thể đăng nhập với mật khẩu mới",
      });
      window.location.href = "/login";
    } else {
      toast({
        variant: "destructive",
        title: "Xác minh OTP thất bại",
        description: res.message || "OTP không đúng hoặc đã hết hạn",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-md">
        {/* Back button */}
        <Link 
          to="/login"
          className="inline-flex items-center text-white hover:text-blue-100 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại đăng nhập
        </Link>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="h-16 w-auto mx-auto mb-4 flex items-center justify-center">
            <img 
              src="https://github.com/lanoanh-osi/OSI-Image/raw/main/logo-bg-blue.png"
              alt="OSI Logo"
              className="h-16 w-auto rounded-xl"
            />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            Quên mật khẩu
          </h1>
          <p className="text-blue-100 text-sm">
            {!isOtpSent ? "Nhập email để nhận mã OTP" : "Nhập OTP và mật khẩu mới"}
          </p>
        </div>

        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              {!isOtpSent ? "Gửi OTP" : "Tạo mật khẩu mới"}
            </CardTitle>
            <CardDescription>
              {!isOtpSent 
                ? "Chúng tôi sẽ gửi mã OTP đến email của bạn" 
                : "OTP có hiệu lực trong 30 phút"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isOtpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
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
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-primary hover:opacity-90" 
                  disabled={isLoading}
                >
                  {isLoading ? "Đang gửi..." : "Gửi OTP"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Mã OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Nhập mã OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
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
                  {isLoading ? "Đang xử lý..." : "Đổi mật khẩu"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-blue-100 text-sm">
            Cần hỗ trợ? Liên hệ IT Support
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;