import { useRef } from 'react';
import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useAuth } from './useAuth';
import type { Tab } from '@/pages/Dashboard';

const STORAGE_KEY = 'apnabazar-tour-completed';

export function useWelcomeTour(setActiveTab?: (tab: Tab) => void) {
  const { user } = useAuth();
  const driverObj = useRef<Driver | null>(null);

  const startTour = () => {
    // 1. Remove tour for admin
    if (user?.role === 'admin') return;

    driverObj.current = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      steps: [
        {
          element: '#tour-welcome',
          popover: {
            title: 'Welcome to SnapShop AI!',
            description:
              'Let us show you around your seller dashboard. Everything you need to manage your store is right here.',
            side: 'center',
            align: 'center',
          },
        },
        {
          element: '[data-tour="products"]',
          popover: {
            title: 'Product Catalog',
            description:
              'Your primary view. Manage all your listed products, edit details, and track stock from here.',
            side: 'top',
          },
          onHighlighted: () => {
            setActiveTab?.('products');
          },
        },
        {
          element: '[data-tour="tools"]',
          popover: {
            title: 'Store Management',
            description:
              'Your hub for daily operations. Process customer orders, upload new products with AI, and manage inventory.',
            side: 'top',
          },
          onHighlighted: () => {
            setActiveTab?.('tools');
          },
        },
        {
          element: '[data-tour="profile"]',
          popover: {
            title: 'Store Profile',
            description:
              'View deep analytics, update your store settings, and manage your account details.',
            side: 'top',
          },
          onHighlighted: () => {
            setActiveTab?.('profile');
          },
        },
        {
          element: '#tour-feedback',
          popover: {
            title: 'Share Feedback',
            description:
              'Have a suggestion or found a bug? Let us know! Your feedback helps us improve SnapShop AI.',
            side: 'bottom',
          },
        },
        {
          element: '#tour-language',
          popover: {
            title: 'Language Preferences',
            description:
              'SnapShop AI is available in multiple languages. You can switch between English, Telugu, and Hindi at any time.',
            side: 'bottom',
          },
        },
      ],
      onDestroyed: () => {
        localStorage.setItem(STORAGE_KEY, 'true');
      },
    });

    // Slight delay to ensure DOM is ready
    setTimeout(() => {
      driverObj.current?.drive();
    }, 500);
  };

  const isTourCompleted = () => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  };

  return { startTour, isTourCompleted };
}
