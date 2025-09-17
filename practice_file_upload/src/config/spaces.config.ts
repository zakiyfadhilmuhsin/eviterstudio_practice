import { registerAs } from '@nestjs/config';

export default registerAs('spaces', () => ({
    endpoint: process.env.SPACES_ENDPOINT || 'https://fra1.digitaloceanspaces.com',
    accessKeyId: process.env.SPACES_ACCESS_KEY,
    secretAccessKey: process.env.SPACES_SECRET_KEY,
    bucket: process.env.SPACES_BUCKET,
    region: process.env.SPACES_REGION || 'fra1',
}));