import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockUser, mockSeller, mockToast, mockSupabaseSelect, mockSupabaseInsert } = vi.hoisted(() => ({
  mockUser: { id: 'user-1' },
  mockSeller: { id: 'seller-1' },
  mockToast: vi.fn(),
  mockSupabaseSelect: vi.fn(),
  mockSupabaseInsert: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('@/hooks/useSeller', () => ({
  useSeller: () => ({ seller: mockSeller }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

let mockChannel: any;
let realtimeCallback: any;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => {
      mockChannel = {
        on: vi.fn((event: any, filter: any, cb: any) => {
          realtimeCallback = cb;
          return mockChannel;
        }),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      };
      return mockChannel;
    }),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: mockSupabaseSelect,
        })),
      })),
      insert: mockSupabaseInsert,
    })),
  },
}));

import FeedbackModal, { FeedbackCard } from './FeedbackModal';

describe('FeedbackModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseSelect.mockResolvedValue({ data: [], error: null });
    mockSupabaseInsert.mockResolvedValue({ error: null });
  });

  it('renders trigger button', () => {
    render(<FeedbackModal />);
    expect(screen.getByText('admin.feedback')).toBeInTheDocument();
  });

  it('opens dialog when trigger is clicked', () => {
    render(<FeedbackModal />);
    fireEvent.click(screen.getByText('admin.feedback'));
    expect(screen.getByText('feedback.title')).toBeInTheDocument();
  });

  it('loads feedback history when dialog opens', async () => {
    const mockData = [{ id: '1', content: 'test', status: 'open', admin_response: null, created_at: '2024-01-01' }];
    mockSupabaseSelect.mockResolvedValue({ data: mockData, error: null });

    render(<FeedbackModal />);
    fireEvent.click(screen.getByText('admin.feedback'));

    await waitFor(() => {
      expect(mockSupabaseSelect).toHaveBeenCalled();
    });
  });

  it('submits feedback successfully', async () => {
    mockSupabaseInsert.mockResolvedValue({ error: null });

    render(<FeedbackModal />);
    fireEvent.click(screen.getByText('admin.feedback'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('feedback.placeholder')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('feedback.placeholder');
    fireEvent.change(textarea, { target: { value: 'Great app!' } });

    const submitBtn = screen.getByText('feedback.submit');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSupabaseInsert).toHaveBeenCalledWith({
        user_id: 'user-1',
        content: 'Great app!',
        status: 'open',
        seller_id: 'seller-1',
      });
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'feedback.success',
      variant: 'default',
    });
  });

  it('shows error toast when submission fails', async () => {
    mockSupabaseInsert.mockResolvedValue({ error: new Error('DB error') });

    render(<FeedbackModal />);
    fireEvent.click(screen.getByText('admin.feedback'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('feedback.placeholder')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('feedback.placeholder');
    fireEvent.change(textarea, { target: { value: 'Error test' } });

    fireEvent.click(screen.getByText('feedback.submit'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'feedback.error',
        description: 'DB error',
        variant: 'destructive',
      });
    });
  });

  it('renders feedback history tab with count', async () => {
    mockSupabaseSelect.mockResolvedValue({ data: [], error: null });

    render(<FeedbackModal />);
    fireEvent.click(screen.getByText('admin.feedback'));

    await waitFor(() => {
      expect(screen.getByText(/feedback\.history/)).toBeInTheDocument();
    });
  });

  it('disables submit button when content is empty', async () => {
    render(<FeedbackModal />);
    fireEvent.click(screen.getByText('admin.feedback'));

    await waitFor(() => {
      expect(screen.getByText('feedback.submit').closest('button')).toBeDisabled();
    });
  });

  it('resets form after successful submission', async () => {
    mockSupabaseInsert.mockResolvedValue({ error: null });

    render(<FeedbackModal />);
    fireEvent.click(screen.getByText('admin.feedback'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('feedback.placeholder')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('feedback.placeholder');
    fireEvent.change(textarea, { target: { value: 'Feedback text' } });
    fireEvent.click(screen.getByText('feedback.submit'));

    await waitFor(() => {
      expect(mockSupabaseInsert).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('feedback.submit').closest('button')).toBeDisabled();
    });
  });

  it('unsubscribes channel on unmount', () => {
    const { unmount } = render(<FeedbackModal />);
    fireEvent.click(screen.getByText('admin.feedback'));

    unmount();

    expect(mockChannel?.unsubscribe).toHaveBeenCalled();
  });

  it('handles realtime postgres_changes callback', async () => {
    mockSupabaseSelect.mockResolvedValue({ data: [], error: null });

    render(<FeedbackModal />);
    fireEvent.click(screen.getByText('admin.feedback'));

    await waitFor(() => {
      expect(mockSupabaseSelect).toHaveBeenCalled();
    });

    mockSupabaseSelect.mockClear();
    mockSupabaseSelect.mockResolvedValue({ data: [{ id: '1', content: 'New feedback', status: 'open', admin_response: null, created_at: '2024-01-01' }], error: null });

    await realtimeCallback();

    await waitFor(() => {
      expect(mockSupabaseSelect).toHaveBeenCalled();
    });
  });

  it('shows generic error when submission fails with non-Error', async () => {
    mockSupabaseInsert.mockResolvedValue({ error: 'string error' });

    render(<FeedbackModal />);
    fireEvent.click(screen.getByText('admin.feedback'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('feedback.placeholder')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('feedback.placeholder');
    fireEvent.change(textarea, { target: { value: 'test' } });

    fireEvent.click(screen.getByText('feedback.submit'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'feedback.error',
        description: 'auto.could_not_submit_feedback_plea',
        variant: 'destructive',
      });
    });
  });

  it('does not submit empty feedback', async () => {
    render(<FeedbackModal />);
    fireEvent.click(screen.getByText('admin.feedback'));

    await waitFor(() => {
      expect(screen.getByText('feedback.submit').closest('button')).toBeDisabled();
    });
  });
});

describe('FeedbackCard', () => {
  const mockT = (key: string) => key;

  it('renders feedback content with quotes', () => {
    const item = { id: '1', content: 'Bug report', status: 'open', admin_response: null, created_at: '2024-01-01' };
    const { container } = render(<FeedbackCard item={item} t={mockT} />);
    expect(container.textContent).toContain('Bug report');
  });

  it('renders admin response when present', () => {
    const item = { id: '2', content: 'Feature request', status: 'resolved', admin_response: 'We fixed it!', created_at: '2024-01-02' };
    render(<FeedbackCard item={item} t={mockT} />);
    expect(screen.getByText('We fixed it!')).toBeInTheDocument();
    expect(screen.getByText('feedback.adminResponse')).toBeInTheDocument();
  });

  it('does not show admin response section when absent', () => {
    const item = { id: '3', content: 'Just a comment', status: 'open', admin_response: null, created_at: '2024-01-03' };
    render(<FeedbackCard item={item} t={mockT} />);
    expect(screen.queryByText('feedback.adminResponse')).not.toBeInTheDocument();
  });

  it('shows open badge for open status', () => {
    const item = { id: '4', content: 'Issue', status: 'open', admin_response: null, created_at: '2024-01-04' };
    render(<FeedbackCard item={item} t={mockT} />);
    expect(screen.getByText('open')).toBeInTheDocument();
  });

  it('shows resolved badge for resolved status', () => {
    const item = { id: '5', content: 'Fixed issue', status: 'resolved', admin_response: null, created_at: '2024-01-05' };
    render(<FeedbackCard item={item} t={mockT} />);
    expect(screen.getByText('resolved')).toBeInTheDocument();
  });

  it('shows other status badge variant', () => {
    const item = { id: '6', content: 'Other', status: 'in_progress', admin_response: null, created_at: '2024-01-06' };
    render(<FeedbackCard item={item} t={mockT} />);
    expect(screen.getByText('in progress')).toBeInTheDocument();
  });
});
