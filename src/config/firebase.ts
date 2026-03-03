import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs'; // Importa o módulo fs

// Carrega .env do diretório de trabalho atual (process.cwd())
dotenv.config();

const config: admin.AppOptions = {
    // Credenciais iniciais, serão sobrescritas se a Service Account for carregada
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
};

// Tenta carregar a Service Account se o caminho estiver definido no .env
if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
        // Constrói o caminho absoluto para a Service Account JSON via concatenação simples
        const absoluteServiceAccountPath = `${process.cwd()}/${process.env.FIREBASE_SERVICE_ACCOUNT_PATH}`;
        
        // Lê o arquivo JSON diretamente e faz o parse
        const serviceAccountContent = fs.readFileSync(absoluteServiceAccountPath, 'utf8');
        const serviceAccount = JSON.parse(serviceAccountContent);

        config.credential = admin.credential.cert(serviceAccount);
        console.log(`✅ Service Account carregada de: ${absoluteServiceAccountPath}`);
    } catch (error: any) {
        console.warn(`\n⚠️  AVISO: Não foi possível carregar a Service Account do caminho: "${process.env.FIREBASE_SERVICE_ACCOUNT_PATH}"`);
        console.warn(`   Erro: ${error.message}`);
        console.warn(`   O sistema tentará usar as credenciais padrão (Application Default Credentials).\n`);
        // Garante que o fallback para ADC seja explícito em caso de falha
        config.credential = admin.credential.applicationDefault();
    }
} else {
    console.log("ℹ️  Variável FIREBASE_SERVICE_ACCOUNT_PATH não definida. Usando Application Default Credentials.");
    // Garante que o fallback para ADC seja explícito
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
