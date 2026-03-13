import { Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { auth } from '../config/firebase'; // Importar auth do firebase admin

dotenv.config();

const API_KEY = process.env.FIREBASE_API_KEY;

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    try {
        const response = await axios.post(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
            {
                email,
                password,
                returnSecureToken: true
            }
        );

        const { idToken, localId, refreshToken, expiresIn } = response.data;

        // Decodificar o ID Token para obter as claims (incluindo o role)
        const decodedToken = await auth.verifyIdToken(idToken);
        const userRole = decodedToken.role || 'usuario'; // Default role, if not set

        res.status(200).json({
            token: idToken,
            userId: localId,
            refreshToken,
            expiresIn,
            userRole, // Incluir o role na resposta
        });

    } catch (error: any) {
        console.error('Erro no login:', error.response ? error.response.data : error.message);
        res.status(401).json({ message: 'Credenciais inválidas ou erro no servidor de autenticação.' });
    }
};

export const refreshToken = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token é obrigatório.' });
    }

    try {
        const response = await axios.post(
            `https://securetoken.googleapis.com/v1/token?key=${API_KEY}`,
            {
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            }
        );

        const { id_token, user_id, refresh_token, expires_in } = response.data;

        // Decodificar o ID Token para obter as claims (incluindo o role)
        const decodedToken = await auth.verifyIdToken(id_token);
        const userRole = decodedToken.role || 'usuario'; // Default role, if not set

        res.status(200).json({
            token: id_token,
            userId: user_id,
            refreshToken: refresh_token,
            expiresIn: expires_in,
            userRole, // Incluir o role na resposta
        });

    } catch (error: any) {
        console.error('Erro ao renovar token:', error.response ? error.response.data : error.message);
        res.status(401).json({ message: 'Refresh token inválido ou expirado.' });
    }
};
