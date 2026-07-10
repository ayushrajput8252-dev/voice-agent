import { createTalkVideo, getTalkStatus } from './src/lib/did/did-client';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const apiKey = process.env.DID_API_KEY;
  if (!apiKey) {
    console.error('No DID_API_KEY found in .env');
    return;
  }
  console.log('API key found, testing video creation...');
  const result = await createTalkVideo('Hello, this is a test!', apiKey);
  console.log('Create result:', result);
  
  if (result.success && result.talkId) {
    console.log('Video generation started. Checking status...');
    let status = await getTalkStatus(result.talkId, apiKey);
    console.log('Status:', status);
  }
}
test();
