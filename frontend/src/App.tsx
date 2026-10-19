import React, { useState, useRef, useEffect } from 'react';

// =====================================================================
// 1. KIỂU DỮ LIỆU CHUẨN KHỚP 100% VỚI BACKEND FASTAPI (main.py)
// =====================================================================

export interface SourceItem {
  title: string;
  url: string;
  credibility: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  credibility_label: string;
}

export interface LocationInfo {
  original_sentence: string;
  keyword: string;
  start_index: number;
  end_index: number;
  position_label: string;
}

export interface ClaimResult {
  id: number;
  claim_text: string;
  status: 'SUPPORTED' | 'CONTRADICTED' | 'INSUFFICIENT';
  status_label: string;
  location: LocationInfo;
  explanation: string;
  correction: string | null;
  search_queries: string[];
  sources: SourceItem[];
}

export interface SummaryStats {
  total_claims: number;
  supported_count: number;
  contradicted_count: number;
  insufficient_count: number;
}

export interface VerifyResponse {
  summary: SummaryStats;
  claims: ClaimResult[];
}

// =====================================================================
// 2. BỘ ICON SVG ĐỘC QUYỀN (CHUẨN PHOSPHOR/RADIX BOLD STROKE 1.8)
// =====================================================================

const GoogleIcon = () => (
  <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96Z"
    />
  </svg>
);

const GitHubIcon = () => (
  <svg className="w-[18px] h-[18px] shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z"
    />
  </svg>
);

const ShieldMarkIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const ExternalArrowIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M7 17L17 7" />
    <path d="M7 7h10v10" />
  </svg>
);

const UploadDocIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="18" x2="12" y2="12" />
    <polyline points="9 15 12 12 15 15" />
  </svg>
);

const StatusDot = ({ color, pulse = false }: { color: string; pulse?: boolean }) => (
  <span className="relative inline-flex items-center justify-center w-2 h-2 shrink-0">
    {pulse && (
      <span
        className="absolute inline-flex w-full h-full rounded-full opacity-60 animate-ping"
        style={{ backgroundColor: color }}
      />
    )}
    <span
      className="relative inline-block w-2 h-2 rounded-full"
      style={{ backgroundColor: color }}
    />
  </span>
);

// =====================================================================
// 3. DỮ LIỆU BÀI MẪU HỌC THUẬT & FALLBACK KHI DEMO
// =====================================================================

const ACADEMIC_SAMPLES = [
  {
    id: 'history',
    title: 'Mẫu 1: Lịch sử & Địa lý Việt Nam',
    text: 'Chủ tịch Hồ Chí Minh đọc bản Tuyên ngôn Độc lập tại Quảng trường Ba Đình vào ngày 2/9/1944, khai sinh ra nước Việt Nam Dân chủ Cộng hòa. Về mặt địa lý tự nhiên, đỉnh Fansipan là ngọn núi cao nhất khu vực Đông Dương với độ cao 3.143 mét. Ngoài ra, một số diễn đàn mạng cho rằng quần đảo Hoàng Sa sẽ có tuyến tàu điện ngầm xuyên biển vào năm 2029.'
  },
  {
    id: 'science',
    title: 'Mẫu 2: Sinh học & Vật lý Phổ thông',
    text: 'Trong sinh học tế bào, ti thể được gọi là nhà máy năng lượng của tế bào vì chúng tạo ra phần lớn phân tử ATP. Tuy nhiên, theo bài tóm tắt do AI tự sinh ra, ánh sáng di chuyển trong chân không với vận tốc chỉ khoảng 150.000 km/s và Albert Einstein đã nhận giải Nobel Vật lý năm 1921 nhờ thuyết tương đối rộng.'
  }
];

const FALLBACK_DEMO_RESPONSE: Record<string, VerifyResponse> = {
  history: {
    summary: {
      total_claims: 3,
      supported_count: 1,
      contradicted_count: 1,
      insufficient_count: 1
    },
    claims: [
      {
        id: 1,
        claim_text: 'Chủ tịch Hồ Chí Minh đọc bản Tuyên ngôn Độc lập tại Quảng trường Ba Đình vào ngày 2/9/1944.',
        status: 'CONTRADICTED',
        status_label: 'Sai thông tin',
        location: {
          original_sentence: 'Chủ tịch Hồ Chí Minh đọc bản Tuyên ngôn Độc lập tại Quảng trường Ba Đình vào ngày 2/9/1944, khai sinh ra nước Việt Nam Dân chủ Cộng hòa.',
          keyword: 'ngày 2/9/1944',
          start_index: 77,
          end_index: 90,
          position_label: 'Đoạn 1, Câu 1'
        },
        explanation: 'Tài liệu lịch sử chính thống xác nhận Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập vào ngày 2/9/1945 tại Quảng trường Ba Đình, không phải năm 1944.',
        correction: 'Ngày 2/9/1945',
        search_queries: ['Tuyên ngôn độc lập Việt Nam ngày tháng năm nào', 'Hồ Chí Minh đọc tuyên ngôn độc lập 2/9/1945'],
        sources: [
          {
            title: 'Tuyên ngôn Độc lập nước Việt Nam Dân chủ Cộng hòa - Cổng TTĐT Chính phủ',
            url: 'https://chinhphu.vn/',
            credibility: 'VERY_HIGH',
            credibility_label: 'Nguồn chính thống / Học thuật rất cao'
          },
          {
            title: 'Vietnam Independence Day - Encyclopedia Britannica',
            url: 'https://www.britannica.com/place/Vietnam',
            credibility: 'HIGH',
            credibility_label: 'Nguồn học thuật / Báo chí uy tín cao'
          }
        ]
      },
      {
        id: 2,
        claim_text: 'Đỉnh Fansipan là ngọn núi cao nhất khu vực Đông Dương với độ cao 3.143 mét.',
        status: 'SUPPORTED',
        status_label: 'Chính xác',
        location: {
          original_sentence: 'Về mặt địa lý tự nhiên, đỉnh Fansipan là ngọn núi cao nhất khu vực Đông Dương với độ cao 3.143 mét.',
          keyword: 'đỉnh Fansipan',
          start_index: 162,
          end_index: 175,
          position_label: 'Đoạn 1, Câu 2'
        },
        explanation: 'Fansipan (thuộc dãy Hoàng Liên Sơn) được ghi nhận trong sách giáo khoa Địa lý và Britannica là đỉnh núi cao nhất Đông Dương (3.143m - 3.147m).',
        correction: null,
        search_queries: ['Fansipan highest mountain Indochina 3143m'],
        sources: [
          {
            title: 'Fan Si Pan | Mountain Peak in Vietnam - Britannica',
            url: 'https://www.britannica.com/place/Fan-Si-Pan',
            credibility: 'HIGH',
            credibility_label: 'Nguồn học thuật / Báo chí uy tín cao'
          }
        ]
      },
      {
        id: 3,
        claim_text: 'Quần đảo Hoàng Sa sẽ có tuyến tàu điện ngầm xuyên biển vào năm 2029.',
        status: 'INSUFFICIENT',
        status_label: 'Chưa đủ bằng chứng',
        location: {
          original_sentence: 'Ngoài ra, một số diễn đàn mạng cho rằng quần đảo Hoàng Sa sẽ có tuyến tàu điện ngầm xuyên biển vào năm 2029.',
          keyword: 'tàu điện ngầm xuyên biển vào năm 2029',
          start_index: 302,
          end_index: 339,
          position_label: 'Đoạn 1, Câu 3'
        },
        explanation: 'Không có bất kỳ văn bản quy hoạch chính phủ hoặc báo cáo khoa học nào đề cập đến dự án tàu điện ngầm xuyên biển ra Hoàng Sa năm 2029.',
        correction: null,
        search_queries: ['quy hoạch tàu điện ngầm xuyên biển Hoàng Sa 2029'],
        sources: []
      }
    ]
  },
  science: {
    summary: {
      total_claims: 3,
      supported_count: 1,
      contradicted_count: 2,
      insufficient_count: 0
    },
    claims: [
      {
        id: 1,
        claim_text: 'Ti thể được gọi là nhà máy năng lượng của tế bào vì tạo ra phần lớn phân tử ATP.',
        status: 'SUPPORTED',
        status_label: 'Chính xác',
        location: {
          original_sentence: 'Trong sinh học tế bào, ti thể được gọi là nhà máy năng lượng của tế bào vì chúng tạo ra phần lớn phân tử ATP.',
          keyword: 'ti thể',
          start_index: 23,
          end_index: 29,
          position_label: 'Đoạn 1, Câu 1'
        },
        explanation: 'Ti thể (Mitochondria) thực hiện quá trình hô hấp tế bào và tổng hợp ATP — nguồn năng lượng chính cho các hoạt động sống của tế bào.',
        correction: null,
        search_queries: ['mitochondria powerhouse of the cell ATP'],
        sources: [
          {
            title: 'Mitochondrion | Definition, Function, Structure, & Facts - Britannica',
            url: 'https://www.britannica.com/science/mitochondrion',
            credibility: 'HIGH',
            credibility_label: 'Nguồn học thuật / Báo chí uy tín cao'
          }
        ]
      },
      {
        id: 2,
        claim_text: 'Ánh sáng di chuyển trong chân không với vận tốc chỉ khoảng 150.000 km/s.',
        status: 'CONTRADICTED',
        status_label: 'Sai thông tin',
        location: {
          original_sentence: 'Tuy nhiên, theo bài tóm tắt do AI tự sinh ra, ánh sáng di chuyển trong chân không với vận tốc chỉ khoảng 150.000 km/s và Albert Einstein đã nhận giải Nobel Vật lý năm 1921 nhờ thuyết tương đối rộng.',
          keyword: '150.000 km/s',
          start_index: 214,
          end_index: 226,
          position_label: 'Đoạn 1, Câu 2'
        },
        explanation: 'Vận tốc ánh sáng trong chân không (c) xấp xỉ 299.792 km/s (thường làm tròn là 300.000 km/s), gấp đôi con số 150.000 km/s trong bài.',
        correction: '299.792 km/s (~300.000 km/s)',
        search_queries: ['speed of light in vacuum km/s'],
        sources: [
          {
            title: 'Speed of light | Definition, Value, & Facts - Britannica',
            url: 'https://www.britannica.com/science/speed-of-light',
            credibility: 'HIGH',
            credibility_label: 'Nguồn học thuật / Báo chí uy tín cao'
          }
        ]
      },
      {
        id: 3,
        claim_text: 'Albert Einstein nhận giải Nobel Vật lý năm 1921 nhờ thuyết tương đối rộng.',
        status: 'CONTRADICTED',
        status_label: 'Sai thông tin',
        location: {
          original_sentence: 'Tuy nhiên, theo bài tóm tắt do AI tự sinh ra, ánh sáng di chuyển trong chân không với vận tốc chỉ khoảng 150.000 km/s và Albert Einstein đã nhận giải Nobel Vật lý năm 1921 nhờ thuyết tương đối rộng.',
          keyword: 'thuyết tương đối rộng',
          start_index: 285,
          end_index: 306,
          position_label: 'Đoạn 1, Câu 2'
        },
        explanation: 'Albert Einstein được trao giải Nobel Vật lý năm 1921 nhờ khám phá ra định luật Hiệu ứng quang điện (Photoelectric effect), không phải thuyết tương đối rộng.',
        correction: 'Hiệu ứng quang điện (Photoelectric effect)',
        search_queries: ['Albert Einstein Nobel Prize 1921 reason'],
        sources: [
          {
            title: 'The Nobel Prize in Physics 1921 - NobelPrize.org',
            url: 'https://www.nobelprize.org/prizes/physics/1921/einstein/facts/',
            credibility: 'VERY_HIGH',
            credibility_label: 'Nguồn chính thống / Học thuật rất cao'
          }
        ]
      }
    ]
  }
};

// =====================================================================
// 4. CSS TYPOGRAPHY & MOTION CHUẨN MINIMALIST-UI & DESIGN-TASTE-V1
// =====================================================================

const CUSTOM_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

  :root {
    --ruby: #990F02;
    --ruby-hover: #7D0C02;
    --ruby-pale: #FDEBEC;
    --surface-white: #FFFFFF;
    --surface-warm: #F9F9F8;
    --surface-bone: #F7F6F3;
    --border-hairline: #EAEAEA;
    --text-primary: #111111;
    --text-body: #2F3437;
    --text-muted: #787774;
  }

  .sp-sans {
    font-family: 'Geist', 'Plus Jakarta Sans', 'SF Pro Display', 'Helvetica Neue', sans-serif;
    color: var(--text-primary);
  }

  .sp-serif {
    font-family: 'Instrument Serif', 'Playfair Display', Georgia, serif;
    letter-spacing: -0.02em;
    line-height: 1.1;
  }

  .sp-mono {
    font-family: 'JetBrains Mono', 'Geist Mono', 'SF Mono', monospace;
  }

  @media (prefers-reduced-motion: no-preference) {
    @keyframes spFadeUp {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes spShimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }

    .sp-reveal {
      animation: spFadeUp 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .sp-shimmer {
      background: linear-gradient(90deg, #F7F6F3 25%, #EAEAEA 50%, #F7F6F3 75%);
      background-size: 200% 100%;
      animation: spShimmer 1.6s infinite linear;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sp-reveal {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }
    .sp-shimmer {
      animation: none !important;
      background: #F7F6F3 !important;
    }
  }
`;

// =====================================================================
// 5. COMPONENT CHÍNH (APP)
// =====================================================================

export default function App() {
  // --- State Quản lý Đăng nhập / Đăng ký (Auth) ---
  const [userEmail, setUserEmail] = useState<string | null>('guest@sourceproof.ai');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [emailInput, setEmailInput] = useState('minhanh.nguyen@edu.vn');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // --- State Điều hướng Navbar tối giản (Trái: Giới thiệu | Giữa: Logo | Phải: Kiểm tra thông tin) ---
  const [activeNavTab, setActiveNavTab] = useState<'intro' | 'verify'>('verify');

  // Cấu hình kết nối Backend & Supabase (Mặc định gọi localhost:8000)
  const [apiBaseUrl, setApiBaseUrl] = useState('http://localhost:8000');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');

  // --- State Quản lý Kiểm chứng Học thuật ---
  const [inputText, setInputText] = useState(ACADEMIC_SAMPLES[0].text);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [extractStatusMsg, setExtractStatusMsg] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
  const [connectionMode, setConnectionMode] = useState<'live' | 'fallback' | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Phím tắt bàn phím Ctrl/Cmd + Enter để chạy kiểm chứng ngay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && userEmail && !isVerifying) {
        e.preventDefault();
        setActiveNavTab('verify');
        handleVerifyContent();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // =====================================================================
  // XỬ LÝ ĐĂNG KÝ / ĐĂNG NHẬP (EMAIL + OAUTH GOOGLE / GITHUB)
  // =====================================================================

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);
    setAuthNotice(null);

    const trimmedEmail = emailInput.trim();
    if (!trimmedEmail || passwordInput.length < 6) {
      setAuthMessage('Vui lòng nhập địa chỉ email hợp lệ và mật khẩu tối thiểu 6 ký tự.');
      return;
    }

    if (authMode === 'register' && confirmPasswordInput && confirmPasswordInput !== passwordInput) {
      setAuthMessage('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.');
      return;
    }

    setAuthLoading(true);
    try {
      if (supabaseUrl.trim() && supabaseAnonKey.trim()) {
        const cleanSbUrl = supabaseUrl.trim().replace(/\/+$/, '');
        const endpoint =
          authMode === 'register'
            ? `${cleanSbUrl}/auth/v1/signup`
            : `${cleanSbUrl}/auth/v1/token?grant_type=password`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseAnonKey.trim(),
            Authorization: `Bearer ${supabaseAnonKey.trim()}`
          },
          body: JSON.stringify({
            email: trimmedEmail,
            password: passwordInput
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.msg || data.error_description || 'Không thể xác thực tài khoản.');
        }
        setUserEmail(trimmedEmail);
      } else {
        await new Promise((r) => setTimeout(r, 220));
        setUserEmail(trimmedEmail);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setAuthMessage(error?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setAuthMessage(null);
    setAuthNotice(null);
    setAuthLoading(true);

    try {
      if (supabaseUrl.trim()) {
        const cleanSbUrl = supabaseUrl.trim().replace(/\/+$/, '');
        window.location.href = `${cleanSbUrl}/auth/v1/authorize?provider=${provider}`;
        return;
      }
      await new Promise((r) => setTimeout(r, 200));
      setUserEmail(
        provider === 'google' ? 'minhanh.nguyen@gmail.com' : 'minhanh-dev@github.user'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setUserEmail(null);
    setVerifyResult(null);
    setSelectedClaimId(null);
  };

  // =====================================================================
  // XỬ LÝ TẢI FILE PDF (.pdf) VÀ WORD (.docx) -> GỌI /api/extract-text
  // =====================================================================

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      setErrorBanner('Định dạng không hỗ trợ. Chỉ chấp nhận file PDF (.pdf) hoặc Word (.docx).');
      return;
    }

    setErrorBanner(null);
    setExtractStatusMsg(null);
    setIsExtracting(true);
    setUploadedFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${apiBaseUrl.replace(/\/+$/, '')}/api/extract-text`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Không thể trích xuất văn bản từ tài liệu này.');
      }

      setInputText(data.extracted_text || '');
      setExtractStatusMsg(
        `Đã trích xuất ${data.extracted_text?.length || 0} ký tự từ "${file.name}". ${
          data.is_truncated ? '(Giới hạn 3.000 ký tự đầu tiên)' : ''
        }`
      );
      setVerifyResult(null);
    } catch {
      setInputText(ACADEMIC_SAMPLES[0].text);
      setExtractStatusMsg(
        `Chế độ xem trước: Đã nạp nội dung mẫu cho "${file.name}" (Khi chạy local sẽ gọi trực tiếp ${apiBaseUrl}/api/extract-text).`
      );
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // =====================================================================
  // XỬ LÝ KIỂM CHỨNG THÔNG TIN -> GỌI POST /api/verify
  // =====================================================================

  const handleVerifyContent = async () => {
    const cleanText = inputText.trim();
    if (cleanText.length < 15) {
      setErrorBanner('Vui lòng nhập hoặc tải lên đoạn văn bản học thuật tối thiểu 15 ký tự.');
      return;
    }

    setErrorBanner(null);
    setIsVerifying(true);
    setSelectedClaimId(null);

    try {
      const response = await fetch(`${apiBaseUrl.replace(/\/+$/, '')}/api/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: cleanText })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as { detail?: string }).detail || `Lỗi HTTP ${response.status} từ Backend.`);
      }

      const data: VerifyResponse = await response.json();
      setVerifyResult(data);
      setConnectionMode('live');
      if (data.claims.length > 0) {
        setSelectedClaimId(data.claims[0].id);
      }
    } catch {
      if (cleanText.includes('150.000 km/s') || cleanText.includes('Einstein')) {
        setVerifyResult(FALLBACK_DEMO_RESPONSE.science);
      } else {
        setVerifyResult(FALLBACK_DEMO_RESPONSE.history);
      }
      setConnectionMode('fallback');
      setSelectedClaimId(1);
    } finally {
      setIsVerifying(false);
    }
  };

  // =====================================================================
  // HÀM TÔ MÀU (HIGHLIGHT) TỪ KHÓA ĐÚNG / SAI TRỰC TIẾP TRÊN VĂN BẢN
  // =====================================================================

  const renderHighlightedDocument = () => {
    if (!verifyResult || verifyResult.claims.length === 0) {
      return (
        <p className="whitespace-pre-wrap text-[#2F3437] leading-[1.75] text-[15px]">
          {inputText}
        </p>
      );
    }

    interface HighlightSpan {
      start: number;
      end: number;
      claim: ClaimResult;
    }

    const spans: HighlightSpan[] = [];

    verifyResult.claims.forEach((claim) => {
      let start = claim.location.start_index;
      let end = claim.location.end_index;
      const kw = claim.location.keyword?.trim();

      if (kw) {
        const foundIdx = inputText.toLowerCase().indexOf(kw.toLowerCase());
        if (foundIdx !== -1) {
          start = foundIdx;
          end = foundIdx + kw.length;
        }
      }

      if (start >= 0 && end > start && end <= inputText.length) {
        spans.push({ start, end, claim });
      }
    });

    spans.sort((a, b) => a.start - b.start);
    const nonOverlapping: HighlightSpan[] = [];
    let lastEnd = 0;
    for (const sp of spans) {
      if (sp.start >= lastEnd) {
        nonOverlapping.push(sp);
        lastEnd = sp.end;
      }
    }

    if (nonOverlapping.length === 0) {
      return (
        <p className="whitespace-pre-wrap text-[#2F3437] leading-[1.75] text-[15px]">
          {inputText}
        </p>
      );
    }

    const elements: React.ReactNode[] = [];
    let cursor = 0;

    nonOverlapping.forEach((sp, idx) => {
      if (sp.start > cursor) {
        elements.push(
          <span key={`txt-${idx}`}>{inputText.slice(cursor, sp.start)}</span>
        );
      }

      const isSelected = selectedClaimId === sp.claim.id;

      // Bảng màu Spot Pastels từ minimalist-ui + Đỏ Ruby #990F02
      const statusInlineStyle =
        sp.claim.status === 'SUPPORTED'
          ? { backgroundColor: '#EDF3EC', color: '#346538', borderBottom: '2px solid #346538' }
          : sp.claim.status === 'CONTRADICTED'
          ? { backgroundColor: '#FDEBEC', color: '#990F02', borderBottom: '2px solid #990F02' }
          : { backgroundColor: '#FBF3DB', color: '#956400', borderBottom: '2px solid #956400' };

      elements.push(
        <span
          key={`hl-${sp.claim.id}`}
          onClick={() => setSelectedClaimId(sp.claim.id)}
          style={statusInlineStyle}
          title={`Bấm để xem nguồn đối chiếu (${sp.claim.status_label} - ${sp.claim.location.position_label})`}
          className={`cursor-pointer px-1.5 py-0.5 rounded-[4px] font-medium transition-transform active:scale-[0.98] inline-block mx-0.5 ${
            sp.claim.status === 'CONTRADICTED' ? 'line-through' : ''
          } ${isSelected ? 'ring-1 ring-[#990F02]' : ''}`}
        >
          {inputText.slice(sp.start, sp.end)}
          <sup className="ml-1 text-[10px] font-semibold sp-mono">
            [{sp.claim.id}]
          </sup>
          {sp.claim.status === 'CONTRADICTED' && sp.claim.correction && (
            <span
              className="ml-1.5 no-underline inline-block text-white text-[11px] px-1.5 py-0.5 rounded-[4px] font-medium"
              style={{ backgroundColor: '#990F02' }}
            >
              {sp.claim.correction}
            </span>
          )}
        </span>
      );

      cursor = sp.end;
    });

    if (cursor < inputText.length) {
      elements.push(<span key="txt-end">{inputText.slice(cursor)}</span>);
    }

    return (
      <div className="whitespace-pre-wrap text-[#111111] leading-[1.85] text-[15px]">
        {elements}
      </div>
    );
  };

  // =====================================================================
  // MÀN HÌNH 1: ĐĂNG NHẬP / ĐĂNG KÝ
  // =====================================================================

  if (!userEmail) {
    return (
      <div className="min-h-[100dvh] bg-[#FFFFFF] sp-sans flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
        <style>{CUSTOM_STYLES}</style>

        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 18%, rgba(153, 15, 2, 0.035) 0%, rgba(255, 255, 255, 0) 65%)'
          }}
        />

        <div className="w-full max-w-[430px] bg-[#FFFFFF] border border-[#EAEAEA] rounded-[12px] p-8 sm:p-10 relative z-10 shadow-[0_2px_8px_rgba(0,0,0,0.04)] sp-reveal">
          <div className="mb-7">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#FDEBEC] text-[#990F02] text-[11px] font-medium uppercase tracking-[0.05em] sp-mono mb-4">
              <StatusDot color="#990F02" pulse />
              <span>SourceProof AI</span>
            </div>

            <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-[#111111] leading-[1.15]">
              {authMode === 'login' ? 'Sign into your account' : 'Create your account'}
            </h1>
            <p className="text-[14px] text-[#787774] mt-2.5 leading-[1.55]">
              {authMode === 'login'
                ? 'Easily verify your academic documents and AI-generated claims all in one dashboard.'
                : 'Start verifying academic essays, PDFs, and Word documents with grounded citations.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => handleOAuthLogin('google')}
              className="h-[44px] px-4 rounded-[8px] bg-[#FFFFFF] border border-[#EAEAEA] hover:border-[#990F02] hover:bg-[#FDEBEC]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 text-[14px] font-medium text-[#111111]"
            >
              <GoogleIcon />
              <span>Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleOAuthLogin('github')}
              className="h-[44px] px-4 rounded-[8px] bg-[#FFFFFF] border border-[#EAEAEA] hover:border-[#990F02] hover:bg-[#FDEBEC]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 text-[14px] font-medium text-[#111111]"
            >
              <GitHubIcon />
              <span>GitHub</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center my-6">
            <div className="w-full border-t border-[#EAEAEA]" />
            <span className="bg-[#FFFFFF] px-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#787774] shrink-0 sp-mono">
              {authMode === 'login' ? 'OR SIGN IN WITH' : 'OR SIGN UP WITH'}
            </span>
            <div className="w-full border-t border-[#EAEAEA]" />
          </div>

          {authMessage && (
            <div className="mb-4 p-3 rounded-[8px] bg-[#FDEBEC] border border-[#990F02]/25 text-[#990F02] text-[12px] leading-relaxed">
              {authMessage}
            </div>
          )}

          {authNotice && (
            <div className="mb-4 p-3 rounded-[8px] bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] text-[12px] leading-relaxed">
              {authNotice}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-[#111111]">
                Email
              </label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="minhanh.nguyen@edu.vn"
                className="w-full h-[44px] px-3.5 rounded-[8px] bg-[#FFFFFF] border border-[#EAEAEA] text-[14px] text-[#111111] placeholder-[#787774]/60 focus:outline-none focus:border-[#990F02] transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-[#111111]">
                Password
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Your password"
                className="w-full h-[44px] px-3.5 rounded-[8px] bg-[#FFFFFF] border border-[#EAEAEA] text-[14px] text-[#111111] placeholder-[#787774]/60 focus:outline-none focus:border-[#990F02] transition-colors"
              />
            </div>

            {authMode === 'register' && (
              <div className="flex flex-col gap-2 sp-reveal">
                <label className="text-[13px] font-medium text-[#111111]">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full h-[44px] px-3.5 rounded-[8px] bg-[#FFFFFF] border border-[#EAEAEA] text-[14px] text-[#111111] placeholder-[#787774]/60 focus:outline-none focus:border-[#990F02] transition-colors"
                />
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={authLoading}
                style={{ backgroundColor: '#990F02' }}
                className="w-full h-[44px] px-4 rounded-[8px] hover:bg-[#7D0C02] active:scale-[0.98] transition-all text-[#FFFFFF] text-[14px] font-medium flex items-center justify-center"
              >
                {authLoading
                  ? 'Authenticating...'
                  : authMode === 'login'
                  ? 'Sign in'
                  : 'Sign up'}
              </button>
            </div>
          </form>

          <div className="mt-7 pt-5 border-t border-[#EAEAEA] text-center space-y-2 text-[13px]">
            {authMode === 'login' ? (
              <p className="text-[#787774]">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthMessage(null);
                    setAuthNotice(null);
                  }}
                  className="text-[#990F02] font-medium underline underline-offset-4 hover:opacity-80"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p className="text-[#787774]">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthMessage(null);
                    setAuthNotice(null);
                  }}
                  className="text-[#990F02] font-medium underline underline-offset-4 hover:opacity-80"
                >
                  Sign in
                </button>
              </p>
            )}

            {authMode === 'login' && (
              <div>
                <button
                  type="button"
                  onClick={() =>
                    setAuthNotice(
                      'Bạn có thể bấm trực tiếp nút Google hoặc GitHub phía trên, hoặc nhập mật khẩu bất kỳ (từ 6 ký tự) để vào thẳng không gian kiểm chứng.'
                    )
                  }
                  className="text-[#111111] hover:text-[#990F02] underline underline-offset-4 transition-colors"
                >
                  Forgot your password?
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =====================================================================
  // MÀN HÌNH 2: KHÔNG GIAN CHÍNH VỚI THANH ĐIỀU HƯỚNG
  // =====================================================================

  return (
    <div className="min-h-[100dvh] bg-[#FFFFFF] sp-sans flex flex-col">
      <style>{CUSTOM_STYLES}</style>

      <header className="bg-[#FBFBF9] border-b border-[#EAEAEA] sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 grid grid-cols-3 items-center">
          <nav className="flex items-center justify-start gap-7">
            <button
              type="button"
              onClick={() => setActiveNavTab('intro')}
              className={`text-[15px] transition-colors ${
                activeNavTab === 'intro'
                  ? 'text-[#990F02] font-medium'
                  : 'text-[#6E6D6A] hover:text-[#111111] font-normal'
              }`}
            >
              Giới thiệu
            </button>
          </nav>

          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => setActiveNavTab('verify')}
              className="inline-flex items-center gap-2.5 group focus:outline-none"
            >
              <span
                className="w-7 h-7 rounded-[6px] flex items-center justify-center text-white transition-transform group-active:scale-[0.96]"
                style={{ backgroundColor: '#990F02' }}
              >
                <ShieldMarkIcon />
              </span>
              <span className="font-semibold text-[16px] tracking-[-0.02em] text-[#111111]">
                SourceProof AI
              </span>
            </button>
          </div>

          <nav className="flex items-center justify-end gap-7">
            <button
              type="button"
              onClick={() => setActiveNavTab('verify')}
              className={`text-[15px] transition-colors ${
                activeNavTab === 'verify'
                  ? 'text-[#990F02] font-medium'
                  : 'text-[#6E6D6A] hover:text-[#111111] font-normal'
              }`}
            >
              Kiểm tra thông tin
            </button>
          </nav>
        </div>

        {showConfigModal && (
          <div className="bg-[#F9F9F8] px-4 py-4 border-t border-[#EAEAEA]">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 text-[12px]">
              <div className="flex flex-col gap-1.5">
                <label className="text-[#787774] font-medium">FastAPI Backend URL</label>
                <input
                  type="text"
                  value={apiBaseUrl}
                  onChange={(e) => setApiBaseUrl(e.target.value)}
                  className="px-3 py-2 rounded-[6px] bg-[#FFFFFF] border border-[#EAEAEA] text-[#111111] focus:outline-none focus:border-[#990F02] sp-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[#787774] font-medium">Supabase Project URL (Optional)</label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyz.supabase.co"
                  className="px-3 py-2 rounded-[6px] bg-[#FFFFFF] border border-[#EAEAEA] text-[#111111] focus:outline-none focus:border-[#990F02] sp-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[#787774] font-medium">Supabase Anon Key (Optional)</label>
                <input
                  type="password"
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  placeholder="eyJhbGciOi..."
                  className="px-3 py-2 rounded-[6px] bg-[#FFFFFF] border border-[#EAEAEA] text-[#111111] focus:outline-none focus:border-[#990F02] sp-mono"
                />
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 flex-1 space-y-10">
        {errorBanner && (
          <div className="p-4 rounded-[8px] bg-[#FDEBEC] border border-[#990F02]/25 text-[#990F02] text-[13px] flex items-center justify-between gap-4">
            <span>{errorBanner}</span>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-[12px] font-medium underline shrink-0"
            >
              Đóng
            </button>
          </div>
        )}

        {activeNavTab === 'intro' && (
          <section className="space-y-8 sp-reveal">
            <div className="bg-[#FFFFFF] rounded-[12px] border border-[#EAEAEA] p-8 sm:p-12 space-y-6">
              <span
                style={{ backgroundColor: '#FDEBEC', color: '#990F02' }}
                className="inline-block text-[11px] font-medium uppercase tracking-[0.06em] px-3 py-1 rounded-full sp-mono"
              >
                Academic Fact-Checking Engine
              </span>

              <h2 className="text-[32px] sm:text-[40px] font-semibold tracking-[-0.03em] text-[#111111] leading-[1.15] max-w-3xl">
                Chấm dứt tình trạng AI bịa đặt kiến thức và trích dẫn giả trong học thuật.
              </h2>

              <p className="text-[16px] text-[#2F3437] leading-[1.7] max-w-2xl">
                SourceProof AI không hỏi một mô hình ngôn ngữ xem thông tin &ldquo;đúng hay sai&rdquo; theo trí nhớ tĩnh.
                Hệ thống tự động bóc tách từng khẳng định học thuật (Claim), truy xuất nguồn thực tế qua Google Search Grounding,
                đánh giá độ uy tín của tên miền và chỉ rõ vị trí từ khóa ngay trên bài viết của bạn.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveNavTab('verify')}
                  style={{ backgroundColor: '#990F02' }}
                  className="px-6 py-3 rounded-[6px] text-[#FFFFFF] text-[14px] font-medium hover:bg-[#7D0C02] active:scale-[0.98] transition-all"
                >
                  Mở công cụ Kiểm tra thông tin →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-[#FFFFFF] rounded-[12px] border border-[#EAEAEA] p-6 space-y-2.5">
                <span className="text-[11px] uppercase tracking-[0.06em] text-[#990F02] font-semibold sp-mono">
                  01 / ĐA ĐỊNH DẠNG
                </span>
                <h3 className="text-[16px] font-semibold text-[#111111]">
                  Văn bản, PDF & Microsoft Word
                </h3>
                <p className="text-[13px] text-[#787774] leading-[1.6]">
                  Tải lên trực tiếp bài tiểu luận .PDF hoặc .DOCX. Hệ thống tự động rút trích văn bản thuần và loại bỏ tài liệu ảnh quét rỗng.
                </p>
              </div>

              <div className="bg-[#FFFFFF] rounded-[12px] border border-[#EAEAEA] p-6 space-y-2.5">
                <span className="text-[11px] uppercase tracking-[0.06em] text-[#990F02] font-semibold sp-mono">
                  02 / ĐỊNH VỊ TỪ KHÓA
                </span>
                <h3 className="text-[16px] font-semibold text-[#111111]">
                  Tô màu chính xác từng cụm từ
                </h3>
                <p className="text-[13px] text-[#787774] leading-[1.6]">
                  Chỉ rõ vị trí Đoạn mấy, Câu mấy và đánh dấu trực tiếp từ khóa Chính xác (Supported), Sai thông tin (Contradicted) kèm gợi ý sửa đúng.
                </p>
              </div>

              <div className="bg-[#FFFFFF] rounded-[12px] border border-[#EAEAEA] p-6 space-y-2.5">
                <span className="text-[11px] uppercase tracking-[0.06em] text-[#990F02] font-semibold sp-mono">
                  03 / PHÂN HẠNG NGUỒN
                </span>
                <h3 className="text-[16px] font-semibold text-[#111111]">
                  Ưu tiên nguồn học thuật & chính phủ
                </h3>
                <p className="text-[13px] text-[#787774] leading-[1.6]">
                  Tự động xếp hạng độ tin cậy ưu tiên tên miền .gov, .edu, Nature, Britannica, IEEE và cảnh báo các nguồn diễn đàn tự do.
                </p>
              </div>
            </div>
          </section>
        )}

        {activeNavTab === 'verify' && (
          <>
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start sp-reveal">
              <div className="lg:col-span-4 space-y-5 pt-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#FDEBEC] text-[#990F02] text-[11px] font-medium uppercase tracking-[0.05em] sp-mono">
                  <StatusDot color="#990F02" pulse />
                  <span>Grounded Verification</span>
                </div>

                <h2 className="text-[26px] font-semibold tracking-[-0.025em] text-[#111111] leading-[1.2]">
                  Kiểm chứng độ chính xác của tài liệu học thuật.
                </h2>

                <p className="text-[14px] text-[#787774] leading-[1.65]">
                  Dán đoạn văn bản do AI tạo ra hoặc tải lên tệp tiểu luận{' '}
                  <strong className="text-[#111111] font-medium">.PDF / .DOCX</strong> ở khung bên phải.
                  SourceProof AI sẽ tách các khẳng định quan trọng, đối chiếu với Google Search và định vị chính xác từ khóa đúng hoặc sai.
                </p>

                <div className="pt-2 border-t border-[#EAEAEA] space-y-2.5 text-[13px]">
                  <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#787774] sp-mono">
                    Chú giải trạng thái
                  </p>
                  <div className="flex items-center gap-2.5 text-[#2F3437]">
                    <StatusDot color="#346538" />
                    <span>
                      <strong className="text-[#111111] font-medium">Chính xác:</strong> Khớp với nguồn học thuật uy tín
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[#2F3437]">
                    <StatusDot color="#990F02" />
                    <span>
                      <strong className="text-[#111111] font-medium">Sai thông tin:</strong> Kèm từ khóa đính chính chuẩn
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[#2F3437]">
                    <StatusDot color="#956400" />
                    <span>
                      <strong className="text-[#111111] font-medium">Chưa đủ bằng chứng:</strong> Nguồn chưa xác thực
                    </span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 bg-[#FFFFFF] rounded-[12px] border border-[#EAEAEA] overflow-hidden">
                <div className="px-5 py-3 bg-[#F9F9F8] border-b border-[#EAEAEA] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EAEAEA]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EAEAEA]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#990F02]/60" />
                    <span className="ml-2 text-[11px] uppercase tracking-[0.06em] text-[#787774] sp-mono">
                      KIỂM TRA THÔNG TIN • TEXT / .PDF / .DOCX
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {ACADEMIC_SAMPLES.map((sample) => (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => {
                          setInputText(sample.text);
                          setUploadedFileName(null);
                          setExtractStatusMsg(null);
                          setVerifyResult(null);
                          setErrorBanner(null);
                        }}
                        className="text-[12px] px-3 py-1 rounded-[6px] bg-[#FFFFFF] hover:bg-[#FDEBEC] hover:text-[#990F02] hover:border-[#990F02]/40 border border-[#EAEAEA] text-[#2F3437] font-medium transition-colors"
                      >
                        {sample.title}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-[8px] bg-[#F9F9F8] border border-[#EAEAEA]">
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-9 h-9 rounded-[6px] flex items-center justify-center"
                        style={{ backgroundColor: '#FDEBEC', color: '#990F02' }}
                      >
                        <UploadDocIcon />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-[#111111]">
                          Tải lên tài liệu PDF (.pdf) hoặc Microsoft Word (.docx)
                        </p>
                        <p className="text-[12px] text-[#787774]">
                          Rút trích văn bản tự động (tối đa 3.000 ký tự đầu tiên).
                        </p>
                      </div>
                    </div>

                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={isExtracting}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-[6px] bg-[#FFFFFF] border border-[#990F02] text-[#990F02] hover:bg-[#FDEBEC]/50 active:scale-[0.98] text-[13px] font-medium transition-all"
                      >
                        {isExtracting ? 'Đang trích xuất...' : 'Chọn tệp .PDF / .DOCX'}
                      </button>
                    </div>
                  </div>

                  {extractStatusMsg && (
                    <div className="px-4 py-2.5 rounded-[6px] bg-[#EDF3EC] text-[#346538] text-[12px] font-medium">
                      {extractStatusMsg}
                    </div>
                  )}

                  <div className="space-y-3">
                    <textarea
                      rows={5}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Dán nội dung bài luận hoặc câu trả lời của AI cần kiểm chứng..."
                      className="w-full p-4 rounded-[8px] bg-[#FFFFFF] border border-[#EAEAEA] focus:border-[#990F02] focus:outline-none text-[14px] leading-[1.7] text-[#111111]"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3 text-[12px] text-[#787774] sp-mono">
                        <span>{inputText.length} / 3000 CHARS</span>
                        {uploadedFileName && <span>• FILE: {uploadedFileName}</span>}
                        <span className="hidden md:inline-flex items-center gap-1 text-[11px]">
                          •{' '}
                          <kbd className="px-1.5 py-0.5 rounded-[4px] border border-[#EAEAEA] bg-[#F7F6F3] text-[#111111]">
                            Ctrl + Enter
                          </kbd>
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setInputText('');
                            setVerifyResult(null);
                            setUploadedFileName(null);
                            setExtractStatusMsg(null);
                          }}
                          className="px-4 py-2 rounded-[6px] border border-[#EAEAEA] hover:bg-[#F7F6F3] text-[13px] font-medium text-[#787774]"
                        >
                          Xóa nội dung
                        </button>

                        <button
                          type="button"
                          disabled={isVerifying || inputText.trim().length < 10}
                          onClick={handleVerifyContent}
                          style={{ backgroundColor: '#990F02' }}
                          className="px-5 py-2 rounded-[6px] text-[#FFFFFF] text-[13px] font-medium hover:bg-[#7D0C02] active:scale-[0.98] disabled:opacity-40 transition-all"
                        >
                          {isVerifying ? 'Đang đối chiếu Google Search...' : 'Kiểm chứng thông tin'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {isVerifying && (
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 bg-[#FFFFFF] rounded-[12px] border border-[#EAEAEA] p-6 space-y-4">
                  <div className="h-5 w-48 rounded-[4px] sp-shimmer" />
                  <div className="h-32 w-full rounded-[8px] sp-shimmer" />
                </div>
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-[#FFFFFF] rounded-[12px] border border-[#EAEAEA] p-6 space-y-3">
                    <div className="h-4 w-36 rounded-[4px] sp-shimmer" />
                    <div className="h-6 w-3/4 rounded-[4px] sp-shimmer" />
                    <div className="h-16 w-full rounded-[8px] sp-shimmer" />
                  </div>
                  <div className="bg-[#FFFFFF] rounded-[12px] border border-[#EAEAEA] p-6 space-y-3">
                    <div className="h-4 w-36 rounded-[4px] sp-shimmer" />
                    <div className="h-6 w-2/3 rounded-[4px] sp-shimmer" />
                    <div className="h-16 w-full rounded-[8px] sp-shimmer" />
                  </div>
                </div>
              </section>
            )}

            {!isVerifying && verifyResult && (
              <div className="space-y-6 sp-reveal">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-[#FFFFFF] p-5 rounded-[12px] border border-[#EAEAEA]">
                    <p className="text-[11px] uppercase tracking-[0.05em] text-[#787774]">
                      Tổng số khẳng định
                    </p>
                    <p className="text-[28px] font-semibold text-[#111111] mt-1 sp-mono">
                      {verifyResult.summary.total_claims}
                    </p>
                  </div>

                  <div className="bg-[#EDF3EC] p-5 rounded-[12px] border border-[#EAEAEA]">
                    <p className="text-[11px] uppercase tracking-[0.05em] text-[#346538]">
                      Chính xác (Supported)
                    </p>
                    <p className="text-[28px] font-semibold text-[#346538] mt-1 sp-mono">
                      {verifyResult.summary.supported_count}
                    </p>
                  </div>

                  <div className="bg-[#FDEBEC] p-5 rounded-[12px] border border-[#EAEAEA]">
                    <p className="text-[11px] uppercase tracking-[0.05em] text-[#990F02]">
                      Sai thông tin (Contradicted)
                    </p>
                    <p className="text-[28px] font-semibold text-[#990F02] mt-1 sp-mono">
                      {verifyResult.summary.contradicted_count}
                    </p>
                  </div>

                  <div className="bg-[#FBF3DB] p-5 rounded-[12px] border border-[#EAEAEA]">
                    <p className="text-[11px] uppercase tracking-[0.05em] text-[#956400]">
                      Chưa đủ bằng chứng
                    </p>
                    <p className="text-[28px] font-semibold text-[#956400] mt-1 sp-mono">
                      {verifyResult.summary.insufficient_count}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-5 bg-[#FFFFFF] rounded-[12px] border border-[#EAEAEA] p-6 space-y-4 lg:sticky lg:top-20">
                    <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
                      <h3 className="font-semibold text-[15px] text-[#111111]">
                        Vị trí từ khóa trên văn bản gốc
                      </h3>
                      <span
                        style={{
                          backgroundColor: connectionMode === 'live' ? '#EDF3EC' : '#FDEBEC',
                          color: connectionMode === 'live' ? '#346538' : '#990F02'
                        }}
                        className="text-[10px] uppercase tracking-[0.05em] px-2.5 py-0.5 rounded-full font-medium sp-mono"
                      >
                        {connectionMode === 'live' ? 'Live Grounding' : 'Preview Mode'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2.5 text-[12px] text-[#2F3437]">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EDF3EC] text-[#346538]">
                        <StatusDot color="#346538" /> Chính xác
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FDEBEC] text-[#990F02]">
                        <StatusDot color="#990F02" /> Sai thông tin
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FBF3DB] text-[#956400]">
                        <StatusDot color="#956400" /> Chưa đủ bằng chứng
                      </span>
                    </div>

                    <div className="p-5 rounded-[8px] bg-[#F9F9F8] border border-[#EAEAEA]">
                      {renderHighlightedDocument()}
                    </div>

                    <p className="text-[12px] text-[#787774]">
                      Nhấn vào từng cụm từ khóa được đánh dấu để đối chiếu nguồn học thuật tương ứng.
                    </p>
                  </div>

                  <div className="lg:col-span-7 space-y-4">
                    {verifyResult.claims.map((claim, idx) => {
                      const isSelected = selectedClaimId === claim.id;

                      const badgeStyle =
                        claim.status === 'SUPPORTED'
                          ? { backgroundColor: '#EDF3EC', color: '#346538' }
                          : claim.status === 'CONTRADICTED'
                          ? { backgroundColor: '#FDEBEC', color: '#990F02' }
                          : { backgroundColor: '#FBF3DB', color: '#956400' };

                      return (
                        <div
                          key={claim.id}
                          onClick={() => setSelectedClaimId(claim.id)}
                          style={{ animationDelay: `${idx * 80}ms` }}
                          className={`bg-[#FFFFFF] rounded-[12px] border p-6 transition-all cursor-pointer space-y-4 sp-reveal ${
                            isSelected
                              ? 'border-[#990F02] shadow-[0_2px_8px_rgba(153,15,2,0.08)]'
                              : 'border-[#EAEAEA] hover:border-[#990F02]/50'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span
                                style={{ backgroundColor: '#990F02' }}
                                className="px-2 py-0.5 rounded-[4px] text-[#FFFFFF] text-[11px] font-medium sp-mono"
                              >
                                #{claim.id}
                              </span>
                              <span className="text-[12px] px-2.5 py-0.5 rounded-[4px] bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] sp-mono">
                                {claim.location.position_label} • Từ khóa: &ldquo;{claim.location.keyword}&rdquo;
                              </span>
                            </div>

                            <span
                              style={badgeStyle}
                              className="text-[11px] font-semibold uppercase tracking-[0.05em] px-3 py-1 rounded-full sp-mono"
                            >
                              {claim.status_label} ({claim.status})
                            </span>
                          </div>

                          <p className="text-[15px] font-semibold text-[#111111] leading-[1.5]">
                            &ldquo;{claim.claim_text}&rdquo;
                          </p>

                          {claim.status === 'CONTRADICTED' && claim.correction && (
                            <div className="p-3.5 rounded-[8px] bg-[#FDEBEC] border border-[#990F02]/20 space-y-1">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#990F02] sp-mono">
                                Thông tin đính chính chuẩn xác
                              </p>
                              <p className="text-[14px] text-[#111111]">
                                Thay cụm từ khóa sai{' '}
                                <span className="line-through text-[#990F02]">
                                  &ldquo;{claim.location.keyword}&rdquo;
                                </span>{' '}
                                bằng:{' '}
                                <strong className="font-semibold text-[#990F02] underline underline-offset-4">
                                  {claim.correction}
                                </strong>
                              </p>
                            </div>
                          )}

                          <div className="text-[13px] text-[#2F3437] bg-[#F9F9F8] p-3.5 rounded-[8px] border border-[#EAEAEA] leading-[1.6]">
                            <strong className="text-[#111111]">Đối chiếu bằng chứng: </strong>
                            {claim.explanation}
                          </div>

                          <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between text-[12px]">
                              <span className="font-semibold text-[#111111]">
                                Nguồn xác thực ({claim.sources.length})
                              </span>
                              {claim.search_queries.length > 0 && (
                                <span className="text-[#787774] sp-mono">
                                  Query: {claim.search_queries[0]}
                                </span>
                              )}
                            </div>

                            {claim.sources.length === 0 ? (
                              <p className="text-[12px] text-[#787774] italic">
                                Chưa tìm thấy nguồn học thuật trực tiếp xác nhận thông tin này.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 gap-2">
                                {claim.sources.map((src, sIdx) => (
                                  <a
                                    key={sIdx}
                                    href={src.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-3 rounded-[8px] border border-[#EAEAEA] hover:border-[#990F02] bg-[#FFFFFF] transition-colors flex items-center justify-between gap-3 group"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <span
                                        style={{
                                          backgroundColor:
                                            src.credibility === 'VERY_HIGH' ? '#FDEBEC' : '#F7F6F3',
                                          color:
                                            src.credibility === 'VERY_HIGH' ? '#990F02' : '#2F3437'
                                        }}
                                        className="inline-block text-[10px] uppercase tracking-[0.05em] px-2 py-0.5 rounded-full font-medium sp-mono"
                                      >
                                        {src.credibility_label}
                                      </span>
                                      <p className="text-[13px] font-medium text-[#111111] group-hover:text-[#990F02] truncate mt-1">
                                        {src.title}
                                      </p>
                                      <p className="text-[11px] text-[#787774] truncate sp-mono">
                                        {src.url}
                                      </p>
                                    </div>
                                    <span className="text-[#787774] group-hover:text-[#990F02]">
                                      <ExternalArrowIcon />
                                    </span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-[#EAEAEA] bg-[#FBFBF9] py-4 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-[12px] text-[#787774]">
          <span className="sp-mono">{userEmail}</span>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setShowConfigModal(!showConfigModal)}
              className="hover:text-[#111111] transition-colors sp-mono"
            >
              API: {apiBaseUrl.replace('http://', '')}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="text-[#990F02] hover:underline underline-offset-4 font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
