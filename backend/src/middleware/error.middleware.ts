import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err);

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  if (err instanceof Error) {
    const status = typeof (err as Error & { status?: unknown }).status === 'number' ? (err as Error & { status: number }).status : 500;
    res.status(status).json({ error: err.message });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
}
