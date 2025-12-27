// Test script to verify video quality selection and naming fixes
async function testVideoQuality() {
  try {
    console.log('🧪 Testing video quality selection and naming fixes...');
    
    // Test 1080p video download
    const downloadResponse = await fetch('http://localhost:5000/api/downloads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://youtu.be/s39sk_e0mOI?feature=shared',
        format: 'mp4',
        quality: '1080p',
        downloadLocation: 'Downloads/Videos'
      })
    });
    
    const downloadResult = await downloadResponse.json();
    console.log('✅ Video Download Creation Result:', JSON.stringify(downloadResult, null, 2));
    
    if (downloadResult.id) {
      console.log(`\n🎥 Video download created with ID: ${downloadResult.id}`);
      console.log(`🎥 Format: ${downloadResult.format}`);
      console.log(`🎥 Quality: ${downloadResult.quality}`);
      console.log(`🎥 Status: ${downloadResult.status}`);
      console.log(`🎥 URL: https://youtu.be/s39sk_e0mOI?feature=shared`);
      
      console.log('\n⏳ Waiting for download to start processing...');
      
      // Wait and check the download status
      for (let i = 1; i <= 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        try {
          const statusResponse = await fetch(`http://localhost:5000/api/downloads/${downloadResult.id}`);
          const statusResult = await statusResponse.json();
          console.log(`\n📊 Download Status Check ${i}:`, JSON.stringify(statusResult, null, 2));
          
          if (statusResult.status === 'completed') {
            console.log('🎉 Video Download completed successfully!');
            console.log(`📁 File Path: ${statusResult.filePath}`);
            console.log(`📊 File Size: ${statusResult.fileSize}`);
            break;
          } else if (statusResult.status === 'failed') {
            console.log('❌ Video Download failed:', statusResult.errorMessage);
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

// Wait for server to start
setTimeout(() => {
  testVideoQuality();
}, 10000);
