import dotenv from 'dotenv';
import path from 'path';
import { auth } from '../config/firebase';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const verificar = async () => {
    const email = 'pedrinhoas7@gmail.com';
    const user = await auth.getUserByEmail(email);
    console.log('UID:', user.uid);
    console.log('Email:', user.email);
    console.log('Custom Claims:', JSON.stringify(user.customClaims));
};

verificar();