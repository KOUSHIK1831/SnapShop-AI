export function effectivePrice(price: number, discountPercent: number): number {
  const discounted = price * (1 - discountPercent / 100);
  return Math.round(discounted * 100) / 100;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
