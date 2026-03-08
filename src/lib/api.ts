// Lightweight API client with base URL and JSON helpers

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;
const USE_MOCK_AUTH = String(import.meta.env.VITE_USE_MOCK_AUTH || "false").toLowerCase() === "true";
const USE_MOCK_DATA = String(import.meta.env.VITE_USE_MOCK_DATA || "false").toLowerCase() === "true";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestOptions {
	method?: HttpMethod;
	path: string;
	body?: unknown;
	withAuth?: boolean;
	signal?: AbortSignal;
}

export interface ApiResponse<T> {
	success: boolean;
	status: number;
	data?: T;
	message?: string;
}

function getBaseUrl(): string {
	if (API_BASE_URL) return API_BASE_URL.replace(/\/$/, "");
	// Fallback to current origin for development
	return window.location.origin;
}

export function getAuthToken(): string | null {
	return localStorage.getItem("auth_token");
}

export function setAuthToken(token: string | null) {
	if (token) localStorage.setItem("auth_token", token);
	else localStorage.removeItem("auth_token");
}

// User storage helpers
export interface AuthUser {
    [key: string]: any;
}

const AUTH_USER_STORAGE_KEY = "auth_user";

export function getAuthUser<T extends AuthUser = AuthUser>(): T | null {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch (_) {
        localStorage.removeItem(AUTH_USER_STORAGE_KEY);
        return null;
    }
}

export function setAuthUser(user: AuthUser | null) {
    if (user) localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(AUTH_USER_STORAGE_KEY);
}

export function clearAuth() {
    setAuthToken(null);
    setAuthUser(null);
}

export async function apiRequest<T = unknown>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
	const { method = "POST", path, body, withAuth = false, signal } = options;

	// Mock auth endpoints if enabled
	if (USE_MOCK_AUTH && path.startsWith("/api/auth/")) {
		// Small delay to mimic network
		await new Promise((r) => setTimeout(r, 400));

		if (path === "/api/auth/login") {
			const email = (body as any)?.email as string;
			const password = (body as any)?.password as string;
			if (email && password === "123456") {
				return { success: true, status: 200, data: { token: "mock-token", user: { email } } as any };
			}
			return { success: false, status: 401, message: "Sai thông tin đăng nhập (mật khẩu mẫu: 123456)" };
		}

		if (path === "/webhook/sent-otp") {
			return { success: true, status: 200, data: { ok: true } as any };
		}

		if (path === "/webhook/reset-otp") {
			const otp = (body as any)?.otp as string;
			if (otp && otp.length >= 4) {
				return { success: true, status: 200, data: { ok: true } as any };
			}
			return { success: false, status: 400, message: "OTP không đúng" };
		}

		if (path === "/webhook/change-password") {
			if (!withAuth || !getAuthToken()) {
				return { success: false, status: 401, message: "Chưa đăng nhập" };
			}
			const oldPassword = (body as any)?.["old-password"] as string;
			if (oldPassword === "123456") {
				return { success: true, status: 200, data: { ok: true } as any };
			}
			return { success: false, status: 400, message: "Mật khẩu hiện tại không đúng (mẫu: 123456)" };
		}

		return { success: false, status: 404, message: "Mock endpoint không tồn tại" };
	}

    const url = /^(https?:)?\/\//i.test(path)
        ? path
        : `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};

	if (withAuth) {
		const token = getAuthToken();
		if (token) headers["Authorization"] = `Bearer ${token}`;
	}

	try {
		const res = await fetch(url, {
			method,
			headers,
			body: body !== undefined ? JSON.stringify(body) : undefined,
			signal,
		});

		const isJson = res.headers.get("content-type")?.includes("application/json");
		const data = isJson ? await res.json() : undefined;

		if (!res.ok) {
			return {
				success: false,
				status: res.status,
				message: (data as any)?.message || res.statusText || "Request failed",
			};
		}

		return {
			success: true,
			status: res.status,
			data: data as T,
		};
	} catch (error: any) {
		return {
			success: false,
			status: 0,
			message: error?.message || "Network error",
		};
	}
}


// ---------------------- AUTH APIs ----------------------
// Real login endpoint provided by the user (Google Sheet screenshot):
// POST https://automation.osi.vn/webhook/login-H
// Body: { email: string, password: string }
// Response: { status: "success", token: string, user: { ... } }

interface LoginResponseShape {
    status?: string;
    token?: string;
    user?: AuthUser;
}

export async function loginWithCredentials(email: string, password: string): Promise<ApiResponse<{ token: string; user: AuthUser }>> {
    // Route via Vite proxy in development; in production, set VITE_API_BASE_URL accordingly
    const path = "/webhook/login";
    const res = await apiRequest<LoginResponseShape>({ method: "POST", path, body: { email, password } });
    if (!res.success) return res as any;

    const payload = (res.data || {}) as LoginResponseShape;
    const isOk = (payload.status || "").toLowerCase() === "success";
    const token = payload.token;
    const user = payload.user;

    if (!isOk || !token) {
        // Ensure we don't keep any stale auth on failed login
        clearAuth();
        return {
            success: false,
            status: res.status,
            message: (payload as any)?.message || "Đăng nhập không thành công. Vui lòng kiểm tra email/mật khẩu.",
        } as ApiResponse<any>;
    }

    setAuthToken(token);
    if (user) setAuthUser(user);

    return { success: true, status: res.status, data: { token, user } };
}

export function logout() {
    clearAuth();
}



// Domain models
export type TicketType = "delivery" | "maintenance" | "sales";
export type TicketStatus = "assigned" | "in-progress" | "completed";

export interface TicketSummary {
    id: string;
    type: TicketType;
    title: string;
    projectCode?: string;
    customer: string;
    address: string;
    deadline: string; // ISO date string
    status: TicketStatus;
    products?: string[]; // optional for delivery tickets
    subTypeLabel?: string; // optional label for specialized categories (e.g., activity type)
    statusDisplayLabel?: string; // external status label for UI (e.g., "Chưa bắt đầu")
    description?: string; // optional description for activity/support tickets
    deviceModel?: string; // optional device model for maintenance tickets
    deviceSerial?: string; // optional device serial for maintenance tickets
}

export interface TicketDetail extends TicketSummary {
    customerInfo: {
        name: string;
        code?: string;
        contactEmail?: string;
        contactPhone?: string;
        address: string;
    };
    orderInfo?: {
        orderCode?: string;
        itemsCount?: number;
        secretCodes?: Array<{ code: string; productId?: string; name?: string; quantity?: number }>;
        // Extended fields for delivery/installation order detail
        customerName?: string;
        totalAmount?: number;
        orderDate?: string;
        description?: string;
        deliveryDate?: string;
        contactName?: string;
        contactPhone?: string;
        deliveryAddress?: string;
        assignedDate?: string;
        status?: string;
    };
    goodsInfo?: Array<{ sku?: string; name: string; quantity: number }>;
    deviceInfo?: Array<{ model?: string; serial?: string; deviceCode?: string; deviceId?: string; quantity?: number }>;
    notes?: string;
    // Maintenance flow sections (optional)
    firstResponse?: { time?: string; note?: string; imageUrls?: string[] };
    supplierInstruction?: { time?: string; contactTime?: string; responseTime?: string; note?: string; imageUrls?: string[] };
    supplierInstructionLogs?: Array<{
        contactCode?: string;
        contactTime?: string;
        responseTime?: string;
        responseContent?: string;
        note?: string;
    }>;
    startExecution?: { time?: string; note?: string; imageUrls?: string[] };
    resultRecord?: { time?: string; note?: string; imageUrls?: string[] };
    // Activity & Support specific
    activityInfo?: { subject?: string; description?: string; owner?: string; startTime?: string; endTime?: string };
    activityResult?: { time?: string; note?: string; imageUrls?: string[] };
    // Maintenance extra fields (from detail API)
    maintenanceExtra?: {
        company?: string;
        ticketType?: string;
        ticketCategory?: string;
        deviceBrand?: string;
        deviceModel?: string;
        serialNumber?: string;
        installationDate?: string;
        imageDeviceUrl?: string;
        createdAt?: string;
        assignedAt?: string;
        startLocation?: string;
        completeLocation?: string;
    };
}

export interface UserStats {
    ticket_number: number;
    completion_rate: number; // percent 0-100
    avg_rating: number; // 0-5
    fast_response_rate: number; // percent 0-100
}

// Performance metrics interface based on webhook response
export interface PerformanceMetrics {
    tickets_completed: number;
    tickets_pending: number;
    on_time_completion_rate: number; // percent 0-100
    quick_response_rate: number; // percent 0-100
    avg_customer_rating: number; // 0-5
}

// Mock data helpers
const mockTickets: TicketSummary[] = [
    {
        id: "TK001",
        type: "delivery",
        title: "Lắp đặt máy phân tích",
        customer: "Công ty ABC",
        address: "123 Nguyễn Huệ, Q1, TP.HCM",
        deadline: new Date().toISOString(),
        status: "assigned",
    },
    {
        id: "TK002",
        type: "maintenance",
        title: "Bảo trì thiết bị định kỳ",
        customer: "Trường ĐH XYZ",
        address: "456 Lê Lợi, Q3, TP.HCM",
        deadline: new Date().toISOString(),
        status: "in-progress",
    },
    {
        id: "AS001",
        type: "sales",
        title: "Hỗ trợ cấu hình LIS",
        customer: "Bệnh viện DEF",
        address: "789 Hai Bà Trưng, Q1, TP.HCM",
        deadline: new Date().toISOString(),
        status: "assigned",
    },
    {
        id: "AS002",
        type: "sales",
        title: "Khảo sát nhu cầu đào tạo",
        customer: "Trung tâm Xét nghiệm ABC",
        address: "89 Điện Biên Phủ, Bình Thạnh, TP.HCM",
        deadline: new Date().toISOString(),
        status: "in-progress",
    },
    {
        id: "AS003",
        type: "sales",
        title: "Báo cáo hỗ trợ sau đào tạo",
        customer: "BV Quốc tế",
        address: "01 Phạm Ngọc Thạch, Q3, TP.HCM",
        deadline: new Date().toISOString(),
        status: "completed",
    },
    // Maintenance samples
    {
        id: "MT101",
        type: "maintenance",
        title: "Bảo trì hệ thống tủ lạnh mẫu",
        customer: "BV Nhi Đồng 1",
        address: "34 Lý Tự Trọng, Q1, TP.HCM",
        deadline: new Date().toISOString(),
        status: "assigned",
    },
    {
        id: "MT102",
        type: "maintenance",
        title: "Sửa chữa máy ly tâm phòng lab",
        customer: "Trung tâm Xét nghiệm ABC",
        address: "89 Điện Biên Phủ, Bình Thạnh, TP.HCM",
        deadline: new Date().toISOString(),
        status: "in-progress",
    },
    {
        id: "MT103",
        type: "maintenance",
        title: "Bảo dưỡng máy đo đông máu",
        customer: "Bệnh viện Quốc tế",
        address: "01 Phạm Ngọc Thạch, Q3, TP.HCM",
        deadline: new Date().toISOString(),
        status: "completed",
    },
    {
        id: "MT104",
        type: "maintenance",
        title: "Sửa chữa máy ủ ấm",
        customer: "Phòng thí nghiệm NanoLab",
        address: "22 Nguyễn Thị Minh Khai, Q1, TP.HCM",
        deadline: new Date().toISOString(),
        status: "in-progress",
    },
];

const mockTicketDetails: Record<string, TicketDetail> = {
    TK001: {
        ...mockTickets[0],
        customerInfo: {
            name: "Công ty ABC",
            address: "123 Nguyễn Huệ, Q1, TP.HCM",
            contactPhone: "0901 234 567",
        },
        orderInfo: { orderCode: "SO-1001", itemsCount: 2, secretCodes: [{ code: "MH-01", name: "Máy phân tích", quantity: 1 }] },
        deviceInfo: [{ model: "Analyzer X", serial: "SN123", quantity: 1 }],
        notes: "Ưu tiên hoàn thành trong ngày",
    },
    TK004: {
        ...mockTickets.find((t) => t.id === "TK004")!,
        customerInfo: {
            name: "Công ty GHI",
            address: "12 Trần Hưng Đạo, Q5, TP.HCM",
            contactPhone: "0987 654 321",
        },
        orderInfo: {
            orderCode: "SO-2002",
            itemsCount: 2,
            secretCodes: [
                { code: "MH-02", name: "Bộ kit lắp đặt", quantity: 1 },
                { code: "MH-03", name: "Vật tư phụ trợ", quantity: 2 },
            ],
        },
        deviceInfo: [
            { model: "Hematology 3000", serial: "SN-HEM-001", quantity: 1 },
            { model: "Barcode Scanner", serial: "SN-BC-777", quantity: 1 },
        ],
        notes: "Đang triển khai, chờ test hoàn tất.",
    },
    AS001: {
        ...mockTickets.find((t) => t.id === "AS001")!,
        customerInfo: {
            name: "Bệnh viện DEF",
            address: "789 Hai Bà Trưng, Q1, TP.HCM",
            contactPhone: "0907 111 222",
        },
        activityInfo: { subject: "Cấu hình LIS", description: "Chuẩn HL7 và mapping kết quả", owner: "Nguyễn Kỹ Thuật", startTime: new Date().toISOString() },
        activityResult: undefined,
        notes: "Chờ KH xác nhận lịch triển khai",
    },
    AS002: {
        ...mockTickets.find((t) => t.id === "AS002")!,
        customerInfo: {
            name: "Trung tâm Xét nghiệm ABC",
            address: "89 Điện Biên Phủ, Bình Thạnh, TP.HCM",
            contactPhone: "0902 345 678",
        },
        activityInfo: { subject: "Khảo sát đào tạo", description: "Kế hoạch training phần mềm", owner: "Trần Support", startTime: new Date().toISOString() },
        activityResult: { time: undefined, note: undefined, imageUrls: [] },
        notes: "Đang thực hiện khảo sát nhu cầu",
    },
    AS003: {
        ...mockTickets.find((t) => t.id === "AS003")!,
        customerInfo: {
            name: "BV Quốc tế",
            address: "01 Phạm Ngọc Thạch, Q3, TP.HCM",
            contactPhone: "0933 888 999",
        },
        activityInfo: { subject: "Hỗ trợ sau đào tạo", description: "Rà soát quy trình nghiệm thu", owner: "Lê Hỗ Trợ", startTime: new Date().toISOString(), endTime: new Date().toISOString() },
        activityResult: { time: new Date().toISOString(), note: "Hoàn tất hỗ trợ, bàn giao biên bản", imageUrls: [] },
        notes: "Đã hoàn thành",
    },
    MT101: {
        ...mockTickets.find((t) => t.id === "MT101")!,
        customerInfo: {
            name: "BV Nhi Đồng 1",
            address: "34 Lý Tự Trọng, Q1, TP.HCM",
            contactPhone: "028 3829 1234",
        },
        goodsInfo: [
            { name: "Dầu bôi trơn quạt tủ", quantity: 1 },
            { name: "Bộ vệ sinh dàn lạnh", quantity: 1 },
        ],
        deviceInfo: [
            { model: "Freezer -80C", serial: "FRZ-80-0901", quantity: 1 },
        ],
        notes: "Kiểm tra rung và tiếng ồn, vệ sinh dàn ngưng.",
        firstResponse: { time: undefined, note: undefined, imageUrls: [] },
        supplierInstruction: { time: undefined, note: undefined, imageUrls: [] },
        startExecution: { time: undefined, note: undefined, imageUrls: [] },
        resultRecord: { time: undefined, note: undefined, imageUrls: [] },
    },
    MT102: {
        ...mockTickets.find((t) => t.id === "MT102")!,
        customerInfo: {
            name: "Trung tâm Xét nghiệm ABC",
            address: "89 Điện Biên Phủ, Bình Thạnh, TP.HCM",
            contactPhone: "0902 345 678",
        },
        goodsInfo: [
            { name: "Dây curoa máy ly tâm", quantity: 1 },
            { name: "Bạc đạn trục quay", quantity: 2 },
        ],
        deviceInfo: [
            { model: "Centrifuge 5000", serial: "CF-5000-221", quantity: 1 },
        ],
        notes: "Máy phát tiếng ồn lớn ở 3000 rpm, đang thay dây curoa.",
        firstResponse: { time: new Date().toISOString(), note: "Đã liên hệ khách, xác nhận sự cố", imageUrls: [] },
        supplierInstruction: { time: new Date().toISOString(), note: "Nhận hướng dẫn thay dây hợp chuẩn", imageUrls: [] },
        startExecution: { time: new Date().toISOString(), note: "Bắt đầu tháo lắp thay dây", imageUrls: [] },
        resultRecord: { time: undefined, note: undefined, imageUrls: [] },
    },
    MT103: {
        ...mockTickets.find((t) => t.id === "MT103")!,
        customerInfo: {
            name: "Bệnh viện Quốc tế",
            address: "01 Phạm Ngọc Thạch, Q3, TP.HCM",
            contactPhone: "0933 888 999",
        },
        goodsInfo: [
            { name: "Dung dịch vệ sinh sensor", quantity: 1 },
        ],
        deviceInfo: [
            { model: "Coagulation Analyzer C200", serial: "CG-200-XY1", quantity: 1 },
        ],
        notes: "Đã bảo dưỡng hoàn tất, thiết bị hoạt động ổn định.",
        firstResponse: { time: new Date().toISOString(), note: "Tiếp nhận yêu cầu, xác nhận lịch", imageUrls: [] },
        supplierInstruction: { time: new Date().toISOString(), note: "Kiểm tra theo manual hãng", imageUrls: [] },
        startExecution: { time: new Date().toISOString(), note: "Bắt đầu bảo dưỡng", imageUrls: [] },
        resultRecord: { time: new Date().toISOString(), note: "Thiết bị chạy ổn định sau bảo dưỡng", imageUrls: [] },
    },
    MT104: {
        ...mockTickets.find((t) => t.id === "MT104")!,
        customerInfo: {
            name: "NanoLab",
            address: "22 Nguyễn Thị Minh Khai, Q1, TP.HCM",
            contactPhone: "0912 345 999",
        },
        goodsInfo: [
            { name: "Cảm biến nhiệt độ buồng ủ", quantity: 1 },
            { name: "Ron cửa", quantity: 1 },
        ],
        deviceInfo: [
            { model: "Incubator 100", serial: "INC-100-7788", quantity: 1 },
        ],
        notes: "Đang theo dõi sai số nhiệt độ ±2°C.",
        firstResponse: { time: new Date().toISOString(), note: "Gọi xác nhận triệu chứng với KH", imageUrls: ["/img/mock/f1.jpg"] },
        supplierInstruction: { time: new Date().toISOString(), note: "Hãng hướng dẫn thay cảm biến", imageUrls: ["/img/mock/s1.jpg"] },
        startExecution: { time: new Date().toISOString(), note: "Đã tháo vỏ, bắt đầu thay cảm biến", imageUrls: ["/img/mock/st1.jpg"] },
        resultRecord: { time: new Date().toISOString(), note: "Tạm thời chạy ổn định, chờ theo dõi 24h", imageUrls: ["/img/mock/r1.jpg"] },
    },
};

// Public API helpers
export async function getTickets(params: {
    type?: TicketType;
    status?: TicketStatus;
    assigneeId?: string;
    page?: number;
    pageSize?: number;
}): Promise<ApiResponse<{ items: TicketSummary[]; total: number }>> {
    console.log('[getTickets] Called with params:', params);
    console.log('[getTickets] USE_MOCK_DATA:', USE_MOCK_DATA);
    
    if (USE_MOCK_DATA) {
        console.log('[getTickets] Using mock data');
        // Simple filter on mock data
        let items = [...mockTickets];
        if (params.type) items = items.filter((t) => t.type === params.type);
        if (params.status) items = items.filter((t) => t.status === params.status);
        return { success: true, status: 200, data: { items, total: items.length } };
    }
    // Delivery-install tickets use external webhook (n8n)
    if (params.type === "delivery") {
        console.log('[getTickets] Calling fetchDeliveryInstallTickets with status:', params.status);
        const result = await fetchDeliveryInstallTickets(params.status);
        return result;
    }
    // Maintenance/Repair tickets via external webhook (n8n)
    if (params.type === "maintenance") {
        console.log('[getTickets] Calling fetchMaintenanceTickets with status:', params.status);
        const result = await fetchMaintenanceTickets(params.status);
        return result;
    } 
    // Activity & Support tickets via external webhook (n8n)
    if (params.type === "sales") {
        console.log('[getTickets] Calling fetchActivitySupportTickets with status:', params.status);
        const result = await fetchActivitySupportTickets(params.status);
        return result;
    }
    // Fallback for other types (placeholder)
    return apiRequest<{ items: TicketSummary[]; total: number}>({
        method: "GET",
        path: `/api/tickets?type=${params.type || ""}&status=${params.status || ""}&assigneeId=${params.assigneeId || ""}&page=${params.page || 1}&pageSize=${params.pageSize || 20}`,
        withAuth: true,
    });
}

export async function getTicketDetail(ticketId: string): Promise<ApiResponse<TicketDetail>> {
    if (USE_MOCK_DATA) {
        const data = mockTicketDetails[ticketId] || ({
            ...mockTickets[0],
            id: ticketId,
            customerInfo: { name: "Khách hàng", address: "Địa chỉ" },
        } as TicketDetail);
        return { success: true, status: 200, data };
    }
    return apiRequest<TicketDetail>({ method: "GET", path: `/api/tickets/${ticketId}`, withAuth: true });
}

export async function getUserStats(): Promise<ApiResponse<UserStats>> {
    if (USE_MOCK_DATA) {
        return {
            success: true,
            status: 200,
            data: { ticket_number: 3, completion_rate: 80, avg_rating: 4.8, fast_response_rate: 70 },
        };
    }
    return apiRequest<UserStats>({ method: "GET", path: "/api/users/me/stats", withAuth: true });
}

// Mutations
export async function acceptTicket(ticketId: string): Promise<ApiResponse<{ ok: true }>> {
    if (USE_MOCK_DATA) {
        const idx = mockTickets.findIndex((t) => t.id === ticketId);
        if (idx >= 0) mockTickets[idx].status = "in-progress";
        if (mockTicketDetails[ticketId]) mockTicketDetails[ticketId].status = "in-progress";
        return { success: true, status: 200, data: { ok: true } };
    }
    return apiRequest({ method: "POST", path: `/api/tickets/${ticketId}/accept`, withAuth: true });
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus): Promise<ApiResponse<{ ok: true }>> {
    if (USE_MOCK_DATA) {
        const idx = mockTickets.findIndex((t) => t.id === ticketId);
        if (idx >= 0) mockTickets[idx].status = status;
        if (mockTicketDetails[ticketId]) mockTicketDetails[ticketId].status = status;
        return { success: true, status: 200, data: { ok: true } };
    }
    return apiRequest({ method: "PATCH", path: `/api/tickets/${ticketId}/status`, body: { status }, withAuth: true });
}

export async function addTicketNote(ticketId: string, note: string): Promise<ApiResponse<{ ok: true }>> {
    if (USE_MOCK_DATA) {
        const current = mockTicketDetails[ticketId];
        if (current) {
            current.notes = current.notes ? `${current.notes}\n${note}` : note;
        }
        return { success: true, status: 200, data: { ok: true } };
    }
    return apiRequest({ method: "POST", path: `/api/tickets/${ticketId}/notes`, body: { note }, withAuth: true });
}

export async function uploadTicketImages(ticketId: string, files: File[]): Promise<ApiResponse<{ ok: true }>> {
    if (USE_MOCK_DATA) {
        // In mock mode we just resolve successfully
        return { success: true, status: 200, data: { ok: true } };
    }
    // Note: For real API this should be multipart/form-data; left JSON for placeholder
    return apiRequest({ method: "POST", path: `/api/tickets/${ticketId}/images`, body: { files: files.map((f) => ({ name: f.name, size: f.size })) }, withAuth: true });
}

// Accept Delivery & Installation ticket (n8n)
export async function acceptDeliveryInstallTicket(ticketId: string): Promise<ApiResponse<{ ok: true }>> {
    if (USE_MOCK_DATA) {
        const idx = mockTickets.findIndex((t) => t.id === ticketId);
        if (idx >= 0) mockTickets[idx].status = "in-progress";
        if (mockTicketDetails[ticketId]) mockTicketDetails[ticketId].status = "in-progress";
        return { success: true, status: 200, data: { ok: true } };
    }
    const user = getAuthUser() || {} as any;
    const staffCode = user["staff-code"] || user.staffCode || user.code || undefined;
    const res = await apiRequest<{ status?: string; message?: string; data?: any }>({
        method: "POST",
        path: "/webhook/tickets/delivery-installation/accept",
        body: { "ticket-id": ticketId, "staff-code": staffCode },
    });
    if (!res.success) return res as any;
    const ok = ((res.data as any)?.status || "").toString().toLowerCase() === "success";
    return { success: ok || res.success, status: res.status, data: { ok: ok || true } };
}

// Accept Maintenance/Repair ticket (n8n)
export async function acceptMaintenanceRepairTicket(ticketId: string): Promise<ApiResponse<{ ok: true }>> {
    if (USE_MOCK_DATA) {
        const idx = mockTickets.findIndex((t) => t.id === ticketId);
        if (idx >= 0) mockTickets[idx].status = "in-progress";
        if (mockTicketDetails[ticketId]) mockTicketDetails[ticketId].status = "in-progress";
        return { success: true, status: 200, data: { ok: true } };
    }
    const user = getAuthUser() || {} as any;
    const staffCode = user["staff-code"] || user.staffCode || user.code || undefined;
    const res = await apiRequest<{ status?: string; message?: string; data?: any }>({
        method: "POST",
        path: "/webhook/tickets/maintenance-repair/accept",
        body: { "ticket-id": ticketId, "staff-code": staffCode },
    });
    if (!res.success) return res as any;
    const ok = ((res.data as any)?.status || "").toString().toLowerCase() === "success";
    return { success: ok || res.success, status: res.status, data: { ok: ok || true } };
}

// Get Performance Metrics from webhook
export async function getPerformanceMetrics(): Promise<ApiResponse<PerformanceMetrics>> {
    const user = getAuthUser() || {} as any;
    const email = user.email;
    const staffCode = user["staff-code"] || user.staffCode || user.code || undefined;
    const body = { email, "staff-code": staffCode } as any;

    if (USE_MOCK_DATA) {
        return {
            success: true,
            status: 200,
            data: {
                tickets_completed: 4,
                tickets_pending: 9,
                on_time_completion_rate: 0,
                quick_response_rate: 15.38,
                avg_customer_rating: 4
            }
        };
    }

    const res = await apiRequest<PerformanceMetrics[] | { data?: PerformanceMetrics }>({
        method: "POST",
        path: "/webhook/performance-metrics",
        body
    });

    if (!res.success) {
        console.error('[getPerformanceMetrics] API failed:', res);
        return res as any;
    }

    const payload = res.data as any;
    let metrics: PerformanceMetrics;

    // Handle different response structures
    if (Array.isArray(payload)) {
        // If response is array, get the first item
        metrics = payload[0] || {
            tickets_completed: 0,
            tickets_pending: 0,
            on_time_completion_rate: 0,
            quick_response_rate: 0,
            avg_customer_rating: 0
        };
    } else if (payload?.data) {
        metrics = payload.data;
    } else {
        metrics = payload || {
            tickets_completed: 0,
            tickets_pending: 0,
            on_time_completion_rate: 0,
            quick_response_rate: 0,
            avg_customer_rating: 0
        };
    }

    return { success: true, status: 200, data: metrics };
}

// Get Unassigned Tickets from webhook
export async function getUnassignedTickets(): Promise<ApiResponse<{ items: TicketSummary[]; total: number }>> {
    const user = getAuthUser() || {} as any;
    const email = user.email;
    const staffCode = user["staff-code"] || user.staffCode || user.code || undefined;
    const body = { email, "staff-code": staffCode } as any;

    if (USE_MOCK_DATA) {
        // Return mock unassigned tickets matching the API structure
        const mockUnassignedTickets: TicketSummary[] = [
            {
                id: "TK-DL-005",
                type: "delivery",
                title: "Công ty CP Đầu tư Minh Tuấn",
                customer: "Công ty CP Đầu tư Minh Tuấn",
                address: "654 Đường Lý Tự Trọng, Quận 1, TP.HCM",
                deadline: "2025-10-01T16:00:00.000Z",
                status: "assigned",
            },
            {
                id: "MT20250926-175521",
                type: "maintenance",
                title: "Lê Minh Cường",
                customer: "Lê Minh Cường",
                address: "undefined", // As shown in the image
                deadline: "2025-09-26T10:55:21.298Z",
                status: "assigned",
            },
            {
                id: "MT20250926-175521",
                type: "maintenance", 
                title: "Võ Thị Hoa",
                customer: "Võ Thị Hoa",
                address: "Khu vực máy bơm, Nhà máy DEF, KCN Tân Thuận",
                deadline: "2025-09-26T10:55:21.298Z",
                status: "assigned",
            }
        ];
        return {
            success: true,
            status: 200,
            data: { items: mockUnassignedTickets, total: mockUnassignedTickets.length }
        };
    }

    const res = await apiRequest<any>({
        method: "POST",
        path: "/webhook/tickets/not-assigned",
        body
    });

    if (!res.success) {
        console.error('[getUnassignedTickets] API failed:', res);
        return res as any;
    }

    const payload = res.data as any;
    let items: TicketSummary[] = [];

    // Handle different response structures including nested arrays
	if (import.meta.env.DEV) {
		console.debug('[getUnassignedTickets] raw payload:', payload);
	}

	if (Array.isArray(payload)) {
        // Flatten nested arrays and map each item
		const flattenItems = (node: any): any[] => {
			if (Array.isArray(node)) {
				return node.flatMap((child) => flattenItems(child));
			}
			if (node && typeof node === 'object') {
				const keys = Object.keys(node);
				// Handle objects that wrap an array under "" or a single key
				if (keys.length === 1 && Array.isArray((node as any)[keys[0]])) {
					return flattenItems((node as any)[keys[0]]);
				}
				return [node];
			}
			return [];
		};

		const flatPayload = flattenItems(payload);
		if (import.meta.env.DEV) {
			console.debug('[getUnassignedTickets] flat payload (array) length:', flatPayload.length);
			console.debug('[getUnassignedTickets] sample item:', flatPayload[0]);
		}
        
		items = flatPayload.map((item: any) => {
			const id = item["ticket-id"] || item.ticket_id || item.ticketId || item.id;
			const rawType = String(item?.type || '').trim();
			const type: TicketType = rawType === "Giao hàng và Lắp đặt" ? "delivery" : rawType === "Bảo trì / Sửa chữa" ? "maintenance" : "sales";
			if (import.meta.env.DEV && (!id || !type)) {
				console.debug('[getUnassignedTickets] missing id/type item:', { id, rawType, item });
			}
			return {
				id: id || `TK-${Date.now()}`,
				type,
				subTypeLabel: rawType || undefined,
				title: item.customer || "Khách hàng",
				customer: item.customer || "Khách hàng",
				address: item.address === "undefined" ? "" : (item.address || ""),
				deadline: item.deadline || new Date().toISOString(),
				status: "assigned" as TicketStatus,
				statusDisplayLabel: "Chưa phân công"
			};
		});
    } else if (payload?.data && Array.isArray(payload.data)) {
		const flattenItems = (node: any): any[] => {
			if (Array.isArray(node)) {
				return node.flatMap((child) => flattenItems(child));
			}
			if (node && typeof node === 'object') {
				const keys = Object.keys(node);
				if (keys.length === 1 && Array.isArray((node as any)[keys[0]])) {
					return flattenItems((node as any)[keys[0]]);
				}
				return [node];
			}
			return [];
		};

		const flatPayload = flattenItems(payload.data);
		if (import.meta.env.DEV) {
			console.debug('[getUnassignedTickets] flat payload (payload.data) length:', flatPayload.length);
			console.debug('[getUnassignedTickets] sample item (data):', flatPayload[0]);
		}
        
		items = flatPayload.map((item: any) => {
			const id = item["ticket-id"] || item.ticket_id || item.ticketId || item.id;
			const rawType = String(item?.type || '').trim();
			const type: TicketType = rawType === "Giao hàng và Lắp đặt" ? "delivery" : rawType === "Bảo trì / Sửa chữa" ? "maintenance" : "sales";
			if (import.meta.env.DEV && (!id || !type)) {
				console.debug('[getUnassignedTickets] missing id/type item (data):', { id, rawType, item });
			}
			return {
				id: id || `TK-${Date.now()}`,
				type,
				subTypeLabel: rawType || undefined,
				title: item.customer || "Khách hàng",
				customer: item.customer || "Khách hàng",
				address: item.address === "undefined" ? "" : (item.address || ""),
				deadline: item.deadline || new Date().toISOString(),
				status: "assigned" as TicketStatus,
				statusDisplayLabel: "Chưa phân công"
			};
		});
    }

    return { success: true, status: 200, data: { items, total: items.length } };
}

// Create Activity & Support ticket
export interface CreateActivityTicketInput {
    subject: string;
    description?: string;
    owner?: string; // Người thực hiện
    customer: string;
    customerEmail?: string;
    address: string;
    status?: TicketStatus; // default in-progress
    deadline?: string; // ISO
    completedAt?: string; // ISO when status completed
    orderCode?: string;
    notes?: string;
}

export async function createActivityTicket(input: CreateActivityTicketInput): Promise<ApiResponse<{ id: string }>> {
    if (USE_MOCK_DATA) {
        const id = `AS${Date.now().toString().slice(-6)}`;
        const summary: TicketSummary = {
            id,
            type: "sales",
            title: input.subject,
            customer: input.customer,
            address: input.address,
            deadline: new Date().toISOString(),
            status: input.status || "in-progress",
        };
        mockTickets.push(summary);
        mockTicketDetails[id] = {
            ...summary,
            customerInfo: {
                name: input.customer,
                address: input.address,
                contactEmail: input.customerEmail,
            },
            activityInfo: {
                subject: input.subject,
                description: input.description,
                owner: input.owner || "Kỹ thuật viên",
                startTime: new Date().toISOString(),
                endTime: input.completedAt,
            },
            activityResult: input.status === "completed" ? { time: input.completedAt || new Date().toISOString(), note: input.notes, imageUrls: [] } : { time: undefined, note: undefined, imageUrls: [] },
            orderInfo: input.orderCode ? { orderCode: input.orderCode, itemsCount: 0, secretCodes: [] } : undefined,
            notes: input.notes || "",
        } as TicketDetail;
        return { success: true, status: 201, data: { id } };
    }
    return apiRequest<{ id: string }>({ method: "POST", path: "/api/activities", body: input, withAuth: true });
}

// ---------------------- Delivery & Installation (n8n) ----------------------
type ExternalDeliveryItem = {
    "ticket_id": string;
    "project_code"?: string;
    "customer_name"?: string;
    "phone_number"?: string;
    "address"?: string;
    "status"?: string; // e.g. "đã tiếp nhận", "đã hoàn thành"
    "description"?: string;
    "assign_time"?: string;
    "deadline"?: string;
    "created_time"?: string;
    "product_list"?: string; // New field from API to be used as title
};

function mapExternalStatusToAppStatus(input?: string): TicketStatus {
    const s = (input || "").toLowerCase().trim();
    // Normalize common variations
    if (/(hoan thanh|hoàn thành)/i.test(s) || s.includes("hoàn thành")) return "completed";
    if (/(chua bat dau|chưa bắt đầu)/i.test(s) || s.includes("chưa bắt đầu")) return "assigned";
    // Map both "Tiếp nhận" and "Đang thực hiện" to in-progress
    if (/(tiep nhan|tiếp nhận)/i.test(s) || s.includes("tiếp nhận")) return "in-progress";
    if (/(phan cong|phân công)/i.test(s) || s.includes("phân công")) return "assigned";
    if (/(dang thuc hien|đang thực hiện|in progress)/i.test(s)) return "in-progress";
    return "in-progress";
}

function mapExternalStatusToDisplay(input?: string): string {
    const s = (input || "").toLowerCase().trim();
    if (!s) return "Đang thực hiện";
    if (s.includes("hoàn thành") || s.includes("hoan thanh")) return "Đã hoàn thành";
    if (s.includes("chưa bắt đầu") || s.includes("chua bat dau")) return "Chưa bắt đầu";
    // Distinguish explicitly between "tiếp nhận" and "phân công"
    if (s.includes("tiếp nhận") || s.includes("tiep nhan")) return "Đã tiếp nhận";
    if (s.includes("phân công") || s.includes("phan cong")) return "Đã phân công";
    if (s.includes("đang thực hiện") || s.includes("dang thuc hien") || s.includes("in progress")) return "Đang thực hiện";
    return "Đang thực hiện";
}

export async function fetchDeliveryInstallTickets(filterStatus?: TicketStatus): Promise<ApiResponse<{ items: TicketSummary[]; total: number }>> {
    const user = getAuthUser() || {} as any;
    const email = user.email;
    const staffCode = user["staff-code"] || user.staffCode || user.code || undefined;
    const body = { email, "staff-code": staffCode } as any;

    const res = await apiRequest<{ data?: ExternalDeliveryItem[] } | ExternalDeliveryItem[]>({ method: "POST", path: "/webhook/tickets/delivery-installation", body });
    console.log('[fetchDeliveryInstallTickets] API Response:', res);
    
    if (!res.success) {
        console.error('[fetchDeliveryInstallTickets] API failed:', res);
        return res as any;
    }

    const payload = res.data as any;
    console.log('[fetchDeliveryInstallTickets] Payload type:', typeof payload, 'isArray:', Array.isArray(payload));
    console.log('[fetchDeliveryInstallTickets] Payload:', payload);
    
    // Handle nested response: res.data might be array with [0].data containing actual items
    let itemsRaw: ExternalDeliveryItem[] = [];
    if (Array.isArray(payload)) {
        // If payload is array, check first element for .data
        if (payload.length > 0 && payload[0]?.data) {
            itemsRaw = payload[0].data as ExternalDeliveryItem[];
        } else {
            itemsRaw = payload as ExternalDeliveryItem[];
        }
    } else if (payload?.data) {
        itemsRaw = payload.data as ExternalDeliveryItem[];
    } else {
        itemsRaw = [];
    }
    
    console.log('[fetchDeliveryInstallTickets] Raw items count:', itemsRaw?.length);
    console.log('[fetchDeliveryInstallTickets] Raw items:', itemsRaw);
    
	// Apply tab filtering based on ORIGINAL external status, per requirements
	let itemsRawFiltered: ExternalDeliveryItem[] = itemsRaw;
	if (filterStatus) {
		itemsRawFiltered = itemsRaw.filter((it) => {
			const s = (it.status || "").toLowerCase();
			const isAssigned = s.includes("phân công") || s.includes("phan cong");
			const isCompleted = s.includes("hoàn thành") || s.includes("hoan thanh");
			if (filterStatus === "assigned") return isAssigned;
			if (filterStatus === "completed") return isCompleted;
			// in-progress => everything else (còn lại)
			return !isAssigned && !isCompleted;
		});
	}

    const items: TicketSummary[] = itemsRawFiltered.map((it) => {
        const titleSource = it.customer_name || it.project_code || it.product_list || "Ticket giao hàng / lắp đặt";
        const titleString = String(titleSource);
        const MAX_TITLE_LEN = 112; // 48 + thêm 64 kí tự
        const truncatedTitle = titleString.length > MAX_TITLE_LEN
            ? `${titleString.slice(0, MAX_TITLE_LEN)}...`
            : titleString;
        const products = String(it.product_list || "")
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && s.toLowerCase() !== "undefined" && s.toLowerCase() !== "null");
        const mapped = {
            id: it.ticket_id,
            type: "delivery" as TicketType,
            title: truncatedTitle,
            projectCode: it.project_code,
            customer: it.customer_name || "Khách hàng",
            address: it.address || "",
            deadline: it.deadline || it.assign_time || it.created_time || new Date().toISOString(),
            status: mapExternalStatusToAppStatus(it.status),
            statusDisplayLabel: mapExternalStatusToDisplay(it.status),
            products,
        };
        console.log('[fetchDeliveryInstallTickets] Mapped ticket:', it.ticket_id, '→', mapped);
        return mapped;
    });

	let filtered = items; // Already filtered above using external statuses
	console.log(`[fetchDeliveryInstallTickets] Filter: ${filterStatus}, Total: ${items.length}`);
    
    // Fallback: if mapping misses some statuses, don't show empty list
    if (filterStatus && filtered.length === 0 && items.length > 0) {
        console.warn('[fetchDeliveryInstallTickets] No items match filter, showing all');
        filtered = items;
    }
    return { success: true, status: 200, data: { items: filtered, total: filtered.length } };
}

// Detail mapping for Delivery & Installation ticket
type ExternalDeliveryDetail = {
    ticket_id: string;
    order_id?: string;
    customer_name?: string;
    phone_number?: string;
    address?: string;
    status?: string;
    description?: string;
    assign_time?: string;
    deadline?: string;
    created_time?: string;
    orderDetail?: {
        order_id?: string;
        orderCode?: string;
        customerName?: string;
        totalAmount?: number;
        orderDate?: string;
        description?: string;
        deliveryDate?: string;
        contactName?: string;
        contactPhone?: string;
        deliveryAddress?: string;
        assignedDate?: string;
        status?: string;
    };
    devices?: Array<{
        device_id?: string;
        deviceCode?: string;
        serialNumber?: string;
        name?: string;
        brand?: string;
        description?: string;
        installationDate?: string;
        warrantyPeriod?: string;
        maintenancePeriod?: string;
    }>;
    products?: Array<{
        product_id?: string;
        sku?: string;
        name?: string;
        description?: string;
        brand?: string;
        warranty?: string;
        unit?: string;
        price?: number;
        quantity?: number;
        deliveryStatus?: string;
    }>;
};

export async function fetchDeliveryInstallTicketDetail(ticketId: string): Promise<ApiResponse<TicketDetail>> {
    const user = getAuthUser() || ({} as any);
    const email = (user as any)?.email;
    const staffCode = (user as any)["staff-code"] || (user as any).staffCode || (user as any).code || undefined;
    const body: any = { email, "staff-code": staffCode, "ticket-id": ticketId };

    // Prefer the dedicated detail endpoint; if not available, fall back to the list endpoint
    let res = await apiRequest<{ status?: string; message?: string; data?: ExternalDeliveryDetail } | ExternalDeliveryDetail | Array<{ status?: string; message?: string; data?: ExternalDeliveryDetail } | ExternalDeliveryDetail>>({
        method: "POST",
        path: "/webhook/tickets/delivery-installation-detail",
        body,
    });
    if (!res.success) {
        console.warn('[fetchDeliveryInstallTicketDetail] detail endpoint failed, falling back to /tickets/delivery-installation');
        res = await apiRequest<{ status?: string; message?: string; data?: ExternalDeliveryDetail } | ExternalDeliveryDetail | Array<{ status?: string; message?: string; data?: ExternalDeliveryDetail } | ExternalDeliveryDetail>>({
            method: "POST",
            path: "/webhook/tickets/delivery-installation",
            body,
        });
        if (!res.success) return res as any;
    }

    const payload = res.data as any;
    console.log('[fetchDeliveryInstallTicketDetail] Raw payload:', payload);
    let detailRaw: ExternalDeliveryDetail | undefined;
    if (Array.isArray(payload)) {
        const first = payload.find(Boolean);
        if (first && (first as any)?.data) detailRaw = (first as any).data as ExternalDeliveryDetail;
        else detailRaw = first as ExternalDeliveryDetail;
    } else if (payload && (payload as any).data) {
        detailRaw = (payload as any).data as ExternalDeliveryDetail;
    } else {
        detailRaw = payload as ExternalDeliveryDetail;
    }

    // Defensive: if API wraps inside { status, message, data }
    if ((detailRaw as any)?.status === undefined && (detailRaw as any)?.message && (detailRaw as any)?.data) {
        detailRaw = (detailRaw as any).data as ExternalDeliveryDetail;
    }

    const d = detailRaw || ({} as ExternalDeliveryDetail);
    console.log('[fetchDeliveryInstallTicketDetail] detailRaw (raw from API):', JSON.stringify(d, null, 2));
    console.log('[fetchDeliveryInstallTicketDetail] detailRaw fields:', {
        has_products: Array.isArray(d.products),
        products_count: Array.isArray(d.products) ? d.products.length : 0,
        has_product_code: Array.isArray((d as any).product_code),
        product_code_count: Array.isArray((d as any).product_code) ? (d as any).product_code.length : 0,
        has_product_list: Array.isArray((d as any).product_list),
        product_list_count: Array.isArray((d as any).product_list) ? (d as any).product_list.length : 0,
        raw_product_code: (d as any).product_code,
        raw_product_list: (d as any).product_list,
        raw_products: d.products,
    });

    // The API can return either:
    // (a) d.products: array of objects with {sku, name, quantity, ...}
    // (b) d.product_code: string[] + d.product_list: string[] (flat arrays from n8n)
    const rawProductCodes: string[] = Array.isArray((d as any).product_code) ? (d as any).product_code : [];
    const rawProductList: string[] = Array.isArray((d as any).product_list) ? (d as any).product_list : [];
    const hasNewFormat = rawProductCodes.length > 0 || rawProductList.length > 0;

    const goodsInfo = hasNewFormat
        ? rawProductCodes.map((code, idx) => ({ sku: code, name: rawProductList[idx] || code || "Hàng hóa", quantity: 1 }))
        : Array.isArray(d.products)
            ? d.products
                .filter((p) => p && (p.name || p.sku))
                .map((p) => ({ sku: p.sku, productId: p.product_id, name: p.name || "Hàng hóa", quantity: Number(p.quantity || 1) }))
            : [];

    console.log('[fetchDeliveryInstallTicketDetail] goodsInfo result:', { hasNewFormat, count: goodsInfo.length, goodsInfo });
    const deviceInfo = Array.isArray(d.devices)
        ? d.devices
            .filter((dv) => dv && (dv.name || dv.deviceCode || dv.serialNumber))
            .map((dv) => ({ model: dv.name || dv.deviceCode || "Thiết bị", serial: dv.serialNumber || undefined, deviceCode: dv.deviceCode || undefined, deviceId: dv.device_id || undefined, quantity: 1 }))
        : [];

    const titleBase = goodsInfo.map((p) => p?.name).filter(Boolean).join(", ") || d.customer_name || "Ticket giao hàng / lắp đặt";

    const detail: TicketDetail = {
        id: d.ticket_id || ticketId,
        type: "delivery",
        title: titleBase,
        projectCode: d.order_id,
        customer: d.customer_name || "Khách hàng",
        address: d.address || "",
        deadline: d.deadline || d.assign_time || d.created_time || new Date().toISOString(),
        status: mapExternalStatusToAppStatus(d.status),
        statusDisplayLabel: mapExternalStatusToDisplay(d.status),
        description: d.description,
        customerInfo: {
            name: d.customer_name || "Khách hàng",
            address: d.address || "",
            contactPhone: d.phone_number,
        },
        orderInfo: {
            orderCode: d.orderDetail?.orderCode || d.order_id,
            itemsCount: goodsInfo.length || undefined,
            secretCodes: goodsInfo.map((p) => ({ code: p.sku || "", productId: (p as any).productId, name: p.name || "Hàng hóa", quantity: Number(p.quantity || 1) })),
            customerName: d.orderDetail?.customerName,
            totalAmount: d.orderDetail?.totalAmount,
            orderDate: d.orderDetail?.orderDate,
            description: d.orderDetail?.description,
            deliveryDate: d.orderDetail?.deliveryDate,
            contactName: d.orderDetail?.contactName,
            contactPhone: d.orderDetail?.contactPhone,
            deliveryAddress: d.orderDetail?.deliveryAddress,
            assignedDate: d.orderDetail?.assignedDate,
            status: d.orderDetail?.status,
        },
        goodsInfo,
        deviceInfo,
        notes: d.orderDetail?.description || d.description,
        // Map completion info (if provided by API) to a unified activityResult field
        activityResult: (d as any)?.finished_time || (d as any)?.finished_note || (d as any)?.finished_image
            ? {
                  time: (d as any).finished_time,
                  note: (d as any).finished_note,
                  imageUrls: (d as any).finished_image ? [ (d as any).finished_image ] : [],
              }
            : undefined,
    };

    // Fallback: if critical fields are missing, try merging from the list endpoint
    const missingCore = !detail.customerInfo?.name && !detail.address && !detail.projectCode && (!detail.goodsInfo || detail.goodsInfo.length === 0) && (!detail.deviceInfo || detail.deviceInfo.length === 0);
    if (missingCore) {
        try {
            const listRes = await fetchDeliveryInstallTickets();
            if (listRes.success && listRes.data) {
                const found = (listRes.data.items || []).find((it) => it.id === ticketId);
                if (found) {
                    detail.title = detail.title || found.title;
                    detail.projectCode = detail.projectCode || found.projectCode;
                    detail.customer = detail.customer || found.customer;
                    detail.address = detail.address || found.address;
                    detail.deadline = detail.deadline || found.deadline;
                    detail.status = detail.status || found.status;
                    detail.statusDisplayLabel = detail.statusDisplayLabel || found.statusDisplayLabel;
                    detail.customerInfo = detail.customerInfo || { name: found.customer, address: found.address };
                }
            }
        } catch (e) {
            console.warn('[fetchDeliveryInstallTicketDetail] Fallback merge failed:', e);
        }
    }

    console.log('[fetchDeliveryInstallTicketDetail] Mapped detail:', detail);

    return { success: true, status: 200, data: detail };
}

// Complete Delivery/Installation ticket
export async function completeDeliveryInstallTicket(input: {
    ticketId: string;
    note?: string;
    productCodes?: string[]; // product IDs / SKUs
    serials?: string[]; // device Serials
    base64Images?: string[]; // first will be sent as base64-result-image
}): Promise<ApiResponse<{ ok: boolean }>> {
    const body: any = {
        "ticket-id": input.ticketId,
        note: input.note,
        products: Array.isArray(input.productCodes) ? input.productCodes : [],
        serials: Array.isArray(input.serials) ? input.serials : [],
    };
    if (Array.isArray(input.base64Images) && input.base64Images.length > 0) {
        body["base64-result-image"] = input.base64Images[0];
        // Optional: provide all images if backend supports array
        if (input.base64Images.length > 1) body["base64-result-images"] = input.base64Images;
    }

    const res = await apiRequest<{ ok: boolean }>({
        method: "POST",
        path: "/webhook/tickets/delivery-installation/complete",
        body,
    });
    return res as any;
}

// Tạo ticket mới cho hàng hóa / thiết bị chưa được xử lý trong ticket giao hàng gốc
export async function createResidualDeliveryTicket(input: {
    originalTicket: TicketDetail;
    unfinishedProductCodes: string[];
    unfinishedSerials: string[];
}): Promise<ApiResponse<{ ok: boolean }>> {
    const { originalTicket: t, unfinishedProductCodes, unfinishedSerials } = input;

    // Lọc chỉ giữ hàng hóa chưa được tick
    const residualProducts = (t.orderInfo?.secretCodes || []).filter((p) =>
        unfinishedProductCodes.includes(p.code)
    );

    // Lọc chỉ giữ thiết bị chưa được tick
    const residualDevices = (t.deviceInfo || []).filter((d) =>
        unfinishedSerials.includes(d.serial || "")
    );

    const user = getAuthUser() || {} as any;
    const staffCode = user["staff-code"] || user.staffCode || user.code || undefined;

    const body: Record<string, any> = {
        "ticket-id": t.id,
        "order-id": t.projectCode,
        "order-code": t.orderInfo?.orderCode,
        "customer-name": t.customerInfo?.name,
        "phone-number": t.customerInfo?.contactPhone,
        "address": t.customerInfo?.address,
        "deadline": t.deadline,
        "description": t.notes,
        "staff-code": staffCode,
        "products": residualProducts.map((p) => ({
            "product-id": p.productId,
            code: p.code,
            name: p.name,
            quantity: p.quantity ?? 1,
        })),
        "devices": residualDevices.map((d) => ({
            "device-id": d.deviceId,
            "device-code": d.deviceCode,
            serial: d.serial,
            model: d.model,
        })),
    };

    console.log("[createResidualDeliveryTicket] Posting residual ticket:", body);

    const res = await apiRequest<{ records?: any[]; ok?: boolean }>({
        method: "POST",
        path: "https://automation.osi.vn/webhook/create-delivery",
        body,
    });

    // Thành công khi response có records array (Airtable response)
    const payload = res.data as any;
    const hasRecords = Array.isArray(payload?.records) && payload.records.length > 0;
    return { ...res, success: hasRecords || res.success } as any;
}

// ---------------------- Maintenance / Repair (n8n) ----------------------
type ExternalMaintenanceItem = {
    "ticket_id": string;
    "order_id"?: string;
    "type"?: string; // e.g. "Sửa chữa trong thời hạn bảo hành"
    "customer_name"?: string;
    "phone_number"?: string;
    "address"?: string;
    "status"?: string;
    "title"?: string; // short issue title
    "description"?: string;
    "device_model"?: string;
    "device_serial"?: string;
    "assign_time"?: string;
    "deadline"?: string;
    "created_time"?: string;
};

export async function fetchMaintenanceTickets(filterStatus?: TicketStatus): Promise<ApiResponse<{ items: TicketSummary[]; total: number }>> {
    const user = getAuthUser() || {} as any;
    const email = user.email;
    const staffCode = user["staff-code"] || user.staffCode || user.code || undefined;
    const body = { email, "staff-code": staffCode } as any;

    const res = await apiRequest<{ data?: ExternalMaintenanceItem[] } | ExternalMaintenanceItem[]>({ method: "POST", path: "/webhook/tickets/maintenance-repair", body });
    console.log('[fetchMaintenanceTickets] API Response:', res);
    if (!res.success) {
        console.error('[fetchMaintenanceTickets] API failed:', res);
        return res as any;
    }

    const payload = res.data as any;
    let itemsRaw: ExternalMaintenanceItem[] = [];
    if (Array.isArray(payload)) {
        if (payload.length > 0 && payload[0]?.data) itemsRaw = payload[0].data as ExternalMaintenanceItem[];
        else itemsRaw = payload as ExternalMaintenanceItem[];
    } else if (payload?.data) {
        itemsRaw = payload.data as ExternalMaintenanceItem[];
    } else {
        itemsRaw = [];
    }

    // Filter by external status words per tab definition:
    // - assigned tab: only "Đã phân công"
    // - in-progress tab: "Đã tiếp nhận" OR "Đang thực hiện"
    // - completed tab: "Đã hoàn thành"
    let itemsRawFiltered: ExternalMaintenanceItem[] = itemsRaw;
    if (filterStatus) {
        itemsRawFiltered = itemsRaw.filter((it) => {
            const s = (it.status || "").toLowerCase();
            const isAssignedTab = s.includes("phân công") || s.includes("phan cong");
            const isInProgressTab = s.includes("tiếp nhận") || s.includes("tiep nhan") || s.includes("đang thực hiện") || s.includes("dang thuc hien") || s.includes("in progress");
            const isCompletedTab = s.includes("hoàn thành") || s.includes("hoan thanh");
            if (filterStatus === "assigned") return isAssignedTab;
            if (filterStatus === "completed") return isCompletedTab;
            if (filterStatus === "in-progress") return isInProgressTab;
            return true;
        });
    }

    const items: TicketSummary[] = itemsRawFiltered.map((it) => ({
        id: it.ticket_id,
        type: "maintenance",
        title: it.title || it.customer_name || "Bảo trì / Sửa chữa",
        projectCode: it.order_id,
        customer: it.customer_name || "Khách hàng",
        address: it.address || "",
        deadline: it.deadline || it.assign_time || it.created_time || new Date().toISOString(),
        status: mapExternalStatusToAppStatus(it.status),
        statusDisplayLabel: mapExternalStatusToDisplay(it.status),
        subTypeLabel: it.type,
        deviceModel: it.device_model,
        deviceSerial: it.device_serial,
    }));

    return { success: true, status: 200, data: { items, total: items.length } };
}

// Maintenance/Repair ticket detail
export async function fetchMaintenanceTicketDetail(ticketId: string): Promise<ApiResponse<TicketDetail>> {
    const user = getAuthUser() || ({} as any);
    const email = (user as any)?.email;
    const staffCode = (user as any)["staff-code"] || (user as any).staffCode || (user as any).code || undefined;
    const body: any = { "ticket-id": ticketId };
    if (email) body.email = email;
    if (staffCode) body["staff-code"] = staffCode;

    const res = await apiRequest<{ status?: string; message?: string; data?: any } | { data?: any } | any>({
        method: "POST",
        path: "/webhook/tickets/maintenance-repair-detail",
        body,
    });
    if (!res.success) return res as any;

    const payload = res.data as any;
    const wrapper = Array.isArray(payload) ? payload.find(Boolean) : payload;
    const d = (wrapper?.data ?? wrapper) || {};

    const detail: TicketDetail = {
        id: d.ticket_id || ticketId,
        type: "maintenance",
        title: d.problem_description || d.ticket_type || d.customer_name || "Ticket bảo trì / sửa chữa",
        projectCode: undefined,
        customer: d.customer_name || "Khách hàng",
        address: d.order_detail?.deliveryAddress || d.company || "",
        deadline: d.request_time || d.assign_time || d.start_time || new Date().toISOString(),
        status: mapExternalStatusToAppStatus(d.status),
        statusDisplayLabel: mapExternalStatusToDisplay(d.status),
        description: d.problem_description,
        customerInfo: {
            name: d.customer_name || "Khách hàng",
            address: d.order_detail?.deliveryAddress || "",
            contactPhone: d.phone_number,
            contactEmail: d.email,
        },
        orderInfo: d.order_detail
            ? {
                  orderCode: d.order_detail.orderCode,
                  itemsCount: undefined,
                  secretCodes: [],
                  customerName: d.order_detail.customerName,
                  totalAmount: d.order_detail.totalPrice,
                  orderDate: d.order_detail.orderDate,
                  description: d.order_detail.orderDescription,
                  deliveryDate: d.order_detail.deliveryDate || d.order_detail.expectedDelivery,
                  contactName: d.order_detail.staffName,
                  contactPhone: d.order_detail.phone,
                  deliveryAddress: d.order_detail.deliveryAddress,
                  status: d.order_detail.status,
              }
            : undefined,
        goodsInfo: [],
        deviceInfo: d.devices
            ? [
                  {
                      model: d.devices.name || d.devices.deviceCode || d.devices.device_model,
                      serial: d.devices.serialNumber,
                      quantity: 1,
                  },
              ]
            : [],
        notes: d.customer_response || d.feedback_content,
        maintenanceExtra: {
            company: d.company,
            ticketType: d.ticket_type,
            ticketCategory: d.ticket_category,
            deviceBrand: d.device_brand || d.devices?.brand,
            deviceModel: d.device_model || d.devices?.name,
            serialNumber: d.serial_number || d.devices?.serialNumber,
            installationDate: d.devices?.installationDate,
            imageDeviceUrl: d.image_device,
            createdAt: d.request_time,
            assignedAt: d.assign_time,
            startLocation: d.start_location,
            completeLocation: d.complete_location,
        },
        firstResponse: {
            time: d.first_response_time || d.assign_time,
            note: d.first_response_content,
            imageUrls: d.first_response_image ? [d.first_response_image] : undefined,
        },
        supplierInstruction: {
            time: d.supplier_response_time || d.supplier_contact_time,
            contactTime: d.supplier_contact_time,
            responseTime: d.supplier_response_time,
            note: d.supplier_response_content,
        },
        supplierInstructionLogs: Array.isArray(d.supplier_instruction_logs)
            ? d.supplier_instruction_logs.map((log: any) => ({
                  contactCode: log?.contactCode || log?.contact_code,
                  contactTime: log?.contactTime || log?.contact_time,
                  responseTime: log?.responseTime || log?.response_time,
                  responseContent: log?.responseContent || log?.response_content,
                  note: log?.note,
              }))
            : undefined,
        startExecution: {
            time: d.start_time,
            note: undefined,
            imageUrls: d.start_image ? [d.start_image] : undefined,
        },
        resultRecord: {
            time: d.complete_time,
            note: d.feedback_content,
            imageUrls: d.complete_image ? [d.complete_image] : undefined,
        },
    };

    return { success: true, status: 200, data: detail };
}

// Update maintenance contact info (n8n)
export async function updateMaintenanceContactInfo(
    ticketId: string,
    payload: { name?: string; company?: string; phone?: string; mail?: string },
): Promise<ApiResponse<{ ok: true }>> {
    const user = getAuthUser() || ({} as any);
    const email = (user as any)?.email;
    const staffCode = (user as any)["staff-code"] || (user as any).staffCode || (user as any).code || undefined;

    const body: any = { "ticket-id": ticketId, data: payload };
    if (email) body.email = email;
    if (staffCode) body["staff-code"] = staffCode;

    const res = await apiRequest<{ status?: string; message?: string; data?: any }>({
        method: "POST",
        path: "/webhook/ticket/maintenance-update-contact-info",
        body,
    });

    if (!res.success) return res as any;

    const status = (res.data as any)?.status;
    const isOk = typeof status === "string" ? status.toLowerCase() === "success" : true;
    if (!isOk) {
        return { success: false, status: res.status, message: (res.data as any)?.message || "Cập nhật không thành công" } as any;
    }
    return { success: true, status: res.status, data: { ok: true } };
}

// Check device serial and return device info (n8n)
export async function checkDeviceSerial(serial: string): Promise<ApiResponse<{ brand?: string; model?: string; "install-date"?: string }>> {
    const res = await apiRequest<{ status?: string; message?: string; data?: any }>({
        method: "POST",
        path: "/webhook/serial-check",
        body: { serial },
    });
    if (!res.success) return res as any;

    const payload = res.data as any;
    const wrapper = Array.isArray(payload) ? payload.find(Boolean) : payload;
    const status = (wrapper?.status || (wrapper?.data ? "success" : "")) as string;
    if (typeof status === "string" && status.toLowerCase().includes("serial not found")) {
        return { success: false, status: 404, message: "Serial not found" } as any;
    }
    const data = (wrapper?.data || {}) as { brand?: string; model?: string; "install-date"?: string };
    return { success: true, status: res.status, data };
}

// Update maintenance device info (n8n)
export async function updateMaintenanceDeviceInfo(
    ticketId: string,
    payload: { brand?: string; model?: string; serial?: string; "install-date"?: string },
): Promise<ApiResponse<{ ok: true }>> {
    const user = getAuthUser() || ({} as any);
    const email = (user as any)?.email;
    const staffCode = (user as any)["staff-code"] || (user as any).staffCode || (user as any).code || undefined;

    const body: any = { "ticket-id": ticketId, data: payload };
    if (email) body.email = email;
    if (staffCode) body["staff-code"] = staffCode;

    const res = await apiRequest<{ status?: string; message?: string; data?: any }>({
        method: "POST",
        path: "/webhook/ticket/maintenance-update-device-info",
        body,
    });
    if (!res.success) return res as any;
    const status = (res.data as any)?.status;
    const isOk = typeof status === "string" ? status.toLowerCase() === "success" : true;
    if (!isOk) return { success: false, status: res.status, message: (res.data as any)?.message || "Cập nhật không thành công" } as any;
    return { success: true, status: res.status, data: { ok: true } };
}



// Update maintenance type/category
export async function updateMaintenanceTypeCategory(
    ticketId: string,
    params: { type?: string; category?: string },
): Promise<ApiResponse<{ ok: true }>> {
    const user = getAuthUser() || ({} as any);
    const email = (user as any)?.email;
    const staffCode = (user as any)["staff-code"] || (user as any).staffCode || (user as any).code || undefined;

    const body: any = { "ticket-id": ticketId, data: { type: params.type, category: params.category } };
    if (email) body.email = email;
    if (staffCode) body["staff-code"] = staffCode;

    const res = await apiRequest<{ status?: string; message?: string; data?: any }>({
        method: "POST",
        path: "/webhook/ticket/maintenance-update-type",
        body,
    });
    if (!res.success) return res as any;
    const status = (res.data as any)?.status;
    const isOk = typeof status === "string" ? status.toLowerCase() === "success" : true;
    if (!isOk) return { success: false, status: res.status, message: (res.data as any)?.message || "Cập nhật không thành công" } as any;
    return { success: true, status: res.status, data: { ok: true } };
}

// Update First Response (time, content, image as base64)
export async function updateMaintenanceFirstResponse(
    ticketId: string,
    payload: { "first-response-time"?: string; "first-response-content"?: string; "first-response-image"?: string },
): Promise<ApiResponse<{ ok: true }>> {
    const user = getAuthUser() || ({} as any);
    const email = (user as any)?.email;
    const staffCode = (user as any)["staff-code"] || (user as any).staffCode || (user as any).code || undefined;

    const body: any = { "ticket-id": ticketId, data: payload };
    if (email) body.email = email;
    if (staffCode) body["staff-code"] = staffCode;

    const res = await apiRequest<{ status?: string; message?: string; data?: any }>({
        method: "POST",
        path: "/webhook/ticket/maintenance-update-first-response",
        body,
    });
    if (!res.success) return res as any;
    const status = (res.data as any)?.status;
    const isOk = typeof status === "string" ? status.toLowerCase() === "success" : true;
    if (!isOk) return { success: false, status: res.status, message: (res.data as any)?.message || "Cập nhật không thành công" } as any;
    return { success: true, status: res.status, data: { ok: true } };
}

// Update Supplier Instruction
export async function updateMaintenanceSupplierInstruction(
    ticketId: string,
    payload: { "contact-date"?: string; "response-date"?: string; "response-content"?: string },
): Promise<ApiResponse<{ ok: true }>> {
    const user = getAuthUser() || ({} as any);
    const email = (user as any)?.email;
    const staffCode = (user as any)["staff-code"] || (user as any).staffCode || (user as any).code || undefined;

    const body: any = { "ticket-id": ticketId, data: payload };
    if (email) body.email = email;
    if (staffCode) body["staff-code"] = staffCode;

    const res = await apiRequest<{ status?: string; message?: string; data?: any }>({
        method: "POST",
        path: "/webhook/ticket/maintenance-update-supplier",
        body,
    });
    if (!res.success) return res as any;
    const status = (res.data as any)?.status;
    const isOk = typeof status === "string" ? status.toLowerCase() === "success" : true;
    if (!isOk) return { success: false, status: res.status, message: (res.data as any)?.message || "Cập nhật không thành công" } as any;
    return { success: true, status: res.status, data: { ok: true } };
}

// Start execution
export async function maintenanceStart(
    ticketId: string,
    payload: { "start-image"?: string; "start-time"?: string; "start-location"?: string },
): Promise<ApiResponse<{ ok: true }>> {
    const user = getAuthUser() || ({} as any);
    const email = (user as any)?.email;
    const staffCode = (user as any)["staff-code"] || (user as any).staffCode || (user as any).code || undefined;

    const body: any = { "ticket-id": ticketId, data: payload };
    if (email) body.email = email;
    if (staffCode) body["staff-code"] = staffCode;

    const res = await apiRequest<{ status?: string; message?: string; data?: any }>({
        method: "POST",
        path: "/webhook/ticket/maintenance-start",
        body,
    });
    if (!res.success) return res as any;
    const status = (res.data as any)?.status;
    const isOk = typeof status === "string" ? status.toLowerCase() === "success" : true;
    if (!isOk) return { success: false, status: res.status, message: (res.data as any)?.message || "Cập nhật không thành công" } as any;
    return { success: true, status: res.status, data: { ok: true } };
}

// Result record
export async function maintenanceResult(
    ticketId: string,
    payload: { note?: string; "result-image"?: string; "result-time"?: string; "result-location"?: string },
): Promise<ApiResponse<{ ok: true }>> {
    const user = getAuthUser() || ({} as any);
    const email = (user as any)?.email;
    const staffCode = (user as any)["staff-code"] || (user as any).staffCode || (user as any).code || undefined;

    const body: any = { "ticket-id": ticketId, data: payload };
    if (email) body.email = email;
    if (staffCode) body["staff-code"] = staffCode;

    const res = await apiRequest<{ status?: string; message?: string; data?: any }>({
        method: "POST",
        path: "/webhook/ticket/maintenance-resut",
        body,
    });
    if (!res.success) return res as any;
    const status = (res.data as any)?.status;
    const isOk = typeof status === "string" ? status.toLowerCase() === "success" : true;
    if (!isOk) return { success: false, status: res.status, message: (res.data as any)?.message || "Cập nhật không thành công" } as any;
    return { success: true, status: res.status, data: { ok: true } };
}

// ---------------------- Activity & Support (n8n) ----------------------
type ExternalActivityItem = {
    "ticket_id": string;
    "activity_name"?: string;
    "type"?: string; // e.g. Demo Sản phẩm, Hoạt động khác
    "order_id"?: string;
    "customer_name"?: string;
    "phone_number"?: string;
    "status"?: string;
    "title"?: string;
    "description"?: string;
    "deadline"?: string;
    "created_time"?: string;
};

export async function fetchActivitySupportTickets(filterStatus?: TicketStatus): Promise<ApiResponse<{ items: TicketSummary[]; total: number }>> {
    const user = getAuthUser() || {} as any;
    const email = user.email;
    const staffCode = user["staff-code"] || user.staffCode || user.code || undefined;
    const body = { email, "staff-code": staffCode } as any;

    const res = await apiRequest<{ data?: ExternalActivityItem[] } | ExternalActivityItem[]>({ method: "POST", path: "/webhook/tickets/activity-support", body });
    console.log('[fetchActivitySupportTickets] API Response:', res);
    if (!res.success) {
        console.error('[fetchActivitySupportTickets] API failed:', res);
        return res as any;
    }

    const payload = res.data as any;
    let itemsRaw: ExternalActivityItem[] = [];
    if (Array.isArray(payload)) {
        if (payload.length > 0 && payload[0]?.data) itemsRaw = payload[0].data as ExternalActivityItem[];
        else itemsRaw = payload as ExternalActivityItem[];
    } else if (payload?.data) {
        itemsRaw = payload.data as ExternalActivityItem[];
    } else {
        itemsRaw = [];
    }

    let itemsRawFiltered: ExternalActivityItem[] = itemsRaw;
    if (filterStatus) {
        itemsRawFiltered = itemsRaw.filter((it) => {
            const s = (it.status || "").toLowerCase();
            const isAssigned = s.includes("phân công") || s.includes("phan cong") || s.includes("chưa bắt đầu") || s.includes("chua bat dau");
            const isCompleted = s.includes("hoàn thành") || s.includes("hoan thanh");
            if (filterStatus === "assigned") return isAssigned;
            if (filterStatus === "completed") return isCompleted;
            return !isAssigned && !isCompleted;
        });
    }

    const items: TicketSummary[] = itemsRawFiltered.map((it) => ({
        id: it.ticket_id,
        type: "sales",
        title: it.activity_name || it.title || it.customer_name || "Hoạt động & Hỗ trợ",
        projectCode: it.order_id,
        customer: it.customer_name || "Khách hàng",
        address: "",
        deadline: it.deadline || it.created_time || new Date().toISOString(),
        status: mapExternalStatusToAppStatus(it.status),
        statusDisplayLabel: mapExternalStatusToDisplay(it.status),
        subTypeLabel: it.type,
        description: it.description,
    }));

    return { success: true, status: 200, data: { items, total: items.length } };
}

// Detail mapping for Activity & Support ticket
type ExternalActivityDetail = {
    ticket_id: string;
    activity_type?: string; // Demo Sản phẩm, Hoạt động khác
    activity_name?: string; // Hỗ trợ sử dụng sản phẩm
    type?: string; // alt key for activity_type
    name?: string; // alt key for activity_name
    activity_info?: {
        type?: string;
        name?: string;
        description?: string;
    };
    title?: string;
    description?: string;
    related_order?: { order_id?: string; order_link?: string };
    customer_info?: { company_name?: string; contact_name?: string; email?: string; phone?: string };
    status?: { current?: string; deadline?: string; completed_at?: string };
    result?: { summary?: string; notes?: string };
    timestamps?: { created_at?: string; updated_at?: string };
};

export async function fetchActivitySupportTicketDetail(ticketId: string): Promise<ApiResponse<TicketDetail>> {
    const body: any = { "ticket-id": ticketId };
    const res = await apiRequest<{ status?: string; message?: string; data?: ExternalActivityDetail } | ExternalActivityDetail | Array<{ status?: string; message?: string; data?: ExternalActivityDetail } | ExternalActivityDetail>>({
        method: "POST",
        path: "/webhook/tickets/activity-support-detail",
        body,
    });
    if (!res.success) return res as any;

    const payload = res.data as any;
    let d: ExternalActivityDetail | undefined;
    if (Array.isArray(payload)) {
        const first = payload.find(Boolean);
        if (first && (first as any)?.data) d = (first as any).data as ExternalActivityDetail;
        else d = first as ExternalActivityDetail;
    } else if ((payload as any)?.data) {
        d = (payload as any).data as ExternalActivityDetail;
    } else {
        d = payload as ExternalActivityDetail;
    }

    const detailSource = d || ({} as ExternalActivityDetail);
    const sanitize = (value: any): string | undefined => {
        if (!value) return undefined;
        const str = String(value).trim();
        if (!str || str.toLowerCase() === "undefined" || str.toLowerCase() === "null") return undefined;
        return str;
    };

    const activityInfo = detailSource.activity_info || ({} as any);
    const statusRaw = detailSource.status || {};
    const customerInfoRaw = detailSource.customer_info || {};
    const relatedOrderRaw = detailSource.related_order || {};
    const resultRaw = detailSource.result || {};
    const timestampsRaw = detailSource.timestamps || {};

    const activityType = sanitize(activityInfo.type) || sanitize(detailSource.activity_type) || sanitize(detailSource.type);
    const subject =
        sanitize(activityInfo.name) ||
        sanitize(detailSource.activity_name) ||
        sanitize(detailSource.name) ||
        sanitize(detailSource.title) ||
        activityType ||
        "Hoạt động & Hỗ trợ";
    const description = sanitize(activityInfo.description) || sanitize(detailSource.description);
    const customerName = sanitize(customerInfoRaw.company_name) || "Khách hàng";
    const contactName = sanitize(customerInfoRaw.contact_name);
    const phone = sanitize(customerInfoRaw.phone);
    const email = sanitize(customerInfoRaw.email);
    const orderId = sanitize(relatedOrderRaw.order_id);
    const statusLabel = sanitize(statusRaw.current);
    const deadline = sanitize(statusRaw.deadline) || sanitize(timestampsRaw.created_at) || new Date().toISOString();
    const completedAt = sanitize(statusRaw.completed_at);
    const resultNotes = sanitize(resultRaw.notes);
    const resultSummary = sanitize(resultRaw.summary);

    const detail: TicketDetail = {
        id: detailSource.ticket_id || ticketId,
        type: "sales",
        title: subject,
        projectCode: orderId,
        customer: customerName,
        address: "",
        deadline,
        status: mapExternalStatusToAppStatus(statusLabel),
        statusDisplayLabel: mapExternalStatusToDisplay(statusLabel),
        subTypeLabel: activityType,
        description,
        customerInfo: {
            name: customerName,
            address: "",
            contactPhone: phone,
            contactEmail: email,
        },
        orderInfo: orderId
            ? {
                  orderCode: orderId,
                  itemsCount: undefined,
                  secretCodes: [],
                  description: undefined,
              }
            : undefined,
        activityInfo: {
            subject,
            description,
            owner: contactName,
            startTime: sanitize(timestampsRaw.created_at),
            endTime: completedAt,
        },
        activityResult: resultNotes
            ? { time: completedAt, note: resultNotes, imageUrls: [] }
            : { time: completedAt, note: undefined, imageUrls: [] },
        notes: resultSummary,
    };

    return { success: true, status: 200, data: detail };
}

// Update Activity & Support main information
// Payload format giống CreateActivitySupportTicketInput để match với form tạo ticket
export async function updateActivitySupportInfo(
    ticketId: string,
    payload: {
        name?: string; // Tên hoạt động (thay vì subject)
        description?: string;
        customer_name?: string; // Khách hàng (thay vì customer)
        customer_record_id?: string; // Record ID của khách hàng
        type?: string; // Loại hoạt động
        deadline?: string; // Hạn hoàn thành (ISO string)
        status?: string; // Trạng thái: "Chưa bắt đầu" hoặc "Đã hoàn thành"
        complete_date?: string; // Ngày hoàn thành (ISO string)
        note?: string; // Ghi chú
        result?: string; // Kết quả - chỉ khi status = "Đã hoàn thành"
    },
): Promise<ApiResponse<{ ok: true }>> {
    // Get current user's staff code giống form tạo
    const user = getAuthUser() || ({} as any);
    const assignee = user["staff-code"] || user.staffCode || user.code || "";
    
    // Body format giống y như khi tạo ticket
    const body: any = {
        "ticket-id": ticketId,
        name: payload.name || "",
        type: payload.type || "",
        description: payload.description || "",
        "customer-name": payload.customer_name || "",
        "customer-record-id": payload.customer_record_id || "",
        deadline: payload.deadline || "",
        status: payload.status || "Chưa bắt đầu",
        "complete-date": payload.complete_date || "",
        note: payload.note || "",
        result: payload.result || "", // Kết quả - chỉ khi status = "Đã hoàn thành"
        assignee: assignee,
    };
    
    const res = await apiRequest<{ status?: string; message?: string }>({
        method: "POST",
        path: "/webhook/ticket/activity-support-update-info",
        body,
    });
    if (!res.success) return res as any;
    const status = (res.data as any)?.status;
    const isOk = typeof status === "string" ? status.toLowerCase() === "success" : true;
    return isOk ? ({ success: true, status: res.status, data: { ok: true } } as any) : ({ success: false, status: res.status, message: (res.data as any)?.message || "Cập nhật không thành công" } as any);
}

// Submit Activity & Support result note
export async function updateActivitySupportResult(
    ticketId: string,
    payload: { note?: string },
): Promise<ApiResponse<{ ok: true }>> {
    const body: any = { "ticket-id": ticketId, data: payload };
    const res = await apiRequest<{ status?: string; message?: string }>({
        method: "POST",
        path: "/webhook/ticket/activity-support-result",
        body,
    });
    if (!res.success) return res as any;
    const status = (res.data as any)?.status;
    const isOk = typeof status === "string" ? status.toLowerCase() === "success" : true;
    return isOk ? ({ success: true, status: res.status, data: { ok: true } } as any) : ({ success: false, status: res.status, message: (res.data as any)?.message || "Cập nhật không thành công" } as any);
}

// Customer type for dropdown
export interface Customer {
    "customer-id": string;
    "customer-name": string;
    "contact-name"?: string;
    "email"?: string;
    "phone"?: string;
    "record-id": string;
}

// Fetch Customers for dropdown
export async function fetchCustomers(): Promise<ApiResponse<Customer[]>> {
    const res = await apiRequest<{ data?: Customer[] } | Array<{ data?: Customer[] }>>({ 
        method: "GET", 
        path: "/webhook/get-customer-list" 
    });
    
    console.log('[fetchCustomers] Raw Webhook Response:', res);
    
    if (!res.success) return res as any;
    
    const payload = res.data as any;
    let customers: Customer[] = [];
    
    // Handle different response structures
    // Response format: { data: [{ "customer-id": "...", "customer-name": "...", ... }] }
    if (Array.isArray(payload)) {
        const first = payload.find(Boolean);
        if (first?.data && Array.isArray(first.data)) {
            customers = first.data;
        } else if (Array.isArray(first)) {
            customers = first;
        }
    } else if (payload?.data && Array.isArray(payload.data)) {
        customers = payload.data;
    } else if (Array.isArray(payload)) {
        customers = payload;
    }
    
    
    return { success: true, status: 200, data: customers };
}

// Search Customers by name for dynamic dropdown
export async function searchCustomers(searchText: string): Promise<ApiResponse<Customer[]>> {
    // API is GET, so send name param in query string
    const res = await apiRequest<{ data?: Customer[] } | Array<{ data?: Customer[] }>>({ 
        method: "GET", 
        path: `https://automation.osi.vn/webhook/get-customer-by-text?name=${encodeURIComponent(searchText)}`
    });
    
    if (!res.success) return res as any;
    
    const payload = res.data as any;
    let customers: Customer[] = [];
    
    // Handle different response structures
    if (Array.isArray(payload)) {
        const first = payload.find(Boolean);
        if (first?.data && Array.isArray(first.data)) {
            customers = first.data;
        } else if (Array.isArray(first)) {
            customers = first;
        }
    } else if (payload?.data && Array.isArray(payload.data)) {
        customers = payload.data;
    } else if (Array.isArray(payload)) {
        customers = payload;
    }
    
    return { success: true, status: 200, data: customers };
}

// Device type for dropdown
export interface Device {
    "serial-number": string;
    "brand": string;
    "model": string;
    "install-date"?: string;
    "record-id": string;
}

// Fetch Devices for dropdown
export async function fetchDevices(): Promise<ApiResponse<Device[]>> {
    const res = await apiRequest<{ data?: Device[] } | Array<{ data?: Device[] }>>({ 
        method: "GET", 
        path: "/webhook/get-devices-list" 
    });
    if (!res.success) return res as any;
    
    const payload = res.data as any;
    let devices: Device[] = [];
    
    // Handle different response structures
    // Response format: { data: [{ "serial-number": "...", "brand": "...", ... }] }
    if (Array.isArray(payload)) {
        const first = payload.find(Boolean);
        if (first?.data && Array.isArray(first.data)) {
            devices = first.data;
        } else if (Array.isArray(first)) {
            devices = first;
        }
    } else if (payload?.data && Array.isArray(payload.data)) {
        devices = payload.data;
    } else if (Array.isArray(payload)) {
        devices = payload;
    }
    
    return { success: true, status: 200, data: devices };
}

// Fetch Brands for dropdown
export async function fetchBrands(): Promise<ApiResponse<string[]>> {
    const res = await apiRequest<{ data?: Array<{ "options-name": string }> } | Array<{ data?: Array<{ "options-name": string }> }>>({ 
        method: "GET", 
        path: "/webhook/get-brands-list" 
    });
    if (!res.success) return res as any;
    
    const payload = res.data as any;
    let brands: string[] = [];
    
    // Handle different response structures
    // Response format: [{ data: [{ "options-name": "..." }, ...] }]
    if (Array.isArray(payload)) {
        const first = payload.find(Boolean);
        if (first?.data && Array.isArray(first.data)) {
            brands = first.data.map((item: { "options-name": string }) => item["options-name"]).filter(Boolean);
        } else if (Array.isArray(first)) {
            brands = first.map((item: { "options-name": string }) => item["options-name"]).filter(Boolean);
        }
    } else if (payload?.data && Array.isArray(payload.data)) {
        brands = payload.data.map((item: { "options-name": string }) => item["options-name"]).filter(Boolean);
    } else if (Array.isArray(payload)) {
        brands = payload.map((item: { "options-name": string }) => item["options-name"]).filter(Boolean);
    }
    
    return { success: true, status: 200, data: brands };
}

// Fetch Activity Types for dropdown
export async function fetchActivityTypes(): Promise<ApiResponse<string[]>> {
    const res = await apiRequest<{ data?: Array<{ option: string }> }>({ 
        method: "GET", 
        path: "/webhook/activity-types" 
    });
    if (!res.success) return res as any;
    
    const payload = res.data as any;
    let options: string[] = [];
    
    // Handle different response structures
    if (Array.isArray(payload)) {
        const first = payload.find(Boolean);
        if (first?.data) {
            options = (first.data as Array<{ option: string }>).map(item => item.option).filter(Boolean);
        }
    } else if (payload?.data) {
        options = (payload.data as Array<{ option: string }>).map(item => item.option).filter(Boolean);
    }
    
    return { success: true, status: 200, data: options };
}

// Create Activity & Support Ticket via webhook
export interface CreateActivitySupportTicketInput {
    name: string; // Tên hoạt động
    description?: string; // Mô tả
    customer_name: string; // Khách hàng
    customer_record_id?: string; // Record ID của khách hàng
    type?: string; // Loại hoạt động
    deadline?: string; // Hạn hoàn thành (ISO string)
    status?: string; // Trạng thái: "Chưa bắt đầu" hoặc "Đã hoàn thành"
    complete_date?: string; // Ngày hoàn thành (ISO string) - chỉ khi status = "Đã hoàn thành"
    note?: string; // Ghi chú
    result?: string; // Kết quả - chỉ khi status = "Đã hoàn thành"
}

export async function createActivitySupportTicket(input: CreateActivitySupportTicketInput): Promise<ApiResponse<{ id: string }>> {
    // Get current user's staff code
    const user = getAuthUser() || ({} as any);
    const assignee = user["staff-code"] || user.staffCode || user.code || "";
    
    const body = {
        "ticket-id": `TK${Date.now().toString().slice(-6)}`, // Generate temporary ID
        name: input.name,
        type: input.type || "",
        description: input.description || "",
        "customer-name": input.customer_name,
        "customer-record-id": input.customer_record_id || "",
        deadline: input.deadline || "",
        status: input.status || "Chưa bắt đầu",
        "complete-date": input.complete_date || "",
        note: input.note || "",
        result: input.result || "", // Kết quả - chỉ khi status = "Đã hoàn thành"
        assignee: assignee,
        webhookUrl: "http://14.225.205.101:5679/webhook-test/login", // From the image
        executionMode: "test"
    };

    const res = await apiRequest<{ status?: string; message?: string; data?: any }>({
        method: "POST",
        path: "/webhook/tickets/activity-support-create",
        body,
    });
    
    if (!res.success) return res as any;
    
    const status = (res.data as any)?.status;
    const isOk = typeof status === "string" ? status.toLowerCase() === "success" : true;
    
    if (!isOk) {
        return { 
            success: false, 
            status: res.status, 
            message: (res.data as any)?.message || "Tạo ticket không thành công" 
        } as any;
    }
    
    return { 
        success: true, 
        status: res.status, 
        data: { id: body["ticket-id"] } 
    };
}

// Update OneSignal Player ID
export async function updateOneSignalPlayerId(playerId: string): Promise<ApiResponse<{ ok: true }>> {
    const user = getAuthUser() || {} as any;
    const email = user.email || "";
    const staffCode = user["staff-code"] || user.staffCode || user.code || "";
    
    const body = {
        email,
        "staff-code": staffCode,
        "player-id": playerId
    };

    const res = await apiRequest<{ status?: string; message?: string }>({
        method: "POST",
        path: "/webhook/change-onesignal-id",
        body,
    });
    
    if (!res.success) return res as any;
    
    const status = (res.data as any)?.status;
    const isOk = typeof status === "string" ? status.toLowerCase() === "success" : true;
    
    if (!isOk) {
        return { 
            success: false, 
            status: res.status, 
            message: (res.data as any)?.message || "Cập nhật OneSignal Player ID không thành công" 
        } as any;
    }
    
    return { 
        success: true, 
        status: res.status, 
        data: { ok: true } 
    };
}

// Check device by serial number
export interface DeviceInfo {
    brand?: string;
    model?: string;
    "install-date"?: string;
}

export async function checkDeviceBySerial(serial: string): Promise<ApiResponse<DeviceInfo>> {
    const res = await apiRequest<any>({
        method: "POST",
        path: "/webhook/check-device",
        body: { serial },
    });
    
    if (!res.success) return res as any;
    
    // Handle different response structures
    let deviceInfo: DeviceInfo = {};
    
    if (Array.isArray(res.data)) {
        // If response is array, get the first item
        const firstItem = res.data[0];
        if (firstItem && typeof firstItem === 'object') {
            deviceInfo = {
                brand: firstItem.brand,
                model: firstItem.model,
                "install-date": firstItem["instal-date"] || firstItem["install-date"]
            };
        }
    } else if (res.data && typeof res.data === 'object') {
        // If response is object, extract device info directly
        deviceInfo = {
            brand: res.data.brand,
            model: res.data.model,
            "install-date": res.data["instal-date"] || res.data["install-date"]
        };
    }
    
    // Check if device info is empty (serial not found)
    if (!deviceInfo.brand && !deviceInfo.model && !deviceInfo["install-date"]) {
        return { 
            success: false, 
            status: 404, 
            message: "Serial không tồn tại" 
        } as any;
    }
    
    return { 
        success: true, 
        status: res.status, 
        data: deviceInfo 
    };
}

// Fetch maintenance ticket categories
export async function fetchMaintenanceTicketCategories(): Promise<ApiResponse<string[]>> {
    const res = await apiRequest<{ data?: Array<{ option: string }> }>({ 
        method: "GET", 
        path: "/webhook/maintenance-ticket-category" 
    });
    if (!res.success) return res as any;
    
    const payload = res.data as any;
    let options: string[] = [];
    
    if (Array.isArray(payload)) {
        const first = payload.find(Boolean);
        if (first?.data) {
            options = (first.data as Array<{ option: string }>).map(item => item.option).filter(Boolean);
        }
    } else if (payload?.data) {
        options = (payload.data as Array<{ option: string }>).map(item => item.option).filter(Boolean);
    }
    
    return { success: true, status: 200, data: options };
}

// Fetch maintenance ticket types  
export async function fetchMaintenanceTicketTypes(): Promise<ApiResponse<string[]>> {
    const res = await apiRequest<{ data?: Array<{ option: string }> }>({ 
        method: "GET", 
        path: "/webhook/maintenance-ticket-type" 
    });
    if (!res.success) return res as any;
    
    const payload = res.data as any;
    let options: string[] = [];
    
    if (Array.isArray(payload)) {
        const first = payload.find(Boolean);
        if (first?.data) {
            options = (first.data as Array<{ option: string }>).map(item => item.option).filter(Boolean);
        }
    } else if (payload?.data) {
        options = (payload.data as Array<{ option: string }>).map(item => item.option).filter(Boolean);
    }
    
    return { success: true, status: 200, data: options };
}

// Create Emergency Maintenance Ticket
export interface CreateEmergencyMaintenanceInput {
    name: string; // Họ và tên
    phone: string; // Số điện thoại
    email?: string; // Email
    company?: string; // Công ty/Đơn vị
    serial: string; // Serial Number
    issue?: string; // Mô tả vấn đề
    category?: string; // Phân loại
    service_type?: string; // Loại dịch vụ
    status?: string; // Trạng thái: "Đã hoàn thành"
    assignee?: string; // Người thực hiện: mã nhân viên hiện tại
    arrive_time?: string; // Đến nơi lúc (ISO string)
    complete_time?: string; // Hoàn thành lúc (ISO string)
    brand?: string; // Hãng thiết bị (từ device info)
    model?: string; // Model thiết bị (từ device info)
    install_date?: string; // Ngày lắp đặt thiết bị
}

export async function createEmergencyMaintenanceTicket(input: CreateEmergencyMaintenanceInput): Promise<ApiResponse<{ id: string }>> {
    // Get current user's staff code
    const user = getAuthUser() || ({} as any);
    const assignee = user["staff-code"] || user.staffCode || user.code || "";
    
    const body = {
        "ticket-id": `TK${Date.now().toString().slice(-6)}`, // Generate ticket ID
        "customer-name": input.name,
        phone: input.phone,
        email: input.email || "",
        company: input.company || "",
        serial: input.serial,
        brand: input.brand || "",
        model: input.model || "",
        issue: input.issue || "",
        "install-date": input.install_date || "",
        "service-type": input.service_type || "",
        category: input.category || "",
        stutus: input.status || "Đã hoàn thành", // Note: API has typo "stutus" instead of "status"
        assignee: input.assignee || assignee,
        "start-time": input.arrive_time || "",
        "complete-time": input.complete_time || "",
        webhookUrl: "http://14.225.205.101:5679/webhook-test/login",
        executionMode: "test"
    };

    const res = await apiRequest<{ status?: string; message?: string; data?: any }>({
        method: "POST",
        path: "/webhook/maintenance-ticket-create",
        body,
    });
    
    if (!res.success) return res as any;
    
    const status = (res.data as any)?.status;
    const isOk = typeof status === "string" ? status.toLowerCase() === "success" : true;
    
    if (!isOk) {
        return { 
            success: false, 
            status: res.status, 
            message: (res.data as any)?.message || "Tạo ticket khẩn cấp không thành công" 
        } as any;
    }
    
    return { 
        success: true, 
        status: res.status, 
        data: { id: body["ticket-id"] } 
    };
}

