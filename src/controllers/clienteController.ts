import { Request, Response } from 'express';
import { db } from '../config/firebase';
import * as admin from 'firebase-admin';

// Interface Cliente
interface Cliente {
    id?: string;
    nome: string;
    cpf: string;
    telefone: string;
    email: string;
    endereco: string;
    criadoEm: admin.firestore.Timestamp;
}

export const listarClientes = async (req: Request, res: Response) => {
    try {
        const snapshot = await db.collection('clientes').get();
        const clientes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(clientes);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar clientes', error });
    }
};

export const criarCliente = async (req: Request, res: Response) => {
    try {
        const novoCliente: Cliente = {
            ...req.body,
            criadoEm: admin.firestore.Timestamp.now()
        };
        const docRef = await db.collection('clientes').add(novoCliente);
        res.status(201).json({ id: docRef.id, ...novoCliente });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar cliente', error });
    }
};

export const obterCliente = async (req: Request, res: Response) => {
    try {
        const doc = await db.collection('clientes').doc(req.params.id).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Cliente não encontrado' });
        }
        res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao obter cliente', error });
    }
};

export const atualizarCliente = async (req: Request, res: Response) => {
    try {
        await db.collection('clientes').doc(req.params.id).update(req.body);
        res.status(200).json({ message: 'Cliente atualizado com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar cliente', error });
    }
};

export const deletarCliente = async (req: Request, res: Response) => {
    try {
        await db.collection('clientes').doc(req.params.id).delete();
        res.status(200).json({ message: 'Cliente deletado com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar cliente', error });
    }
};
