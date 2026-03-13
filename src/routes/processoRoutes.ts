import express from 'express';
import {
    listarProcessos,
    criarProcesso,
    obterProcesso,
    atualizarProcesso,
    adicionarStatus,
    removerStatus, // Adicionar esta linha
    consultarPorProtocolo,
    listarTiposAto
} from '../controllers/processoController';
import { authenticate } from '../middlewares/authMiddleware';

const router = express.Router();

// Rotas públicas
router.get('/consulta/:protocolo', consultarPorProtocolo);

// Rotas protegidas
router.use(authenticate);

router.get('/tipos-ato', listarTiposAto);
router.get('/', listarProcessos);
router.post('/', criarProcesso);
router.get('/:id', obterProcesso);
router.put('/:id', atualizarProcesso);
router.post('/:id/status', adicionarStatus);
router.delete('/:processoId/status/:statusId', removerStatus);

export default router;

