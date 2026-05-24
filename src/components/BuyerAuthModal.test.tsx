import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import BuyerAuthModal from "./BuyerAuthModal";

const { signInPasswordMock, signUpMock } = vi.hoisted(() => ({
  signInPasswordMock: vi.fn(() => ({ error: null })),
  signUpMock: vi.fn(() => ({ error: null })),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    signIn: {
      password: signInPasswordMock,
    },
    signUp: signUpMock,
  }),
}));

describe("BuyerAuthModal", () => {
  it("does not render when closed", () => {
    const { container } = render(
      <BuyerAuthModal isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("signs in and calls onSuccess on success", async () => {
    const onSuccess = vi.fn();
    render(
      <BuyerAuthModal isOpen onClose={vi.fn()} onSuccess={onSuccess} storeName="Test Store" />,
    );

    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/min. 6 characters/i), {
      target: { value: "password123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(signInPasswordMock).toHaveBeenCalledWith("test@example.com", "password123");
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("shows auth errors", async () => {
    signInPasswordMock.mockResolvedValueOnce({ error: { message: "Invalid credentials" } } as any);
    
    render(
      <BuyerAuthModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />,
    );

    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/min. 6 characters/i), {
      target: { value: "wrong" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
