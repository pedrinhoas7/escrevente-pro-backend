import { Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.FIREBASE_API_KEY;

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    console.log('--- Debug Login ---');
    console.log(`API Key (last 4 chars): ${API_KEY ? API_KEY.slice(-4) : 'N/A'}`);
    console.log(`Attempting login for email: ${email}`);
    console.log('--- End Debug ---');

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

        res.status(200).json({
            token: idToken,
            userId: localId,
            refreshToken,
            expiresIn
        });

    } catch (error: any) {
        console.error('Erro no login (detalhes):', error.response ? error.response.data : error.message);
        res.status(401).json({ message: 'Credenciais inválidas ou erro no servidor de autenticação.' });
    }
};
