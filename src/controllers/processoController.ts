import { Request, Response } from 'express';
import { db } from '../config/firebase';
import * as admin from 'firebase-admin';

// Interfaces
interface Partes {
    outorganteVendedor: string;
    outorganteComprador: string;
    escrevente: string;
    apresentante: string;
}

interface Processo {
    id?: string;
    protocolo: string;
    titulo: string;
    tipoAto: string;
    dataEntrada: admin.firestore.Timestamp;
    partes: Partes;
    clienteId: string;
    notasInternas: string;
    criadoEm: admin.firestore.Timestamp;
}

// Status permitidos
const STATUS_PERMITIDOS = [
    "Entrada",
    "Em análise",
    "Falta de documento",
    "Indeferido",
    "Aguardando assinatura",
    "Documentação entregue ao cliente",
    "Concluído / Registrado"
];

export const listarProcessos = async (req: Request, res: Response) => {
    try {
        const snapshot = await db.collection('processos').orderBy('criadoEm', 'desc').get();

        // Busca o status de cada processo em paralelo
        const processos = await Promise.all(
            snapshot.docs.map(async (doc) => {
                const statusSnapshot = await db
                    .collection('processos')
                    .doc(doc.id)                   
                    .collection('statusProcesso')
                    .orderBy('data', 'desc')
                    .get();

                const statusHistory = statusSnapshot.docs.map(s => ({
                    id: s.id,
                    ...s.data()
                }));

                return {
                    id: doc.id,
                    ...doc.data(),
                    statusHistory        
                };
            })
        );

        res.status(200).json(processos);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar processos', error: (error as Error).message });
    }
};

export const criarProcesso = async (req: Request, res: Response) => {
    try {
        const novoProcesso: Processo = {
            ...req.body,
            criadoEm: admin.firestore.Timestamp.now(),
            dataEntrada: admin.firestore.Timestamp.fromDate(new Date(req.body.dataEntrada)) // Converte string para Timestamp
        };
        const docRef = await db.collection('processos').add(novoProcesso);
        
        // Criar status inicial "Entrada"
        await docRef.collection('statusProcesso').add({
            status: "Entrada",
            data: admin.firestore.Timestamp.now(),
            observacao: "Processo iniciado.",
            registradoEm: admin.firestore.Timestamp.now()
        });

        res.status(201).json({ id: docRef.id, ...novoProcesso });
    } catch (error) {
        console.error('Erro ao criar processo:', (error as Error).message);
        res.status(500).json({ message: 'Erro ao criar processo', error: (error as Error).message });
    }
};

export const obterProcesso = async (req: Request, res: Response) => {
    try {
        const doc = await db.collection('processos').doc(req.params.id).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Processo não encontrado' });
        }
        const processo = { id: doc.id, ...doc.data() };
        
        // Buscar status
        const statusSnapshot = await db.collection('processos').doc(req.params.id).collection('statusProcesso').orderBy('data', 'desc').get();
        const statusHistory = statusSnapshot.docs.map(s => ({ id: s.id, ...s.data() }));

        res.status(200).json({ ...processo, statusHistory });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao obter processo', error: (error as Error).message });
    }
};

export const atualizarProcesso = async (req: Request, res: Response) => {
    try {
        await db.collection('processos').doc(req.params.id).update(req.body);
        res.status(200).json({ message: 'Processo atualizado com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar processo', error: (error as Error).message });
    }
};

// Adicionar Status (Append-only)
export const adicionarStatus = async (req: Request, res: Response) => {
    const { status, observacao } = req.body;
    const { id } = req.params;

    if (!STATUS_PERMITIDOS.includes(status)) {
        return res.status(400).json({ message: 'Status inválido.' });
    }

    if ((status === "Falta de documento" || status === "Indeferido") && !observacao) {
        return res.status(400).json({ message: 'Observação é obrigatória para este status.' });
    }

    try {
        const novoStatus = {
            status,
            data: admin.firestore.Timestamp.now(),
            observacao: observacao || "",
            registradoEm: admin.firestore.Timestamp.now()
        };

        await db.collection('processos').doc(id).collection('statusProcesso').add(novoStatus);
        res.status(201).json(novoStatus);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao adicionar status', error: (error as Error).message });
    }
};

// Consulta Pública por Protocolo
export const consultarPorProtocolo = async (req: Request, res: Response) => {
    const { protocolo } = req.params;

    try {
        const snapshot = await db.collection('processos').where('protocolo', '==', protocolo).limit(1).get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'Processo não encontrado.' });
        }

        const doc = snapshot.docs[0];
        const processo = { id: doc.id, ...doc.data() };
        
        // Remover dados sensíveis para consulta pública se necessário (ex: notasInternas)
        const { notasInternas, ...processoPublico } = processo as any;

        // Buscar status
        const statusSnapshot = await db.collection('processos').doc(doc.id).collection('statusProcesso').orderBy('data', 'desc').get();
        const statusHistory = statusSnapshot.docs.map(s => ({ id: s.id, ...s.data() }));

        res.status(200).json({ ...processoPublico, statusHistory });
    } catch (error) {
        console.error('Erro na consulta pública:', (error as Error).message);
        res.status(500).json({ message: 'Erro na consulta pública', error: (error as Error).message });
    }
};
