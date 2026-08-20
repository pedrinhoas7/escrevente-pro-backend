import { Request, Response } from 'express';
import { auth, db } from '../config/firebase';
import * as admin from 'firebase-admin';
import { enviarEmail } from '../services/emailService';

interface UsuarioAdmin {
    uid: string;
    email: string;
    nome: string;
    role: string;
    cartorioId?: string | null;
    ativo: boolean;
    criadoEm?: any;
}

export const listarUsuarios = async (req: Request, res: Response) => {
    try {
        const listUsersResult = await auth.listUsers();
        const usersDocs = await db.collection('users').get();
        const usersMap = new Map<string, any>();
        usersDocs.docs.forEach(doc => usersMap.set(doc.id, doc.data()));

        const usuarios = listUsersResult.users.map(user => {
            const extra = usersMap.get(user.uid);
            return {
                uid: user.uid,
                email: user.email || '',
                nome: extra?.nome || user.displayName || '',
                role: extra?.role || (user.customClaims as any)?.role || 'usuario',
                cartorioId: extra?.cartorioId || (user.customClaims as any)?.cartorioId || null,
                ativo: extra?.ativo !== false,
                criadoEm: extra?.criadoEm || null,
            };
        });

        res.status(200).json(usuarios);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar usuários', error: (error as Error).message });
    }
};

export const listarCartorios = async (req: Request, res: Response) => {
    try {
        const snapshot = await db.collection('users').where('role', '==', 'cartorio').get();
        const cartorios = snapshot.docs.map(doc => ({
            uid: doc.id,
            nome: doc.data().nome,
            email: doc.data().email,
        }));
        res.status(200).json(cartorios);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar cartórios', error: (error as Error).message });
    }
};

export const criarUsuario = async (req: Request, res: Response) => {
    try {
        const { email, nome, role, cartorioId } = req.body;

        if (!email || !nome || !role) {
            return res.status(400).json({ message: 'Email, nome e role são obrigatórios.' });
        }

        const rolesValidos = ['admin', 'cartorio', 'escrevente', 'usuario'];
        if (!rolesValidos.includes(role)) {
            return res.status(400).json({ message: 'Role inválido.' });
        }

        const senhaTemporaria = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

        const userRecord = await auth.createUser({
            email,
            password: senhaTemporaria,
            displayName: nome,
        });

        const claims: any = { role };
        if (role === 'cartorio') {
            claims.cartorioId = userRecord.uid;
        } else if (cartorioId) {
            claims.cartorioId = cartorioId;
        }

        await auth.setCustomUserClaims(userRecord.uid, claims);

        await db.collection('users').doc(userRecord.uid).set({
            email,
            nome,
            role,
            cartorioId: claims.cartorioId || null,
            ativo: true,
            criadoEm: admin.firestore.Timestamp.now(),
        });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const firebaseLink = await auth.generatePasswordResetLink(email, {
            url: `${frontendUrl}/login`,
            handleCodeInApp: false,
        });
        const oobCodeMatch = firebaseLink.match(/oobCode=([^&]+)/);
        const oobCode = oobCodeMatch ? oobCodeMatch[1] : '';
        const resetLink = `${frontendUrl}/redefinir-senha?oobCode=${oobCode}`;
        await enviarEmail(email, nome, resetLink, 'convite');

        res.status(201).json({ message: 'Usuário criado e email enviado com sucesso.', email });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar usuário', error: (error as Error).message });
    }
};

export const completarCadastro = async (req: Request, res: Response) => {
    try {
        const { email, password, nome } = req.body;

        if (!email || !password || !nome) {
            return res.status(400).json({ message: 'Email, senha e nome são obrigatórios.' });
        }

        const pendingSnapshot = await db.collection('pendingUsers').where('email', '==', email).limit(1).get();

        let role = 'usuario';
        let cartorioId: string | null = null;

        if (!pendingSnapshot.empty) {
            const pendingData = pendingSnapshot.docs[0].data();
            role = pendingData.role || 'usuario';
            cartorioId = pendingData.cartorioId || null;
        }

        const userRecord = await auth.createUser({
            email,
            password,
            displayName: nome,
        });

        const claims: any = { role };
        if (role === 'cartorio') {
            claims.cartorioId = userRecord.uid;
            cartorioId = userRecord.uid;
        } else if (cartorioId) {
            claims.cartorioId = cartorioId;
        }

        await auth.setCustomUserClaims(userRecord.uid, claims);

        await db.collection('users').doc(userRecord.uid).set({
            email,
            nome,
            role,
            cartorioId: cartorioId || null,
            ativo: true,
            criadoEm: admin.firestore.Timestamp.now(),
        });

        const batch = db.batch();
        pendingSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        res.status(201).json({ message: 'Conta criada com sucesso.', uid: userRecord.uid });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao completar cadastro', error: (error as Error).message });
    }
};

export const atualizarUsuario = async (req: Request, res: Response) => {
    try {
        const { uid } = req.params;
        const { nome, role, cartorioId, ativo } = req.body;

        const docRef = db.collection('users').doc(uid);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        const dadosAtualizados: any = {};
        if (nome !== undefined) dadosAtualizados.nome = nome;
        if (role !== undefined) dadosAtualizados.role = role;
        if (cartorioId !== undefined) dadosAtualizados.cartorioId = cartorioId;
        if (ativo !== undefined) dadosAtualizados.ativo = ativo;

        await docRef.update(dadosAtualizados);

        const claims: any = {};
        if (role) claims.role = role;
        if (cartorioId) claims.cartorioId = cartorioId;
        if (role === 'cartorio') claims.cartorioId = uid;
        if (Object.keys(claims).length > 0) {
            await auth.setCustomUserClaims(uid, claims);
        }

        if (nome !== undefined) {
            await auth.updateUser(uid, { displayName: nome });
        }

        res.status(200).json({ message: 'Usuário atualizado com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar usuário', error: (error as Error).message });
    }
};

export const deletarUsuario = async (req: Request, res: Response) => {
    try {
        const { uid } = req.params;

        if (uid === req.user?.uid) {
            return res.status(400).json({ message: 'Não é possível excluir o próprio usuário.' });
        }

        await auth.deleteUser(uid);
        await db.collection('users').doc(uid).delete();

        res.status(200).json({ message: 'Usuário removido com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao remover usuário', error: (error as Error).message });
    }
};

export const recuperarSenha = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email é obrigatório.' });
        }

        try {
            const userRecord = await auth.getUserByEmail(email);
            const nome = userRecord.displayName || email;
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const firebaseLink = await auth.generatePasswordResetLink(email, {
                url: `${frontendUrl}/login`,
                handleCodeInApp: false,
            });
            const oobCodeMatch = firebaseLink.match(/oobCode=([^&]+)/);
            const oobCode = oobCodeMatch ? oobCodeMatch[1] : '';
            const resetLink = `${frontendUrl}/redefinir-senha?oobCode=${oobCode}`;
            await enviarEmail(email, nome, resetLink, 'reset');
        } catch (e) {
            return res.status(200).json({ message: 'Email de recuperação enviado com sucesso.' });
        }

        res.status(200).json({ message: 'Email de recuperação enviado com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao enviar email de recuperação', error: (error as Error).message });
    }
};

export const dashboardAdmin = async (req: Request, res: Response) => {
    try {
        const usersSnapshot = await db.collection('users').get();
        const usuarios = usersSnapshot.docs.map(doc => doc.data());

        const totalUsuarios = usuarios.length;
        const totalCartorios = usuarios.filter(u => u.role === 'cartorio').length;
        const totalEscreventes = usuarios.filter(u => u.role === 'escrevente').length;
        const totalAdmins = usuarios.filter(u => u.role === 'admin').length;

        const processosSnapshot = await db.collection('processos').get();
        const totalProcessos = processosSnapshot.size;

        const clientesSnapshot = await db.collection('clientes').get();
        const totalClientes = clientesSnapshot.size;

        const pendingSnapshot = await db.collection('pendingUsers').get();
        const totalPendentes = pendingSnapshot.size;

        res.status(200).json({
            totalUsuarios,
            totalCartorios,
            totalEscreventes,
            totalAdmins,
            totalProcessos,
            totalClientes,
            totalPendentes,
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao obter métricas', error: (error as Error).message });
    }
};