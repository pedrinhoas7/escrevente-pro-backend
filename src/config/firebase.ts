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

let serviceAccountLoaded = false;

// Tenta carregar a Service Account do JSON direto da variável de ambiente (Vercel)
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
        console.log("ℹ️  Tentando carregar Service Account de FIREBASE_SERVICE_ACCOUNT_JSON...");
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        config.credential = admin.credential.cert(serviceAccount);
        serviceAccountLoaded = true;
        console.log(`✅ Service Account carregada de FIREBASE_SERVICE_ACCOUNT_JSON.`);
    } catch (jsonParseError: any) {
        console.warn(`\n⚠️  AVISO: Falha ao fazer parse de FIREBASE_SERVICE_ACCOUNT_JSON. Erro: ${jsonParseError.message}`);
    }
}

// Se não carregou do JSON direto, tenta carregar de um arquivo (Local)
if (!serviceAccountLoaded && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
        console.log("ℹ️  FIREBASE_SERVICE_ACCOUNT_PATH está definido. Tentando carregar Service Account de um arquivo...");
        const absoluteServiceAccountPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        const serviceAccountContent = fs.readFileSync(absoluteServiceAccountPath, 'utf8');
        const serviceAccount = JSON.parse(serviceAccountContent);
        config.credential = admin.credential.cert(serviceAccount);
        serviceAccountLoaded = true;
        console.log(`✅ Service Account carregada de arquivo: ${absoluteServiceAccountPath}`);
    } catch (fileReadError: any) {
        console.warn(`\n⚠️  AVISO: Falha ao carregar Service Account do caminho: "${process.env.FIREBASE_SERVICE_ACCOUNT_PATH}"`);
        console.warn(`   Erro: ${fileReadError.message}`);
    }
}

// Fallback se nenhuma Service Account foi carregada
if (!serviceAccountLoaded) {
    console.log("ℹ️  Nenhuma Service Account válida foi carregada. Usando Application Default Credentials.");
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
