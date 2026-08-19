import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import * as admin from 'firebase-admin';
import { db } from '../config/firebase';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const USER_ID = process.env.MIGRATION_USER_ID;
const DATA_FILE = path.resolve(__dirname, 'migration-data.json');

const TIPOS_ATO_PERMITIDOS = [
    'Ata Notarial',
    'Procuração',
    'Escritura de Compra e Venda',
    'Testamento',
    'Inventário e Partilha',
];

const STATUS_PERMITIDOS = [
    'Entrada',
    'Em análise',
    'Falta de documento',
    'Indeferido',
    'Aguardando assinatura',
    'Documentação entregue ao cliente',
    'Concluído / Registrado',
];

interface ClienteImport {
    nome: string;
    cpf?: string | null;
    telefone?: string | null;
    email?: string | null;
    endereco?: string | null;
}

interface ProcessoImport {
    clienteNome?: string;
    protocolo?: string;
    tipoAto: string;
    dataEntrada: string;
    partes: {
        outorganteVendedor?: string;
        outorganteComprador?: string;
        escrevente?: string;
        apresentante?: string;
    };
    valorProcesso?: number | null;
    valorEmolumentos?: number | null;
    notasInternas?: string;
    statusInicial?: string;
    observacaoStatus?: string;
}

interface MigrationData {
    clientes: ClienteImport[];
    processos: ProcessoImport[];
}

const normalizarNome = (nome: string): string =>
    (nome || '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const migrar = async () => {
    if (!USER_ID) {
        console.error('❌ MIGRATION_USER_ID não encontrado no .env');
        process.exit(1);
    }

    if (!fs.existsSync(DATA_FILE)) {
        console.error(`❌ Arquivo de dados não encontrado: ${DATA_FILE}`);
        process.exit(1);
    }

    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    const dados: MigrationData = JSON.parse(rawData);

    console.log(`\n🚀 Iniciando migration para userId: ${USER_ID}`);
    console.log(`   Clientes a importar: ${dados.clientes.length}`);
    console.log(`   Processos a importar: ${dados.processos.length}\n`);

    const mapaClientes: Map<string, string> = new Map();
    let clientesCriados = 0;
    let clientesPulados = 0;

    console.log('📋 Importando clientes...');

    const snapshotExistentes = await db.collection('clientes')
        .where('userId', '==', USER_ID)
        .get();
    for (const doc of snapshotExistentes.docs) {
        const nome = (doc.data() as any).nome as string;
        if (nome) {
            mapaClientes.set(normalizarNome(nome), doc.id);
        }
    }
    if (snapshotExistentes.size > 0) {
        console.log(`   ℹ️  ${snapshotExistentes.size} cliente(s) já existente(s) no Firestore pré-carregado(s)`);
    }

    for (const cliente of dados.clientes) {
        if (!cliente.nome) {
            console.warn('   ⚠️  Cliente sem nome - pulando');
            clientesPulados++;
            continue;
        }

        const nomeNormalizado = normalizarNome(cliente.nome);

        const existenteId = mapaClientes.get(nomeNormalizado);
        if (existenteId) {
            console.log(`   ⏭️  Cliente já existe: "${cliente.nome}" (ID: ${existenteId})`);
            clientesPulados++;
            continue;
        }

        const novoCliente = {
            nome: cliente.nome,
            cpf: cliente.cpf ?? '',
            telefone: cliente.telefone ?? '',
            email: cliente.email ?? '',
            endereco: cliente.endereco ?? '',
            criadoEm: admin.firestore.Timestamp.now(),
            userId: USER_ID,
        };

        const docRef = await db.collection('clientes').add(novoCliente);
        mapaClientes.set(nomeNormalizado, docRef.id);
        console.log(`   ✅ Cliente criado: "${cliente.nome}" (ID: ${docRef.id})`);
        clientesCriados++;
    }

    let processosCriados = 0;
    let processosPulados = 0;

    console.log('\n📋 Importando processos...');

    const protocolosExistentes: Set<string> = new Set();
    const snapshotProcExistentes = await db.collection('processos')
        .where('userId', '==', USER_ID)
        .get();
    for (const doc of snapshotProcExistentes.docs) {
        const protocolo = (doc.data() as any).protocolo as string;
        if (protocolo) {
            protocolosExistentes.add(protocolo);
        }
    }
    if (snapshotProcExistentes.size > 0) {
        console.log(`   ℹ️  ${snapshotProcExistentes.size} processo(s) já existente(s) no Firestore`);
    }

    for (const proc of dados.processos) {
        if (!TIPOS_ATO_PERMITIDOS.includes(proc.tipoAto)) {
            console.warn(`   ⚠️  Tipo de ato inválido: "${proc.tipoAto}" - pulando`);
            processosPulados++;
            continue;
        }

        const nomeApresentante = (proc.partes?.apresentante || '').trim() || (proc.clienteNome || '').trim();
        const nomeNormalizado = normalizarNome(nomeApresentante);
        let clienteId = mapaClientes.get(nomeNormalizado);

        if (!clienteId) {
            clienteId = mapaClientes.get(normalizarNome('Desconhecido'));
        }

        if (!clienteId) {
            console.warn(`   ⚠️  Cliente/apresentante "${nomeApresentante}" não encontrado para o processo ${proc.protocolo || 'sem protocolo'} - pulando`);
            processosPulados++;
            continue;
        }

        if (proc.protocolo && protocolosExistentes.has(proc.protocolo)) {
            console.log(`   ⏭️  Processo já existe: protocolo "${proc.protocolo}" - pulando`);
            processosPulados++;
            continue;
        }

        const novoProcesso: Record<string, any> = {
            protocolo: proc.protocolo || '',
            tipoAto: proc.tipoAto,
            dataEntrada: admin.firestore.Timestamp.fromDate(new Date(proc.dataEntrada)),
            partes: proc.partes || {},
            clienteId,
            notasInternas: proc.notasInternas || '',
            criadoEm: admin.firestore.Timestamp.now(),
            userId: USER_ID,
        };

        if (proc.valorProcesso != null) {
            novoProcesso.valorProcesso = Number(proc.valorProcesso);
        }
        if (proc.valorEmolumentos != null) {
            novoProcesso.valorEmolumentos = Number(proc.valorEmolumentos);
        }

        const procRef = await db.collection('processos').add(novoProcesso);

        const statusInicial = proc.statusInicial && STATUS_PERMITIDOS.includes(proc.statusInicial)
            ? proc.statusInicial
            : 'Entrada';

        await procRef.collection('statusProcesso').add({
            status: statusInicial,
            data: admin.firestore.Timestamp.now(),
            observacao: proc.observacaoStatus || 'Importação inicial.',
            registradoEm: admin.firestore.Timestamp.now(),
        });

        console.log(`   ✅ Processo criado: protocolo "${proc.protocolo}" - ${proc.tipoAto} (cliente: "${nomeApresentante}")`);
        processosCriados++;
    }

    console.log(`\n📊 Resumo da migration:`);
    console.log(`   Clientes  - Criados: ${clientesCriados} | Pulados: ${clientesPulados}`);
    console.log(`   Processos - Criados: ${processosCriados} | Pulados: ${processosPulados}`);
    console.log(`\n✅ Migration concluída!\n`);

    process.exit(0);
};

migrar().catch((error) => {
    console.error('\n❌ Erro fatal durante migration:', error);
    process.exit(1);
});