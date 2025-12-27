// Test script for MP3 format handling
// Using built-in fetch API for ES modules

async function testMP3Format() {
  try {
    console.log('🧪 Testing MP3 format handling...');
    
    // Test the MP3 test endpoint
    const testResponse = await fetch('http://localhost:5000/api/test-mp3');
    const testResult = await testResponse.json();
    
    console.log('✅ MP3 Test Result:', JSON.stringify(testResult, null, 2));
    
    // Test actual MP3 download creation with user's specific URL
    console.log('\n🧪 Testing MP3 download creation with user URL...');
    const downloadResponse = await fetch('http://localhost:5000/api/downloads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://youtu.be/s39sk_e0mOI?feature=shared',
        format: 'mp3',
        quality: 'best',
        downloadLocation: 'Downloads/Videos'
      })
    });
    
    const downloadResult = await downloadResponse.json();
    console.log('✅ MP3 Download Creation Result:', JSON.stringify(downloadResult, null, 2));
    
    // Check if the download was created successfully
    if (downloadResult.id) {
      console.log(`\n🎵 MP3 download created with ID: ${downloadResult.id}`);
      console.log(`🎵 Format: ${downloadResult.format}`);
      console.log(`🎵 Quality: ${downloadResult.quality}`);
      console.log(`🎵 Status: ${downloadResult.status}`);
      console.log(`🎵 URL: https://youtu.be/s39sk_e0mOI?feature=shared`);
      
      // Wait a moment and check the download status
      setTimeout(async () => {
        try {
          const statusResponse = await fetch(`http://localhost:5000/api/downloads/${downloadResult.id}`);
          const statusResult = await statusResponse.json();
          console.log('\n📊 Download Status Update:', JSON.stringify(statusResult, null, 2));
        } catch (error) {
          console.error('❌ Failed to check download status:', error);
        }
      }, 2000);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testMP3Format();
