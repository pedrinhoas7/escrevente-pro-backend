import dotenv from 'dotenv';
import path from 'path';
import { auth } from '../config/firebase';
import { enviarEmail } from '../services/emailService';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const testar = async () => {
    const email = 'pedrinhoas7@gmail.com';
    const nome = 'Pedro Teste';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'configurada' : 'nao configurada');
    console.log('FIREBASE_API_KEY:', process.env.FIREBASE_API_KEY ? 'configurada' : 'nao configurada');
    console.log('FRONTEND_URL:', frontendUrl);

    const firebaseLink = await auth.generatePasswordResetLink(email);
    const oobCodeMatch = firebaseLink.match(/oobCode=([^&]+)/);
    const oobCode = oobCodeMatch ? oobCodeMatch[1] : '';
    const resetLink = `${frontendUrl}/redefinir-senha?oobCode=${oobCode}`;

    console.log('\nReset link:', resetLink);

    try {
        await enviarEmail(email, nome, resetLink, 'reset');
        console.log('\nEmail enviado com sucesso via Resend!');
    } catch (e) {
        console.error('\nErro:', e);
    }
};

testar();