import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import clienteRoutes from './routes/clienteRoutes';
import processoRoutes from './routes/processoRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/processos', processoRoutes);

app.get('/', (req, res) => {
    res.send('Escrevente Pro API - Online');
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
