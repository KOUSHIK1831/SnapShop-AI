import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { notFound } from '../lib/http-error';

export const analyticsRouter = Router();

analyticsRouter.get(
  '/seller',
  requireAuth,
  requireRole('seller', 'admin'),
  async (req, res) => {
    const seller = await prisma.seller.findUnique({
      where: { userId: req.actor!.id },
    });
    if (!seller) throw notFound('Seller profile not found');

    const orders = await prisma.order.findMany({
      where: { sellerId: seller.id },
      select: {
        id: true,
        total: true,
        status: true,
        payMethod: true,
        payStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const validOrders = orders.filter(
      o => o.status !== 'cancelled' && o.payStatus !== 'failed',
    );
    const totalRevenue = validOrders.reduce(
      (sum, o) => sum + Number(o.total),
      0,
    );
    const totalOrders = validOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const completedOrders = orders.filter(
      o => o.status === 'completed' || o.status === 'delivered',
    ).length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;

    const totalProducts = await prisma.product.count({
      where: { sellerId: seller.id },
    });

    // Daily breakdown for last 7 days
    const now = new Date();
    const dailyMap: Record<
      string,
      { date: string; sales: number; orders: number }
    > = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0]!;
      dailyMap[key] = { date: key, sales: 0, orders: 0 };
    }

    for (const o of validOrders) {
      const dayKey = o.createdAt.toISOString().split('T')[0]!;
      if (dailyMap[dayKey]) {
        dailyMap[dayKey]!.sales += Number(o.total);
        dailyMap[dayKey]!.orders += 1;
      }
    }

    res.json({
      summary: {
        totalRevenue,
        totalOrders,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        completedOrders,
        pendingOrders,
        totalProducts,
      },
      daily: Object.values(dailyMap),
    });
  },
);

analyticsRouter.get('/store/:slug', async (req, res) => {
  const seller = await prisma.seller.findUnique({
    where: { storeSlug: req.params.slug },
    select: {
      id: true,
      storeName: true,
      storeSlug: true,
      verificationStatus: true,
      createdAt: true,
    },
  });
  if (!seller) throw notFound('Store not found');

  const productCount = await prisma.product.count({
    where: { sellerId: seller.id },
  });

  res.json({
    storeName: seller.storeName,
    storeSlug: seller.storeSlug,
    verified: seller.verificationStatus === 'approved',
    productCount,
  });
});
