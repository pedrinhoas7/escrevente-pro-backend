import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

// Interface estendida para adicionar o usuário à requisição
declare global {
    namespace Express {
        interface Request {
            user?: admin.auth.DecodedIdToken;
        }
    }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Não autorizado. Token não fornecido.' });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Erro de autenticação:', error);
        return res.status(403).json({ message: 'Token inválido ou expirado.' });
    }
};
