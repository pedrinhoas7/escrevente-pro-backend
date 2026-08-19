import dotenv from 'dotenv';
import path from 'path';
import * as admin from 'firebase-admin';
import { db } from '../config/firebase';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const USER_ID = process.env.MIGRATION_USER_ID;

const corrigirApresentantes = async () => {
    if (!USER_ID) {
        console.error('❌ MIGRATION_USER_ID não encontrado no .env');
        process.exit(1);
    }

    console.log(`\n🔧 Corrigindo apresentantes para ID do cliente - userId: ${USER_ID}\n`);

    const procSnapshot = await db.collection('processos')
        .where('userId', '==', USER_ID)
        .get();

    let atualizados = 0;
    let pulados = 0;

    for (const doc of procSnapshot.docs) {
        const proc = doc.data() as any;
        const clienteId = proc.clienteId as string;

        if (!clienteId) {
            console.warn(`   ⚠️  Processo "${proc.protocolo}" sem clienteId - pulando`);
            pulados++;
            continue;
        }

        const partes = proc.partes || {};
        if (partes.apresentante === clienteId) {
            pulados++;
            continue;
        }

        await doc.ref.update({
            partes: { ...partes, apresentante: clienteId },
        });

        console.log(`   ✅ Protocolo "${proc.protocolo}" - apresentante: "${partes.apresentante}" → "${clienteId}"`);
        atualizados++;
    }

    console.log(`\n📊 Resumo:`);
    console.log(`   Atualizados: ${atualizados}`);
    console.log(`   Já corretos: ${pulados}`);
    console.log(`\n✅ Correção concluída!\n`);

    process.exit(0);
};

corrigirApresentantes().catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
});