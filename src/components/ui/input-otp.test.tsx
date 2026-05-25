import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from './input-otp';

describe('InputOTP', () => {
  it('renders OTP slots', () => {
    const { container } = render(
      <InputOTP maxLength={6}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
        </InputOTPGroup>
      </InputOTP>
    );
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('renders separator between groups', () => {
    const { container } = render(
      <InputOTP maxLength={6}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>
    );
    const separators = container.querySelectorAll('[role="separator"]');
    expect(separators.length).toBeGreaterThan(0);
  });

  it('accepts value and onChange', () => {
    const onChange = () => {};
    const { container } = render(
      <InputOTP maxLength={4} value="" onChange={onChange}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
        </InputOTPGroup>
      </InputOTP>
    );
    const inputs = container.querySelectorAll('input');
    expect(inputs.length).toBeGreaterThan(0);
  });
});
