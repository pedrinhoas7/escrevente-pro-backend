import dotenv from 'dotenv';
import path from 'path';
import * as admin from 'firebase-admin';
import { db } from '../config/firebase';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const USER_ID = process.env.MIGRATION_USER_ID;

const DatasPorProtocolo: Record<string, string> = {
    '1': '2026-03-03', '2': '2026-03-03', '3': '2026-03-05', '4': '2026-03-13',
    '5': '2026-03-17', '6': '2026-03-19', '7': '2026-03-26', '8': '2026-03-26',
    '9': '2026-03-27', '10': '2026-04-06', '11': '2026-04-24', '12': '2026-04-30',
    '13': '2026-04-30', '14': '2026-04-30', '15': '2026-05-04', '16': '2026-05-04',
    '17': '2026-05-04', '18': '2026-04-24', '19': '2026-04-09', '20': '2026-05-05',
    '21': '2026-05-11', '22': '2026-05-07', '23': '2026-05-12', '24': '2026-05-29',
    '25': '2026-06-01', '26': '2026-06-02', '27': '2026-06-08', '28': '2026-06-05',
    '29': '2026-06-02', '30': '2026-06-09', '31': '2026-06-10', '32': '2026-06-10',
    '33': '2026-07-08', '34': '2026-07-14', '35': '2026-07-15', '36': '2026-07-16',
    '37': '2026-07-20', '38': '2026-07-21', '39': '2026-07-22', '40': '2026-07-22',
    '41': '2026-07-24', '42': '2026-07-29', '43': '2026-07-29', '44': '2026-07-28',
    '45': '2026-08-03', '46': '2026-08-03', '47': '2026-08-03', '48': '2026-08-04',
    '49': '2026-08-06', '50': '2026-08-06', '51': '2026-08-07', '52': '2026-08-07',
    '53': '2026-08-11', '54': '2026-08-11', '55': '2026-08-11', '56': '2026-08-12',
    '57': '2026-08-12',
};

const corrigirDatas = async () => {
    if (!USER_ID) {
        console.error('❌ MIGRATION_USER_ID não encontrado no .env');
        process.exit(1);
    }

    console.log(`\n🔧 Corrigindo datas de processos para userId: ${USER_ID}\n`);

    const snapshot = await db.collection('processos')
        .where('userId', '==', USER_ID)
        .get();

    let atualizados = 0;
    let naoEncontrados = 0;

    for (const doc of snapshot.docs) {
        const proc = doc.data() as any;
        const protocolo = proc.protocolo as string;
        const dataCorreta = DatasPorProtocolo[protocolo];

        if (!dataCorreta) {
            console.warn(`   ⚠️  Protocolo "${protocolo}" não encontrado na tabela de datas - pulando`);
            naoEncontrados++;
            continue;
        }

        const timestampCorreto = admin.firestore.Timestamp.fromDate(new Date(dataCorreta));

        await doc.ref.update({
            criadoEm: timestampCorreto,
            dataEntrada: timestampCorreto,
        });

        console.log(`   ✅ Protocolo "${protocolo}" - data atualizada para ${dataCorreta}`);
        atualizados++;
    }

    console.log(`\n📊 Resumo:`);
    console.log(`   Atualizados: ${atualizados}`);
    console.log(`   Não encontrados: ${naoEncontrados}`);
    console.log(`\n✅ Correção concluída!\n`);

    process.exit(0);
};

corrigirDatas().catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
});