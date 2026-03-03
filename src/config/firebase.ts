import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs'; // Manter para o cenário local
import path from 'path'; // Manter para o cenário local

dotenv.config();

const config: admin.AppOptions = {
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
};

if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    let serviceAccountLoaded = false;
    let serviceAccount: any;

    // Tentar carregar como JSON direto (para Vercel)
    try {
        console.log("ℹ️  Tentando carregar Service Account como JSON direto da variável de ambiente...");
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        config.credential = admin.credential.cert(serviceAccount);
        serviceAccountLoaded = true;
        console.log(`✅ Service Account carregada como JSON do ambiente.`);
    } catch (jsonParseError: any) {
        console.warn(`\n⚠️  AVISO: Falha ao fazer parse da Service Account como JSON direto. Erro: ${jsonParseError.message}`);
        // Se falhar, tentar ler como arquivo (para ambiente local)
        try {
            console.log("ℹ️  Tentando carregar Service Account de um arquivo...");
            const absoluteServiceAccountPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
            const serviceAccountContent = fs.readFileSync(absoluteServiceAccountPath, 'utf8');
            serviceAccount = JSON.parse(serviceAccountContent);
            config.credential = admin.credential.cert(serviceAccount);
            serviceAccountLoaded = true;
            console.log(`✅ Service Account carregada de arquivo: ${absoluteServiceAccountPath}`);
        } catch (fileReadError: any) {
            console.warn(`\n⚠️  AVISO: Falha ao carregar Service Account do caminho: "${process.env.FIREBASE_SERVICE_ACCOUNT_PATH}"`);
            console.warn(`   Erro: ${fileReadError.message}`);
        }
    }

    if (!serviceAccountLoaded) {
        console.warn(`   Nenhuma Service Account válida foi carregada. Usando Application Default Credentials.\n`);
        config.credential = admin.credential.applicationDefault();
    }
} else {
    console.log("ℹ️  Variável FIREBASE_SERVICE_ACCOUNT_PATH não definida. Usando Application Default Credentials.");
    config.credential = admin.credential.applicationDefault();
}

// Inicializa o Firebase Admin SDK apenas uma vez
if (!admin.apps.length) {
    try {
        admin.initializeApp(config);
        console.log("🔥 Firebase Admin SDK inicializado.");

        // Log para verificar a origem da credencial em uso
        if (config.credential === admin.credential.applicationDefault()) {
            console.log("ℹ️  Usando Application Default Credentials.");
        } else {
            console.log("✅ Usando Service Account para autenticação.");
        }

    } catch (error: any) {
        console.error("❌ Erro fatal ao inicializar Firebase Admin:", error.message);
    }
}

export const db = admin.firestore();
export const auth = admin.auth();
