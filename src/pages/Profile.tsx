import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Header from "@/components/Layout/Header";
import BottomNav from "@/components/Layout/BottomNav";
import { User, Lock, Mail, Phone, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const stored = user || {};
  const userInfo = {
    name: stored.name || "Nguyễn Văn A",
    email: stored.email || "kythuatvien@osi.com.vn",
    phone: stored.phone || "",
    employeeId: stored["staff-code"] || stored.staffCode || "KTV001",
    department: stored.department || "Kỹ thuật",
  };

  const achievements = [
    { title: "Hoàn thành 100+ tickets", icon: Award, color: "text-yellow-600" },
    { title: "Đánh giá 5 sao từ KH", icon: Award, color: "text-blue-600" },
    { title: "Kỹ thuật viên xuất sắc 2024", icon: Award, color: "text-green-600" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        {/* <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Thông tin cá nhân</h1>
          <p className="text-muted-foreground">
            Quản lý thông tin tài khoản và bảo mật
          </p>
        </div> */}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Info */}
            <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Thông tin cá nhân
              </CardTitle>
              <CardDescription>
                Thông tin tài khoản và liên hệ của bạn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="/placeholder-avatar.jpg" alt="User" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    KTV
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{userInfo.name}</h3>
                  <p className="text-sm text-muted-foreground">#{userInfo.employeeId}</p>
                  <p className="text-sm text-primary">{userInfo.department}</p>
                </div>
              </div>

              <Separator />

              {/* Contact Info */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{userInfo.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Số điện thoại</p>
                    <p className="text-sm text-muted-foreground">{userInfo.phone}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <div className="space-y-6">
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
                <Button 
                  type="button" 
                  className="w-full bg-gradient-primary hover:opacity-90"
                  onClick={() => navigate("/change-password")}
                >
                  Đổi mật khẩu
                </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full mt-3"
                    onClick={() => { logout(); navigate("/login"); }}
                  >
                    Đăng xuất
                  </Button>
              </CardContent>
            </Card>
            <div className="text-xs text-muted-foreground text-center">
              Phiên bản: 1.0.4
            </div>

            {/* Achievements */}
            {/* <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  Thành tích
                </CardTitle>
                <CardDescription>
                  Những thành tích nổi bật của bạn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {achievements.map((achievement, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                    <achievement.icon className={`h-5 w-5 ${achievement.color}`} />
                    <span className="text-sm font-medium">{achievement.title}</span>
                  </div>
                ))}
              </CardContent>
            </Card> */}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;