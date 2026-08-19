import dotenv from 'dotenv';
import path from 'path';
import * as admin from 'firebase-admin';
import { db } from '../config/firebase';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const USER_ID = process.env.MIGRATION_USER_ID;

const removerStatusEntrada = async () => {
    if (!USER_ID) {
        console.error('❌ MIGRATION_USER_ID não encontrado no .env');
        process.exit(1);
    }

    console.log(`\n🔧 Removendo status "Entrada" para que "Concluído / Registrado" seja o atual - userId: ${USER_ID}\n`);

    const snapshot = await db.collection('processos')
        .where('userId', '==', USER_ID)
        .get();

    let removidos = 0;

    for (const doc of snapshot.docs) {
        const proc = doc.data() as any;

        const statusSnapshot = await doc.ref
            .collection('statusProcesso')
            .where('status', '==', 'Entrada')
            .get();

        if (statusSnapshot.empty) {
            continue;
        }

        for (const statusDoc of statusSnapshot.docs) {
            await statusDoc.ref.delete();
        }

        const restantes = await doc.ref.collection('statusProcesso').orderBy('data', 'desc').limit(1).get();
        const atual = restantes.docs[0]?.data() as any;

        console.log(`   ✅ Protocolo "${proc.protocolo}" - "Entrada" removido | status atual: "${atual?.status || 'nenhum'}"`);
        removidos++;
    }

    console.log(`\n📊 Resumo:`);
    console.log(`   Processos com "Entrada" removido: ${removidos}`);
    console.log(`\n✅ Correção concluída!\n`);

    process.exit(0);
};

removerStatusEntrada().catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
});