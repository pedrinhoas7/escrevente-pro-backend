import { Request, Response } from 'express';
import { db } from '../config/firebase';
import * as admin from 'firebase-admin';

// Interface Cliente
interface Cliente {
    id?: string;
    nome: string;
    cpf?: string; // Opcional
    telefone: string;
    email?: string; // Opcional
    endereco: string;
    criadoEm: admin.firestore.Timestamp;
    userId: string; 
}

export const listarClientes = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated.' });
        }
        const snapshot = await db.collection('clientes').where('userId', '==', userId).get();
        const clientes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(clientes);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar clientes', error: (error as Error).message });
    }
};

export const criarCliente = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated.' });
        }
        const novoCliente: Omit<Cliente, 'id'> = {
            ...req.body,
            criadoEm: admin.firestore.Timestamp.now(),
            userId: userId,
        };
        const docRef = await db.collection('clientes').add(novoCliente);
        res.status(201).json({ id: docRef.id, ...novoCliente });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar cliente', error: (error as Error).message });
    }
};

export const obterCliente = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.uid;
        const docRef = db.collection('clientes').doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Cliente não encontrado' });
        }

        const cliente = doc.data() as Cliente;

        if (cliente.userId !== userId) {
            return res.status(403).json({ message: 'Acesso negado.' });
        }

        res.status(200).json({ id: doc.id, ...cliente });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao obter cliente', error: (error as Error).message });
    }
};

export const atualizarCliente = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.uid;
        const docRef = db.collection('clientes').doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Cliente não encontrado' });
        }

        const cliente = doc.data() as Cliente;
        if (cliente.userId !== userId) {
            return res.status(403).json({ message: 'Acesso negado.' });
        }

        await docRef.update(req.body);
        res.status(200).json({ message: 'Cliente atualizado com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar cliente', error: (error as Error).message });
    }
};

export const deletarCliente = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.uid;
        const docRef = db.collection('clientes').doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Cliente não encontrado' });
        }

        const cliente = doc.data() as Cliente;
        if (cliente.userId !== userId) {
            return res.status(403).json({ message: 'Acesso negado.' });
        }

        await docRef.delete();
        res.status(200).json({ message: 'Cliente deletado com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar cliente', error: (error as Error).message });
    }
};
