import { useRef, type ReactNode, type MouseEvent } from 'react';

interface Tilt3DProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
  glare?: boolean;
}

export default function Tilt3D({
  children,
  className = '',
  intensity = 8,
  glare = false,
}: Tilt3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -intensity;
    const rotateY = ((x - centerX) / centerX) * intensity;

    ref.current.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;

    if (glare && glareRef.current) {
      const glareX = (x / rect.width) * 100;
      const glareY = (y / rect.height) * 100;
      glareRef.current.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.12) 0%, transparent 60%)`;
    }
  };

  const handleMouseLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform =
      'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    if (glare && glareRef.current) {
      glareRef.current.style.background = 'transparent';
    }
  };

  return (
    <div
      ref={ref}
      className={`relative transition-transform duration-300 ease-out will-change-transform ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {glare && (
        <div
          ref={glareRef}
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-[background] duration-75 z-10"
        />
      )}
    </div>
  );
}
