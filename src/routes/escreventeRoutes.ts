import express from 'express';
import {
    listarEscreventes,
    criarEscrevente,
    atualizarEscrevente,
    deletarEscrevente,
    listarProcessosCartorio,
    listarClientesCartorio
} from '../controllers/escreventeController';
import { authenticate } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(authenticate);

router.get('/', listarEscreventes);
router.post('/', criarEscrevente);
router.put('/:id', atualizarEscrevente);
router.delete('/:id', deletarEscrevente);
router.get('/processos', listarProcessosCartorio);
router.get('/clientes', listarClientesCartorio);

export default router;