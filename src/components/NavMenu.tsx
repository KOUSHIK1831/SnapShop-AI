import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Settings, HelpCircle, Bug, BookOpen } from 'lucide-react';

interface NavMenuProps {
  role?: string;
  onStartTour?: () => void;
  onFeedback?: () => void;
}

export default function NavMenu({
  role,
  onStartTour,
  onFeedback,
}: NavMenuProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const manualType = role === 'seller' ? 'seller' : 'buyer';

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={() => setOpen(!open)}
        title="Menu"
      >
        <Settings className="size-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-popover border border-border/50 rounded-xl shadow-lg py-2 z-50 animate-fade-in">
          {onStartTour && (
            <button
              onClick={() => {
                setOpen(false);
                onStartTour();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <HelpCircle className="size-4 text-muted-foreground" />
              Help Tour
            </button>
          )}
          {onFeedback && (
            <button
              onClick={() => {
                setOpen(false);
                onFeedback();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <Bug className="size-4 text-muted-foreground" />
              Report Bug / Feedback
            </button>
          )}
          <button
            onClick={() => {
              setOpen(false);
              navigate(`/manual?type=${manualType}`);
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <BookOpen className="size-4 text-muted-foreground" />
            User Manual
          </button>
        </div>
      )}
    </div>
  );
}
