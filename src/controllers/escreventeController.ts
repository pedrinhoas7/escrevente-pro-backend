import { Request, Response } from 'express';
import { db, auth } from '../config/firebase';
import * as admin from 'firebase-admin';

interface Escrevente {
    uid: string;
    email: string;
    nome: string;
    cartorioId: string;
    ativo: boolean;
    criadoEm: admin.firestore.Timestamp;
}

const obterCartorioId = async (uid: string): Promise<string | null> => {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) return null;
    const data = userDoc.data();
    if (data?.role !== 'cartorio') return null;
    return data?.cartorioId || uid;
};

export const listarEscreventes = async (req: Request, res: Response) => {
    try {
        const uid = req.user?.uid;
        if (!uid) return res.status(401).json({ message: 'Não autenticado.' });

        const cartorioId = await obterCartorioId(uid);
        if (!cartorioId) return res.status(403).json({ message: 'Acesso negado. Apenas cartórios.' });

        const snapshot = await db.collection('users')
            .where('cartorioId', '==', cartorioId)
            .where('role', '==', 'escrevente')
            .get();

        const escreventes = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        res.status(200).json(escreventes);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar escreventes', error: (error as Error).message });
    }
};

export const criarEscrevente = async (req: Request, res: Response) => {
    try {
        const uid = req.user?.uid;
        if (!uid) return res.status(401).json({ message: 'Não autenticado.' });

        const cartorioId = await obterCartorioId(uid);
        if (!cartorioId) return res.status(403).json({ message: 'Acesso negado. Apenas cartórios.' });

        const { email, password, nome } = req.body;
        if (!email || !password || !nome) {
            return res.status(400).json({ message: 'Email, senha e nome são obrigatórios.' });
        }

        const userRecord = await auth.createUser({
            email,
            password,
            displayName: nome,
        });

        await auth.setCustomUserClaims(userRecord.uid, { role: 'escrevente', cartorioId });

        const novoEscrevente: Omit<Escrevente, 'uid'> = {
            email,
            nome,
            cartorioId,
            ativo: true,
            criadoEm: admin.firestore.Timestamp.now(),
        };

        await db.collection('users').doc(userRecord.uid).set({
            ...novoEscrevente,
            role: 'escrevente',
        });

        res.status(201).json({ uid: userRecord.uid, ...novoEscrevente });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar escrevente', error: (error as Error).message });
    }
};

export const atualizarEscrevente = async (req: Request, res: Response) => {
    try {
        const uid = req.user?.uid;
        if (!uid) return res.status(401).json({ message: 'Não autenticado.' });

        const cartorioId = await obterCartorioId(uid);
        if (!cartorioId) return res.status(403).json({ message: 'Acesso negado. Apenas cartórios.' });

        const escreventeUid = req.params.id;
        const docRef = db.collection('users').doc(escreventeUid);
        const doc = await docRef.get();

        if (!doc.exists) return res.status(404).json({ message: 'Escrevente não encontrado' });

        const data = doc.data();
        if (data?.cartorioId !== cartorioId || data?.role !== 'escrevente') {
            return res.status(403).json({ message: 'Acesso negado.' });
        }

        const { nome, ativo } = req.body;
        const dadosAtualizados: any = {};
        if (nome !== undefined) dadosAtualizados.nome = nome;
        if (ativo !== undefined) dadosAtualizados.ativo = ativo;

        await docRef.update(dadosAtualizados);

        if (nome !== undefined) {
            await auth.updateUser(escreventeUid, { displayName: nome });
        }

        res.status(200).json({ message: 'Escrevente atualizado com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar escrevente', error: (error as Error).message });
    }
};

export const deletarEscrevente = async (req: Request, res: Response) => {
    try {
        const uid = req.user?.uid;
        if (!uid) return res.status(401).json({ message: 'Não autenticado.' });

        const cartorioId = await obterCartorioId(uid);
        if (!cartorioId) return res.status(403).json({ message: 'Acesso negado. Apenas cartórios.' });

        const escreventeUid = req.params.id;
        const docRef = db.collection('users').doc(escreventeUid);
        const doc = await docRef.get();

        if (!doc.exists) return res.status(404).json({ message: 'Escrevente não encontrado' });

        const data = doc.data();
        if (data?.cartorioId !== cartorioId || data?.role !== 'escrevente') {
            return res.status(403).json({ message: 'Acesso negado.' });
        }

        await auth.deleteUser(escreventeUid);
        await docRef.delete();

        res.status(200).json({ message: 'Escrevente removido com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao remover escrevente', error: (error as Error).message });
    }
};

export const listarProcessosCartorio = async (req: Request, res: Response) => {
    try {
        const uid = req.user?.uid;
        if (!uid) return res.status(401).json({ message: 'Não autenticado.' });

        const cartorioId = await obterCartorioId(uid);
        if (!cartorioId) return res.status(403).json({ message: 'Acesso negado. Apenas cartórios.' });

        const usersSnapshot = await db.collection('users')
            .where('cartorioId', '==', cartorioId)
            .where('role', '==', 'escrevente')
            .get();

        const escreventeUids = usersSnapshot.docs.map(doc => doc.id);
        if (escreventeUids.length === 0) return res.status(200).json([]);

        const processosSnapshot = await db.collection('processos')
            .where('userId', 'in', escreventeUids)
            .orderBy('criadoEm', 'desc')
            .get();

        const processos = await Promise.all(
            processosSnapshot.docs.map(async (doc) => {
                const statusSnapshot = await db.collection('processos')
                    .doc(doc.id)
                    .collection('statusProcesso')
                    .orderBy('data', 'desc')
                    .get();

                const statusHistory = statusSnapshot.docs.map(s => ({ id: s.id, ...s.data() }));

                const escreventeDoc = usersSnapshot.docs.find(d => d.id === doc.data().userId);
                const escreventeNome = escreventeDoc?.data()?.nome || 'Desconhecido';

                let processoFormatado: any = {
                    id: doc.id,
                    ...doc.data(),
                    statusHistory,
                    escreventeNome,
                };

                if (processoFormatado.valorEmolumentos !== undefined) {
                    processoFormatado.comissaoApresentante = processoFormatado.valorEmolumentos * 0.30;
                    processoFormatado.comissaoEscrevente = processoFormatado.valorEmolumentos * 0.10;
                }

                return processoFormatado;
            })
        );

        res.status(200).json(processos);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar processos do cartório', error: (error as Error).message });
    }
};

export const listarClientesCartorio = async (req: Request, res: Response) => {
    try {
        const uid = req.user?.uid;
        if (!uid) return res.status(401).json({ message: 'Não autenticado.' });

        const cartorioId = await obterCartorioId(uid);
        if (!cartorioId) return res.status(403).json({ message: 'Acesso negado. Apenas cartórios.' });

        const usersSnapshot = await db.collection('users')
            .where('cartorioId', '==', cartorioId)
            .where('role', '==', 'escrevente')
            .get();

        const escreventeUids = usersSnapshot.docs.map(doc => doc.id);
        if (escreventeUids.length === 0) return res.status(200).json([]);

        const clientesSnapshot = await db.collection('clientes')
            .where('userId', 'in', escreventeUids)
            .get();

        const clientes = clientesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(clientes);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar clientes do cartório', error: (error as Error).message });
    }
};