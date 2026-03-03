import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Carrega variáveis de ambiente ANTES de qualquer coisa
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const createAdmin = async () => {
    const email = 'admin@escrevente-pro.com.br';
    const password = 'Mudar123';
    const apiKey = process.env.FIREBASE_API_KEY;

    if (!apiKey) {
        console.error('❌ FIREBASE_API_KEY não encontrada no .env');
        process.exit(1);
    }

    console.log(`🔑 Usando API Key: ${apiKey ? '***' + apiKey.slice(-4) : 'N/A'}`);
    console.log(`👤 Tentando criar usuário: ${email}`);

    try {
        // Tenta criar via API REST pública (simula cadastro no frontend)
        // Isso funciona se Email/Password estiver habilitado no console, mesmo sem Service Account
        const response = await axios.post(
            `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
            {
                email,
                password,
                returnSecureToken: true
            }
        );

        const { localId, email: createdEmail } = response.data;
        console.log(`\n✅ Usuário Admin criado com sucesso via API REST!`);
        console.log(`   UID: ${localId}`);
        console.log(`   Email: ${createdEmail}`);
        console.log(`   Senha: ${password}\n`);

    } catch (error: any) {
        if (error.response && error.response.data && error.response.data.error) {
            const errCode = error.response.data.error.message;
            if (errCode === 'EMAIL_EXISTS') {
                console.log(`\n⚠️  O usuário ${email} já existe.`);
                // Se já existe, tenta fazer login para confirmar e pegar o UID
                try {
                    const loginRes = await axios.post(
                        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
                        {
                            email,
                            password,
                            returnSecureToken: true
                        }
                    );
                    console.log(`   Login realizado com sucesso.`);
                    console.log(`   UID: ${loginRes.data.localId}\n`);
                } catch (loginErr) {
                    console.log(`   Mas a senha pode estar incorreta ou outro erro ocorreu no login.\n`);
                }
            } else {
                console.error(`\n❌ Erro ao criar usuário (API REST): ${errCode}`);
                console.error(`   Detalhes: ${JSON.stringify(error.response.data.error)}\n`);
            }
        } else {
            console.error('\n❌ Erro desconhecido:', error.message);
        }
    }
};

createAdmin();
