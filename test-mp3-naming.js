// Test script to verify MP3 naming fixes
async function testMP3Naming() {
  try {
    console.log('🧪 Testing MP3 naming fixes...');
    
    // Test MP3 download with your specific URL
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
    
    if (downloadResult.id) {
      console.log(`\n🎵 MP3 download created with ID: ${downloadResult.id}`);
      console.log(`🎵 Format: ${downloadResult.format}`);
      console.log(`🎵 Quality: ${downloadResult.quality}`);
      console.log(`🎵 Status: ${downloadResult.status}`);
      console.log(`🎵 URL: https://youtu.be/s39sk_e0mOI?feature=shared`);
      
      console.log('\n⏳ Waiting for download to start processing...');
      
      // Wait and check the download status multiple times
      for (let i = 1; i <= 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 4000));
        try {
          const statusResponse = await fetch(`http://localhost:5000/api/downloads/${downloadResult.id}`);
          const statusResult = await statusResponse.json();
          console.log(`\n📊 Download Status Check ${i}:`, JSON.stringify(statusResult, null, 2));
          
          if (statusResult.status === 'completed') {
            console.log('🎉 MP3 Download completed successfully!');
            console.log(`📁 File Path: ${statusResult.filePath}`);
            console.log(`📊 File Size: ${statusResult.fileSize}`);
            
            // Check if the filename contains the video title
            if (statusResult.filePath && statusResult.filePath.includes('.mp3')) {
              const fileName = statusResult.filePath.split('\\').pop() || statusResult.filePath.split('/').pop();
              console.log(`📝 Filename: ${fileName}`);
              
              if (fileName && fileName !== '_.mp3' && fileName !== 'Unknown Title.mp3') {
                console.log('✅ SUCCESS: MP3 has proper filename!');
              } else {
                console.log('❌ FAILED: MP3 still has generic filename');
              }
            }
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

// Wait for server to start
setTimeout(() => {
  testMP3Naming();
}, 15000);
