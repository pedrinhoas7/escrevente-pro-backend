import express from 'express';
import {
    listarClientes,
    criarCliente,
    obterCliente,
    atualizarCliente,
    deletarCliente
} from '../controllers/clienteController';
import { authenticate } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(authenticate); // Protege todas as rotas abaixo

router.get('/', listarClientes);
router.post('/', criarCliente);
router.get('/:id', obterCliente);
router.put('/:id', atualizarCliente);
router.delete('/:id', deletarCliente);

export default router;
