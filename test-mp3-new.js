// New test script for MP3 format handling
// Using built-in fetch API for ES modules

async function testMP3Format() {
  try {
    console.log('🧪 Testing NEW MP3 download creation...');
    
    // Test actual MP3 download creation with user's specific URL
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
    console.log('✅ NEW MP3 Download Creation Result:', JSON.stringify(downloadResult, null, 2));
    
    // Check if the download was created successfully
    if (downloadResult.id) {
      console.log(`\n🎵 NEW MP3 download created with ID: ${downloadResult.id}`);
      console.log(`🎵 Format: ${downloadResult.format}`);
      console.log(`🎵 Quality: ${downloadResult.quality}`);
      console.log(`🎵 Status: ${downloadResult.status}`);
      console.log(`🎵 URL: https://youtu.be/s39sk_e0mOI?feature=shared`);
      
      console.log('\n⏳ Waiting for download to start processing...');
      
      // Wait and check the download status multiple times
      for (let i = 1; i <= 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        try {
          const statusResponse = await fetch(`http://localhost:5000/api/downloads/${downloadResult.id}`);
          const statusResult = await statusResponse.json();
          console.log(`\n📊 Download Status Check ${i}:`, JSON.stringify(statusResult, null, 2));
          
          if (statusResult.status === 'completed') {
            console.log('🎉 MP3 Download completed successfully!');
            break;
          } else if (statusResult.status === 'failed') {
            console.log('❌ MP3 Download failed:', statusResult.errorMessage);
            break;
          }
        } catch (error) {
          console.error(`❌ Failed to check download status (attempt ${i}):`, error);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testMP3Format();
