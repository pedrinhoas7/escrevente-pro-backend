import dotenv from 'dotenv';
import path from 'path';
import * as admin from 'firebase-admin';
import { db } from '../config/firebase';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const USER_ID = process.env.MIGRATION_USER_ID;

const marcarConcluidos = async () => {
    if (!USER_ID) {
        console.error('❌ MIGRATION_USER_ID não encontrado no .env');
        process.exit(1);
    }

    console.log(`\n🔧 Marcando todos os processos como "Concluído / Registrado" - userId: ${USER_ID}\n`);

    const snapshot = await db.collection('processos')
        .where('userId', '==', USER_ID)
        .get();

    let atualizados = 0;

    for (const doc of snapshot.docs) {
        const proc = doc.data() as any;

        const statusSnapshot = await doc.ref
            .collection('statusProcesso')
            .where('status', '==', 'Concluído / Registrado')
            .limit(1)
            .get();

        if (!statusSnapshot.empty) {
            console.log(`   ⏭️  Protocolo "${proc.protocolo}" já consta como concluído`);
            continue;
        }

        const dataEntrada = proc.dataEntrada as admin.firestore.Timestamp;
        const dataStatus = dataEntrada || admin.firestore.Timestamp.now();

        await doc.ref.collection('statusProcesso').add({
            status: 'Concluído / Registrado',
            data: dataStatus,
            observacao: 'Concluído via migration.',
            registradoEm: admin.firestore.Timestamp.now(),
        });

        console.log(`   ✅ Protocolo "${proc.protocolo}" - marcado como concluído`);
        atualizados++;
    }

    console.log(`\n📊 Resumo:`);
    console.log(`   Atualizados: ${atualizados}`);
    console.log(`\n✅ Correção concluída!\n`);

    process.exit(0);
};

marcarConcluidos().catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
});