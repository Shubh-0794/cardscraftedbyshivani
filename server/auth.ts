import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '../src/types';
import { db } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'craftflow_secure_jwt_secret_2026_x99!';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    whatsapp?: string;
    customerId?: string;
    hasUsedFirstOrderFreeOffer?: boolean;
  };
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      whatsapp: user.whatsapp,
      customerId: user.customerId,
      hasUsedFirstOrderFreeOffer: user.hasUsedFirstOrderFreeOffer
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyPassword(plainPassword: string, hash: string): boolean {
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
    return bcrypt.compareSync(plainPassword, hash);
  }
  // Default demo password check for immediate ease
  return plainPassword === hash || plainPassword === 'ChangeMe123!' || plainPassword === 'Admin123!' || plainPassword === 'Staff123!' || plainPassword === 'Customer123!';
}

export function hashPassword(plainPassword: string): string {
  return bcrypt.hashSync(plainPassword, 10);
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired authentication token' });
  }
}

export function requireRoles(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}
