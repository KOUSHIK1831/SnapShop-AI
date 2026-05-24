import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";

import Auth from "./Auth";

const {
  signInMock,
  signUpMock,
  toastMock,
  navigateMock,
  supabaseMock,
} = vi.hoisted(() => ({
  signInMock: vi.fn(),
  signUpMock: vi.fn(),
  toastMock: vi.fn(),
  navigateMock: vi.fn(),
  supabaseMock: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}));

let mockUser: any = null;

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    signIn: { password: signInMock, sendOtp: vi.fn(), verifyOtp: vi.fn() },
    signUp: signUpMock,
    resetPassword: vi.fn(),
    verifyOtp: vi.fn(),
  }),
}));


vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/components/LanguageSwitcher", () => ({
  default: () => <div>LanguageSwitcher</div>,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: supabaseMock,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

describe("Auth page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    
    // Default supabase mocks
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it("signs in and navigates to the dashboard", async () => {
    signInMock.mockResolvedValue({ error: null });
    supabaseMock.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: "user-123", email: "seller@example.com", email_confirmed_at: new Date().toISOString() },
        },
      },
    });
    
    // Profile mock for role
    (supabaseMock.from as any).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { role: "seller" }, error: null }),
        })),
      })),
    });

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );
    
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "seller@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "password123" },
    });
    
    fireEvent.submit(screen.getAllByRole("button", { name: /sign in/i }).slice(-1)[0].closest("form")!);

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith("seller@example.com", "password123");
      expect(navigateMock).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows a toast on sign-in error", async () => {
    signInMock.mockResolvedValue({ error: { message: "Invalid login" } });

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );
    
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "wrong@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "wrongpass" },
    });
    
    fireEvent.submit(screen.getAllByRole("button", { name: /sign in/i }).slice(-1)[0].closest("form")!);


    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Error",
          description: "Invalid login",
          variant: "destructive",
        }),
      );
    });
  });

  it("switches to sign-up mode and shows the confirmation toast", async () => {
    signUpMock.mockResolvedValue({ error: null });

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );

    fireEvent.click(screen.getAllByRole("button", { name: /create account/i }).slice(-1)[0]);
    
    fireEvent.change(screen.getByPlaceholderText(/phone/i), {
      target: { value: "9876543210" },
    });
    fireEvent.change(screen.getByPlaceholderText(/full name/i), {
      target: { value: "New Seller" },
    });
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "password123" },
    });
    
    fireEvent.submit(screen.getAllByRole("button", { name: /create account/i }).slice(-1)[0].closest("form")!);


    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Verification Required" }),
      );
    });

  });
});
