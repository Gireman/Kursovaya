export const ROLE_CLIENT = 1;
export const ROLE_EMPLOYEE = 2;

export function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Не авторизован' });
  }
  next();
}

export function requireRole(...roleIds) {
  return (req, res, next) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }
    if (!roleIds.includes(req.session.roleId)) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    next();
  };
}
