import { render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { useForm, FormProvider, useFormState } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';

describe('Form', () => {
  function TestForm() {
    const form = useForm({ defaultValues: { name: '' } });
    return (
      <FormProvider {...form}>
        <FormField
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <input {...field} data-testid="input" />
              </FormControl>
              <FormDescription>Enter your name</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormProvider>
    );
  }

  it('renders form field with label, control, description', () => {
    render(<TestForm />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByTestId('input')).toBeInTheDocument();
    expect(screen.getByText('Enter your name')).toBeInTheDocument();
  });

  it('renders FormMessage with error', () => {
    function ErrorForm() {
      const form = useForm({ defaultValues: { name: '' } });
      useEffect(() => {
        form.setError('name', { message: 'Required' });
      }, []);
      return (
        <FormProvider {...form}>
          <FormField
            name="name"
            render={() => (
              <FormItem>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormProvider>
      );
    }
    render(<ErrorForm />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('FormControl sets aria-invalid when error exists', () => {
    function ErrorForm() {
      const form = useForm({ defaultValues: { name: '' } });
      useEffect(() => {
        form.setError('name', { message: 'Required' });
      }, []);
      return (
        <FormProvider {...form}>
          <FormField
            name="name"
            render={() => (
              <FormItem>
                <FormControl>
                  <input data-testid="input2" />
                </FormControl>
              </FormItem>
            )}
          />
        </FormProvider>
      );
    }
    render(<ErrorForm />);
    const input = screen.getByTestId('input2');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('FormMessage returns null when no error or children', () => {
    function EmptyForm() {
      const form = useForm({ defaultValues: { name: '' } });
      return (
        <FormProvider {...form}>
          <FormField
            name="name"
            render={() => (
              <FormItem>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormProvider>
      );
    }
    const { container } = render(<EmptyForm />);
    expect(container.querySelector('p')).toBeNull();
  });
});
