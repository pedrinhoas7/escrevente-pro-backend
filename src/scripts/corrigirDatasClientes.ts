import dotenv from 'dotenv';
import path from 'path';
import * as admin from 'firebase-admin';
import { db } from '../config/firebase';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const USER_ID = process.env.MIGRATION_USER_ID;

const DatasPorCliente: Record<string, string> = {
    'TARCISIO': '2025-01-01',
    'ALESSA': '2025-01-01',
    'MARITIAM': '2025-03-01',
    'WANDERLEY': '2025-01-01',
    'MICHELLY': '2026-01-01',
    'JOSEPH': '2025-10-01',
    'Desconhecido': '2024-01-01',
    'JOSÉ VALDEREIS': '2026-01-01',
    'JOBSON': '2025-01-01',
    'DAIANE': '2026-03-01',
    'MAX': '2024-01-01',
    'BARBÁRA': '2024-01-01',
    'RONIO': '2024-01-01',
    'CLIENTE': '2026-07-01',
    'JENNIFER': '2026-04-01',
    'RUBENS': '2026-07-01',
    'JESSICA': '2026-07-01',
    'JOANA': '2026-01-01',
    'NADJA': '2024-01-01',
};

const normalizarNome = (nome: string): string =>
    (nome || '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const corrigirDatasClientes = async () => {
    if (!USER_ID) {
        console.error('❌ MIGRATION_USER_ID não encontrado no .env');
        process.exit(1);
    }

    console.log(`\n🔧 Corrigindo datas de clientes - userId: ${USER_ID}\n`);

    const snapshot = await db.collection('clientes')
        .where('userId', '==', USER_ID)
        .get();

    const mapaNormalizado: Map<string, string> = new Map();
    for (const [nome, data] of Object.entries(DatasPorCliente)) {
        mapaNormalizado.set(normalizarNome(nome), data);
    }

    let atualizados = 0;
    let pulados = 0;

    for (const doc of snapshot.docs) {
        const cliente = doc.data() as any;
        const nome = cliente.nome as string;
        const nomeNormalizado = normalizarNome(nome);
        const dataCorreta = mapaNormalizado.get(nomeNormalizado);

        if (!dataCorreta) {
            console.warn(`   ⚠️  Cliente "${nome}" sem data definida - pulando`);
            pulados++;
            continue;
        }

        const timestampCorreto = admin.firestore.Timestamp.fromDate(new Date(dataCorreta));

        await doc.ref.update({
            criadoEm: timestampCorreto,
        });

        console.log(`   ✅ Cliente "${nome}" - data atualizada para ${dataCorreta}`);
        atualizados++;
    }

    console.log(`\n📊 Resumo:`);
    console.log(`   Atualizados: ${atualizados}`);
    console.log(`   Pulados: ${pulados}`);
    console.log(`\n✅ Correção concluída!\n`);

    process.exit(0);
};

corrigirDatasClientes().catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
});