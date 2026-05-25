import { describe, expect, it, vi, beforeEach } from 'vitest';

import { cn, compressImage } from './utils';

describe('cn', () => {
  it('merges conditional classes', () => {
    const isHidden = false;
    expect(cn('base', isHidden && 'hidden', 'active')).toBe('base active');
  });

  it('lets tailwind-merge resolve conflicting utilities', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
});

describe('compressImage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const setupMocks = (options: {
    imageWidth?: number,
    imageHeight?: number,
    fileReaderError?: boolean,
    imageError?: boolean,
    toBlobResult?: Blob | null
  } = {}) => {
    const {
      imageWidth = 2000,
      imageHeight = 1000,
      fileReaderError = false,
      imageError = false,
      toBlobResult = new Blob(['compressed'], { type: 'image/jpeg' })
    } = options;

    // Mock FileReader
    const mockFileReaderInstance = {
      readAsDataURL: vi.fn(function(this: any) {
        setTimeout(() => {
          if (fileReaderError) {
            this.onerror && this.onerror();
          } else {
            this.onload && this.onload({ target: { result: 'data:image/jpeg;base64,' } });
          }
        }, 0);
      }),
      onload: null as any,
      onerror: null as any,
    };
    vi.stubGlobal('FileReader', vi.fn(() => mockFileReaderInstance));

    // Mock Image
    const mockImageInstance = {
      src: '',
      onload: null as any,
      onerror: null as any,
      width: imageWidth,
      height: imageHeight,
    };
    vi.stubGlobal('Image', vi.fn(() => {
      setTimeout(() => {
        if (imageError) {
          mockImageInstance.onerror && mockImageInstance.onerror();
        } else {
          mockImageInstance.onload && mockImageInstance.onload();
        }
      }, 0);
      return mockImageInstance;
    }));

    // Mock Canvas
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        drawImage: vi.fn(),
      })),
      toBlob: vi.fn((callback) => callback(toBlobResult)),
    };
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') return mockCanvas as any;
      return document.createElement(tagName);
    });

    return { mockCanvas };
  };

  it('compresses an image successfully and resizes landscape', async () => {
    const { mockCanvas } = setupMocks({ imageWidth: 2000, imageHeight: 1000 });
    const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    
    const result = await compressImage(mockFile);
    
    expect(result).toBeInstanceOf(Blob);
    expect(mockCanvas.width).toBe(1200);
    expect(mockCanvas.height).toBe(600);
  });

  it('handles small images without resizing', async () => {
    const { mockCanvas } = setupMocks({ imageWidth: 800, imageHeight: 600 });
    const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    
    const result = await compressImage(mockFile);
    
    expect(mockCanvas.width).toBe(800);
    expect(mockCanvas.height).toBe(600);
  });

  it('handles tall images resizing', async () => {
    const { mockCanvas } = setupMocks({ imageWidth: 1000, imageHeight: 2000 });
    const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    
    await compressImage(mockFile);
    
    expect(mockCanvas.width).toBe(600);
    expect(mockCanvas.height).toBe(1200);
  });

  it('rejects on FileReader error', async () => {
    setupMocks({ fileReaderError: true });
    const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    
    await expect(compressImage(mockFile)).rejects.toThrow('Failed to read file for compression');
  });

  it('rejects on Image error', async () => {
    setupMocks({ imageError: true });
    const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    
    await expect(compressImage(mockFile)).rejects.toThrow('Failed to load image for compression');
  });

  it('rejects when toBlob returns null', async () => {
    setupMocks({ toBlobResult: null });
    const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    
    await expect(compressImage(mockFile)).rejects.toThrow('Canvas to Blob conversion failed');
  });
});
