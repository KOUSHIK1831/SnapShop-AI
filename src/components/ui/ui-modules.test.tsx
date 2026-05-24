import { describe, expect, it } from 'vitest';

import * as Accordion from './accordion';
import * as AlertDialog from './alert-dialog';
import * as Alert from './alert';
import * as AspectRatio from './aspect-ratio';
import * as Avatar from './avatar';
import * as Badge from './badge';
import * as Breadcrumb from './breadcrumb';
import * as Button from './button';
import * as Calendar from './calendar';
import * as Card from './card';
import * as Carousel from './carousel';
import * as Chart from './chart';
import * as Checkbox from './checkbox';
import * as Collapsible from './collapsible';
import * as Command from './command';
import * as ContextMenu from './context-menu';
import * as Dialog from './dialog';
import * as Drawer from './drawer';
import * as DropdownMenu from './dropdown-menu';
import * as Form from './form';
import * as HoverCard from './hover-card';
import * as InputOtp from './input-otp';
import * as Input from './input';
import * as Label from './label';
import * as Menubar from './menubar';
import * as NavigationMenu from './navigation-menu';
import * as Pagination from './pagination';
import * as Popover from './popover';
import * as Progress from './progress';
import * as RadioGroup from './radio-group';
import * as Resizable from './resizable';
import * as ScrollArea from './scroll-area';
import * as Select from './select';
import * as Separator from './separator';
import * as Sheet from './sheet';
import * as Sidebar from './sidebar';
import * as Skeleton from './skeleton';
import * as Slider from './slider';
import * as Sonner from './sonner';
import * as Switch from './switch';
import * as Table from './table';
import * as Tabs from './tabs';
import * as Textarea from './textarea';
import * as Toast from './toast';
import * as Toaster from './toaster';
import * as ToggleGroup from './toggle-group';
import * as Toggle from './toggle';
import * as Tooltip from './tooltip';
import * as UiToast from './use-toast';

const modules = {
  Accordion,
  AlertDialog,
  Alert,
  AspectRatio,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Calendar,
  Card,
  Carousel,
  Chart,
  Checkbox,
  Collapsible,
  Command,
  ContextMenu,
  Dialog,
  Drawer,
  DropdownMenu,
  Form,
  HoverCard,
  InputOtp,
  Input,
  Label,
  Menubar,
  NavigationMenu,
  Pagination,
  Popover,
  Progress,
  RadioGroup,
  Resizable,
  ScrollArea,
  Select,
  Separator,
  Sheet,
  Sidebar,
  Skeleton,
  Slider,
  Sonner,
  Switch,
  Table,
  Tabs,
  Textarea,
  Toast,
  Toaster,
  ToggleGroup,
  Toggle,
  Tooltip,
  UiToast,
};

describe('ui modules', () => {
  it('exports runtime members for every ui module', () => {
    for (const [name, mod] of Object.entries(modules)) {
      expect(
        Object.keys(mod).length,
        `${name} should export runtime members`,
      ).toBeGreaterThan(0);
    }
  });

  it('exposes the expected core helpers on custom modules', () => {
    expect(Button.Button).toBeDefined();
    expect(Button.buttonVariants).toBeDefined();
    expect(Form.useFormField).toBeDefined();
    expect(Carousel.Carousel).toBeDefined();
    expect(Chart.ChartContainer).toBeDefined();
    expect(Sidebar.SidebarProvider).toBeDefined();
    expect(Sidebar.useSidebar).toBeDefined();
    expect(Sonner.Toaster).toBeDefined();
    expect(Toaster.Toaster).toBeDefined();
    expect(UiToast.toast).toBeDefined();
    expect(UiToast.useToast).toBeDefined();
  });
});
