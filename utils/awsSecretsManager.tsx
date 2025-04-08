import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import { formatError } from "@/lib/utils";

const configureAWS = () => {
    if (!AWS.config.credentials) {
        AWS.config.update({
            accessKeyId: process.env.AMPLIFY_AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AMPLIFY_AWS_SECRET_ACCESS_KEY,
            region: process.env.AMPLIFY_AWS_REGION || "ap-south-1",
        });
    }
    return new AWS.SecretsManager();
};

const secretsManager = configureAWS();;

export default async function getPrivateKey() {
    let privateKey = null;
    try {
        const data = await secretsManager.getSecretValue({ SecretId: "apay-private-key" }).promise();
        if (data.SecretString) {
            privateKey = data.SecretString;  // The private key in PEM format
        } else {
            privateKey = getPrivateKeyFromFile();
        }
    } catch (error) {
        console.warn("Error reading private key file: ", formatError(error));
        privateKey = getPrivateKeyFromFile();
    }
    return privateKey;
}

function getPrivateKeyFromFile() {
    console.log("Falling back to local private key file.");
    const keyPath = path.join(process.cwd(), 'tst', 'private.pem');
    return fs.readFileSync(keyPath, 'utf8');
}