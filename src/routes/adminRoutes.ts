import express from 'express';
import {
    listarUsuarios,
    listarCartorios,
    criarUsuario,
    completarCadastro,
    atualizarUsuario,
    deletarUsuario,
    recuperarSenha,
    dashboardAdmin
} from '../controllers/adminController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/recuperar-senha', recuperarSenha);
router.post('/completar-cadastro', completarCadastro);

router.use(authenticate);
router.use(requireRole(['admin']));

router.get('/dashboard', dashboardAdmin);
router.get('/usuarios', listarUsuarios);
router.post('/usuarios', criarUsuario);
router.put('/usuarios/:uid', atualizarUsuario);
router.delete('/usuarios/:uid', deletarUsuario);
router.get('/cartorios', listarCartorios);

export default router;