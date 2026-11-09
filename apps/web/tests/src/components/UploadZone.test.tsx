import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UploadZone from '@/components/UploadZone';
import en from '@/locales/en/translation.json';

const { toastMock, uploadMock, apiPostMock, apiDeleteMock } = vi.hoisted(
  () => ({
    toastMock: vi.fn(),
    uploadMock: vi.fn(),
    apiPostMock: vi.fn(),
    apiDeleteMock: vi.fn(),
  }),
);

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));
vi.mock('@/lib/upload', () => ({ uploadFile: uploadMock }));
vi.mock('@/lib/apiClient', () => ({
  apiClient: { post: apiPostMock, delete: apiDeleteMock },
}));
vi.mock('@/lib/utils', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/utils')>('@/lib/utils');
  return { ...actual, compressImage: vi.fn(file => Promise.resolve(file)) };
});

const aiProduct = {
  title: 'Digitized Saree',
  description: 'Silk blend',
  price: 1299,
  category: 'Sarees',
  tags: ['festive'],
};

describe('UploadZone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadMock.mockResolvedValue({
      fileId: 'file-1',
      key: 'uploads/file-1',
      publicUrl: 'https://example.com/image.png',
    });
    apiPostMock.mockImplementation((path: string) =>
      path === '/ai/digitize'
        ? Promise.resolve({ product: aiProduct })
        : Promise.resolve({ product: { id: 'product-1' } }),
    );
    apiDeleteMock.mockResolvedValue(null);
  });

  it('rejects files larger than 5MB', async () => {
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
    const file = new File(['x'], 'large.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'File too large' }),
      ),
    );
  });

  it('uploads, digitizes through the API, and creates an approved product', async () => {
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
    await act(async () =>
      fireEvent.change(input, {
        target: {
          files: [new File(['image'], 'item.png', { type: 'image/png' })],
        },
      }),
    );
    await screen.findByText(en['auto.review_products']);
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: en['auto.approve'] })),
    );
    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        '/products',
        expect.objectContaining({ title: aiProduct.title }),
      ),
    );
    expect(onComplete).toHaveBeenCalled();
  });

  it('shows a digitization failure from the API', async () => {
    apiPostMock.mockRejectedValueOnce(new Error('AI unavailable'));
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
    await act(async () =>
      fireEvent.change(input, {
        target: {
          files: [new File(['image'], 'item.png', { type: 'image/png' })],
        },
      }),
    );
    expect(
      await screen.findByText(en['auto.ai_digitization_failed']),
    ).toBeInTheDocument();
  });
});
