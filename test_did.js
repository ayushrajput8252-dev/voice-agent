const DID_API_BASE = 'https://api.d-id.com';
const DID_API_KEY = 'YXl1c2hyYWpwdXQ4MjUyQGdtYWlsLmNvbQ:E-qm3hV2DxGUDxO0T4NsJ';
const DEFAULT_AVATAR_IMAGE = 'https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function test() {
  console.log('Creating talk video...');
  const response = await fetch(`${DID_API_BASE}/talks`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${DID_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      source_url: DEFAULT_AVATAR_IMAGE,
      script: {
        type: 'text',
        input: 'Hello, testing the new avatar image.',
        provider: { type: 'microsoft', voice_id: 'en-US-JennyNeural' },
      },
      config: { stitch: true },
    })
  });
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Failed with status ${response.status}: ${errorBody}`);
    return;
  }

  const data = await response.json();
  console.log('Talk queued successfully with ID:', data.id);
  
  let status = 'created';
  let attempts = 0;
  
  while ((status === 'created' || status === 'started') && attempts < 20) {
    attempts++;
    console.log(`Polling status (attempt ${attempts})...`);
    await delay(3000);
    
    const pollResponse = await fetch(`${DID_API_BASE}/talks/${data.id}`, {
      headers: {
        'Authorization': `Basic ${DID_API_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    if (!pollResponse.ok) {
      console.error('Failed to poll status', pollResponse.status);
      break;
    }
    
    const pollData = await pollResponse.json();
    status = pollData.status;
    
    if (status === 'done') {
      console.log('Avatar generation SUCCESS! Video URL:', pollData.result_url);
      break;
    } else if (status === 'error' || status === 'rejected') {
      console.error('Avatar generation FAILED!', pollData);
      break;
    }
  }
}
test();
