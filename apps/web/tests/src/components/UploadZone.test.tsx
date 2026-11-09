import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import UploadZone from '@/components/UploadZone';
import en from '@/locales/en/translation.json';

const {
  toastMock,
  invokeMock,
  uploadMock,
  getPublicUrlMock,
  filesInsertMock,
  productsInsertMock,
  updateMock,
  eqMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  invokeMock: vi.fn(),
  uploadMock: vi.fn(),
  getPublicUrlMock: vi.fn(),
  filesInsertMock: vi.fn(),
  productsInsertMock: vi.fn(),
  updateMock: vi.fn(),
  eqMock: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
      })),
    },
    functions: {
      invoke: invokeMock,
    },
    from: vi.fn((table: string) => {
      if (table === 'files') {
        return {
          insert: filesInsertMock,
          update: updateMock,
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: { id: `file-${Math.random()}` } })),
          })),
        };
      }
      if (table === 'products') {
        return {
          insert: productsInsertMock,
        };
      }
      return {
        eq: eqMock,
      };
    }),
  },
}));

vi.mock('@/lib/utils', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/utils')>('@/lib/utils');
  return {
    ...actual,
    compressImage: vi.fn(file => Promise.resolve(file)),
  };
});

const mockAIProduct = {
  title: 'Digitized Saree',
  description: 'Silk blend',
  price: 1299,
  category: 'Sarees',
  tags: ['festive'],
};

describe('UploadZone', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.resetAllMocks();

    uploadMock.mockResolvedValue({ error: null });
    getPublicUrlMock.mockReturnValue({
      data: { publicUrl: 'https://example.com/url.png' },
    });

    let fileIdCounter = 0;
    filesInsertMock.mockImplementation(() => ({
      select: () => ({
        single: async () => ({ data: { id: `file-${++fileIdCounter}` } }),
      }),
    }));
    productsInsertMock.mockResolvedValue({ error: null });

    updateMock.mockReturnValue({ eq: eqMock });
    eqMock.mockResolvedValue({ error: null });
    invokeMock.mockResolvedValue({
      data: { product: mockAIProduct },
      error: null,
    });
  });

  it('shows an error toast for files larger than 5MB', async () => {
    render(
      <UploadZone
        sellerId="seller-1"
        onComplete={vi.fn()}
        usageToday={0}
        dailyLimit={10}
      />,
    );
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const largeFile = new File(['x'], 'large.png', { type: 'image/png' });
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [largeFile] } });
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'File too large' }),
      ),
    );
  });

  it('shows limit reached toast when files exceed remaining credits', async () => {
    render(
      <UploadZone
        sellerId="seller-1"
        onComplete={vi.fn()}
        usageToday={9}
        dailyLimit={10}
      />,
    );
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File([''], '1.png'), new File([''], '2.png')] },
    });
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Limit reached' }),
      ),
    );
  });

  it('uploads, digitizes, and completes a valid file batch', async () => {
    const onComplete = vi.fn();
    render(
      <UploadZone
        sellerId="seller-1"
        onComplete={onComplete}
        usageToday={0}
        dailyLimit={10}
      />,
    );
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File([''], 'c.png')] } });
    });
    await screen.findByText(en['auto.review_products']);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: en['auto.approve'] }));
    });
    await screen.findByText(en['upload.complete']);
    expect(onComplete).toHaveBeenCalled();
  });

  it('handles price override', async () => {
    render(
      <UploadZone
        sellerId="s1"
        onComplete={vi.fn()}
        usageToday={0}
        dailyLimit={10}
      />,
    );
    fireEvent.change(
      screen.getByPlaceholderText(en['auto.e_g_999_leave_empty_for_ai_est']),
      { target: { value: '500' } },
    );
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(fileInput, {
        target: { files: [new File([''], 'f.png')] },
      });
    });
    await screen.findByText(en['auto.review_products']);
    expect(screen.getByText(/500/)).toBeInTheDocument();
  });

  it('handles digitization failure gracefully', async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: { message: 'AI failed' },
    });
    render(
      <UploadZone
        sellerId="s1"
        onComplete={vi.fn()}
        usageToday={0}
        dailyLimit={10}
      />,
    );
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File([''], 'failed.png')] },
      });
    });
    await screen.findByText(en['auto.review_products']);
    expect(
      screen.getByText(en['auto.ai_digitization_failed']),
    ).toBeInTheDocument();
  });

  it('handles limit-exceeded error from edge function', async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: { message: 'limit-exceeded' },
    });
    render(
      <UploadZone
        sellerId="s1"
        onComplete={vi.fn()}
        usageToday={0}
        dailyLimit={10}
      />,
    );
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File([''], 'limit.png')] },
      });
    });
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Limit Reached' }),
      ),
    );
  });

  it('handles drag and drop events', async () => {
    render(
      <UploadZone
        sellerId="s1"
        onComplete={vi.fn()}
        usageToday={0}
        dailyLimit={10}
      />,
    );
    const dropZone = screen.getByText(en['upload.dragDrop']).closest('div');
    fireEvent.dragOver(dropZone!);
    fireEvent.dragLeave(dropZone!);
    await act(async () => {
      fireEvent.drop(dropZone!, {
        dataTransfer: { files: [new File([''], 'drop.png')] },
      });
    });
    await screen.findByText(en['auto.review_products']);
  });

  it('allows retrying after error', async () => {
    uploadMock.mockResolvedValue({ error: { message: 'Upload failed' } });
    render(
      <UploadZone
        sellerId="s1"
        onComplete={vi.fn()}
        usageToday={0}
        dailyLimit={10}
      />,
    );
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File([''], 'retry.png')] },
      });
    });
    await screen.findByText(en['auto.processing_failed']);
    fireEvent.click(screen.getByText(en['auto.try_again']));
    expect(screen.getByText(en['upload.dragDrop'])).toBeInTheDocument();
  });

  it('resets to idle after completion', async () => {
    render(
      <UploadZone
        sellerId="s1"
        onComplete={vi.fn()}
        usageToday={0}
        dailyLimit={10}
      />,
    );
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File([''], 'reset.png')] },
      });
    });
    await screen.findByText(en['auto.review_products']);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: en['auto.approve'] }));
    });
    await screen.findByText(en['upload.complete']);
    fireEvent.click(screen.getByText(en['auto.upload_more']));
    expect(screen.getByText(en['upload.dragDrop'])).toBeInTheDocument();
  });

  it('rejects a review', async () => {
    render(
      <UploadZone
        sellerId="s1"
        onComplete={vi.fn()}
        usageToday={0}
        dailyLimit={10}
      />,
    );
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File([''], 'reject.png')] },
      });
    });
    await screen.findByText(en['auto.review_products']);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: en['auto.reject'] }));
    });
    expect(screen.queryByText('Digitized Saree')).not.toBeInTheDocument();
  });

  it('shows error toast when product insertion fails', async () => {
    productsInsertMock.mockResolvedValue({
      error: { message: 'Insert failed' },
    });
    render(
      <UploadZone
        sellerId="s1"
        onComplete={vi.fn()}
        usageToday={0}
        dailyLimit={10}
      />,
    );
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File([''], 'fail-insert.png')] },
      });
    });
    await screen.findByText(en['auto.review_products']);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: en['auto.approve'] }));
    });
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error' }),
      ),
    );
  });

  it('completes after rejecting the last review if some were approved', async () => {
    const onComplete = vi.fn();
    render(
      <UploadZone
        sellerId="s1"
        onComplete={onComplete}
        usageToday={0}
        dailyLimit={10}
      />,
    );
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File([''], 'f1.png'), new File([''], 'f2.png')] },
      });
    });
    await screen.findByText(en['auto.review_products']);

    // Approve first
    await act(async () => {
      fireEvent.click(
        screen.getAllByRole('button', { name: en['auto.approve'] })[0],
      );
    });

    // Reject last
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: en['auto.reject'] }));
    });

    await screen.findByText(en['upload.complete']);
    expect(onComplete).toHaveBeenCalled();
  });

  it('compresses images larger than 150KB', async () => {
    render(
      <UploadZone
        sellerId="s1"
        onComplete={vi.fn()}
        usageToday={0}
        dailyLimit={10}
      />,
    );
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const largeFile = new File(['x'.repeat(200 * 1024)], 'large.png', {
      type: 'image/png',
    });
    await act(async () => {
      fireEvent.change(input, { target: { files: [largeFile] } });
    });
    const { compressImage } = await import('@/lib/utils');
    expect(compressImage).toHaveBeenCalled();
  });

  it('handles digitization error catch block', async () => {
    invokeMock.mockImplementation(() => {
      throw new Error('Unexpected crash');
    });
    render(
      <UploadZone
        sellerId="s1"
        onComplete={vi.fn()}
        usageToday={0}
        dailyLimit={10}
      />,
    );
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File([''], 'crash.png')] },
      });
    });
    await screen.findByText(en['auto.review_products']);
    expect(
      screen.getByText(en['auto.ai_digitization_failed']),
    ).toBeInTheDocument();
  });

  it('handles general processFiles error', async () => {
    uploadMock.mockImplementation(() => {
      throw new Error('Global crash');
    });
    render(
      <UploadZone
        sellerId="s1"
        onComplete={vi.fn()}
        usageToday={0}
        dailyLimit={10}
      />,
    );
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File([''], 'global.png')] },
      });
    });
    await screen.findByText(en['auto.processing_failed']);
  });
});
