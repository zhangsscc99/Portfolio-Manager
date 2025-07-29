const axios = require('axios');

// Test AI API connection
async function testAIConnection() {
  const apiKey = "sk-18fcc076d5d746fea3c922d20aef7364";
  const baseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/";
  const endpoint = `${baseUrl}chat/completions`;

  console.log('🧪 Testing AI API Connection...');
  console.log(`📡 Endpoint: ${endpoint}`);
  console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...`);

  try {
    console.log('📤 Sending test request...');
    
    const response = await axios.post(endpoint, {
      model: "qwen-turbo-latest",
      messages: [
        {
          role: "user",
          content: "Hello, please respond with 'Connection successful' to confirm the API is working."
        }
      ],
      temperature: 0.7,
      max_tokens: 50
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ Connection Test Successful!');
    console.log('📊 Response Status:', response.status);
    console.log('🤖 AI Response:', response.data.choices[0].message.content);
    console.log('💰 Usage:', response.data.usage);
    
    return true;

  } catch (error) {
    console.log('❌ Connection Test Failed!');
    console.log('📊 Error Type:', error.code || 'Unknown');
    console.log('📝 Error Message:', error.message);
    
    if (error.response) {
      console.log('🌐 HTTP Status:', error.response.status);
      console.log('📄 Response Data:', JSON.stringify(error.response.data, null, 2));
    }
    
    // Common error analysis
    if (error.message.includes('ENOTFOUND')) {
      console.log('🔍 Analysis: DNS resolution failed - check internet connection');
    } else if (error.message.includes('timeout')) {
      console.log('🔍 Analysis: Request timeout - try increasing timeout or check network');
    } else if (error.response?.status === 401) {
      console.log('🔍 Analysis: Authentication failed - check API key');
    } else if (error.response?.status === 400) {
      console.log('🔍 Analysis: Bad request - check request format');
    }
    
    return false;
  }
}

// Run the test
if (require.main === module) {
  testAIConnection()
    .then(success => {
      console.log(success ? '\n🎉 Test completed successfully!' : '\n💥 Test failed!');
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('💥 Unexpected error:', err);
      process.exit(1);
    });
}

module.exports = { testAIConnection }; 