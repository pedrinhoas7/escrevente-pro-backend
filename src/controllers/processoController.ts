import { Request, Response } from 'express';
import { db } from '../config/firebase';
import * as admin from 'firebase-admin';

// Interfaces
interface Partes {
    outorganteVendedor?: string;
    outorganteComprador?: string;
    escrevente?: string;
    apresentante?: string;
}

interface Processo {
    id?: string;
    protocolo?: string; // Opcional
    tipoAto: string;
    dataEntrada: admin.firestore.Timestamp;
    partes: Partes;
    clienteId: string;
    notasInternas?: string;
    valorProcesso?: number;
    valorEmolumentos?: number;
    criadoEm: admin.firestore.Timestamp;
    userId: string; 
}

// Tipos de Ato permitidos
const TIPOS_ATO_PERMITIDOS = [
    "Ata Notarial",
    "Procuração",
    "Escritura de Compra e Venda",
    "Testamento",
    "Inventário e Partilha"
];

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

export const listarTiposAto = (req: Request, res: Response) => {
    res.status(200).json(TIPOS_ATO_PERMITIDOS);
};

export const listarProcessos = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated.' });
        }
        const snapshot = await db.collection('processos')
            .where('userId', '==', userId)
            .orderBy('criadoEm', 'desc')
            .get();

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

                let processoFormatado: any = {
                    id: doc.id,
                    ...doc.data(),
                    statusHistory        
                };

                if (processoFormatado.valorEmolumentos !== undefined) {
                    const comissaoApresentante = processoFormatado.valorEmolumentos * 0.30;
                    const comissaoEscrevente = processoFormatado.valorEmolumentos * 0.10;
                    processoFormatado = {
                        ...processoFormatado,
                        comissaoApresentante,
                        comissaoEscrevente,
                    };
                }
                return processoFormatado;
            })
        );

        res.status(200).json(processos);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar processos', error: (error as Error).message });
    }
};

export const criarProcesso = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated.' });
        }
        const { tipoAto, dataEntrada, valorProcesso, valorEmolumentos, ...rest } = req.body;

        if (!TIPOS_ATO_PERMITIDOS.includes(tipoAto)) {
            return res.status(400).json({ message: 'Tipo de Ato inválido.' });
        }

        const novoProcesso: Omit<Processo, 'id'> = {
            ...rest,
            tipoAto,
            dataEntrada: admin.firestore.Timestamp.fromDate(new Date(dataEntrada)),
            valorProcesso: valorProcesso ? Number(valorProcesso) : undefined,
            valorEmolumentos: valorEmolumentos ? Number(valorEmolumentos) : undefined,
            criadoEm: admin.firestore.Timestamp.now(),
            userId: userId,
        };
        const docRef = await db.collection('processos').add(novoProcesso);
        
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
        const userId = req.user?.uid;
        const docRef = db.collection('processos').doc(req.params.id);
        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Processo não encontrado' });
        }
        
        const processo = doc.data() as Processo;
        if (processo.userId !== userId) {
            return res.status(403).json({ message: 'Acesso negado.' });
        }

        const statusSnapshot = await docRef.collection('statusProcesso').orderBy('data', 'desc').get();
        const statusHistory = statusSnapshot.docs.map(s => ({ id: s.id, ...s.data() }));

        let processoFormatado: any = { id: doc.id, ...processo, statusHistory };

        // Adicionar informações de comissão apenas para escreventes logados
        if (processo.valorEmolumentos !== undefined) {
            const comissaoApresentante = processo.valorEmolumentos * 0.30;
            const comissaoEscrevente = processo.valorEmolumentos * 0.10;
            processoFormatado = {
                ...processoFormatado,
                comissaoApresentante,
                comissaoEscrevente,
            };
        }

        res.status(200).json(processoFormatado);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao obter processo', error: (error as Error).message });
    }
};

export const atualizarProcesso = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.uid;
        const docRef = db.collection('processos').doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Processo não encontrado' });
        }

        const processo = doc.data() as Processo;
        if (processo.userId !== userId) {
            return res.status(403).json({ message: 'Acesso negado.' });
        }

        const { tipoAto, dataEntrada, valorProcesso, valorEmolumentos, ...rest } = req.body;

        const dadosAtualizados: Partial<Processo> = {
            ...rest,
            ...(tipoAto && { tipoAto }),
            ...(dataEntrada && { dataEntrada: admin.firestore.Timestamp.fromDate(new Date(dataEntrada)) }),
            ...(valorProcesso !== undefined && { valorProcesso: Number(valorProcesso) }),
            ...(valorEmolumentos !== undefined && { valorEmolumentos: Number(valorEmolumentos) }),
        };

        await docRef.update(dadosAtualizados);
        res.status(200).json({ message: 'Processo atualizado com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar processo', error: (error as Error).message });
    }
};

export const adicionarStatus = async (req: Request, res: Response) => {
    const { status, observacao } = req.body;
    const { id } = req.params;
    const userId = req.user?.uid;

    if (!STATUS_PERMITIDOS.includes(status)) {
        return res.status(400).json({ message: 'Status inválido.' });
    }

    if ((status === "Falta de documento" || status === "Indeferido") && !observacao) {
        return res.status(400).json({ message: 'Observação é obrigatória para este status.' });
    }

    try {
        const docRef = db.collection('processos').doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Processo não encontrado' });
        }
        const processo = doc.data() as Processo;
        if (processo.userId !== userId) {
            return res.status(403).json({ message: 'Acesso negado.' });
        }

        const novoStatus = {
            status,
            data: admin.firestore.Timestamp.now(),
            observacao: observacao || "",
            registradoEm: admin.firestore.Timestamp.now()
        };

        await docRef.collection('statusProcesso').add(novoStatus);
        res.status(201).json(novoStatus);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao adicionar status', error: (error as Error).message });
    }
};

export const consultarPorProtocolo = async (req: Request, res: Response) => {
    const { protocolo } = req.params;

    try {
        const snapshot = await db.collection('processos').where('protocolo', '==', protocolo).limit(1).get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'Processo não encontrado.' });
        }

        const doc = snapshot.docs[0];
        const processo = { id: doc.id, ...doc.data() };
        
        const { notasInternas, userId, ...processoPublico } = processo as any;

        const statusSnapshot = await db.collection('processos').doc(doc.id).collection('statusProcesso').orderBy('data', 'desc').get();
        const statusHistory = statusSnapshot.docs.map(s => ({ id: s.id, ...s.data() }));

        res.status(200).json({ ...processoPublico, statusHistory });
    } catch (error) {
        console.error('Erro na consulta pública:', (error as Error).message);
        res.status(500).json({ message: 'Erro na consulta pública', error: (error as Error).message });
    }
};

export const removerStatus = async (req: Request, res: Response) => {
    const { processoId, statusId } = req.params;
    const userId = req.user?.uid;

    try {
        const processoRef = db.collection('processos').doc(processoId);
        const processoDoc = await processoRef.get();

        if (!processoDoc.exists) {
            return res.status(404).json({ message: 'Processo não encontrado.' });
        }

        const processo = processoDoc.data() as Processo;
        if (processo.userId !== userId) {
            return res.status(403).json({ message: 'Acesso negado.' });
        }

        const statusRef = processoRef.collection('statusProcesso').doc(statusId);
        await statusRef.delete();

        res.status(200).json({ message: 'Status removido com sucesso.' });
    } catch (error) {
        console.error('Erro ao remover status:', (error as Error).message);
        res.status(500).json({ message: 'Erro ao remover status', error: (error as Error).message });
    }
};
