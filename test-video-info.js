// Test script to verify video info extraction fixes
async function testVideoInfo() {
  try {
    console.log('🧪 Testing video info extraction fixes...');
    
    // Test video info extraction with your specific URL
    const infoResponse = await fetch('http://localhost:5000/api/video-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://youtu.be/M-waCQC4xDQ?feature=shared'
      })
    });
    
    const infoResult = await infoResponse.json();
    console.log('✅ Video Info Extraction Result:', JSON.stringify(infoResult, null, 2));
    
    if (infoResult.title) {
      console.log(`\n🎥 Video Info Extracted Successfully!`);
      console.log(`🎥 Title: ${infoResult.title}`);
      console.log(`🎥 Platform: ${infoResult.platform}`);
      console.log(`🎥 Duration: ${infoResult.duration || 'Unknown'}`);
      console.log(`🎥 Thumbnail: ${infoResult.thumbnail || 'None'}`);
      
      // Check if we got a proper title instead of generic one
      if (infoResult.title && 
          infoResult.title !== 'Unknown Title' && 
          !infoResult.title.includes('YouTube_Video_') &&
          !infoResult.title.includes('Unknown Title')) {
        console.log('✅ SUCCESS: Got actual video title!');
      } else {
        console.log('❌ FAILED: Still getting generic title');
      }
      
      // Check if we got a thumbnail
      if (infoResult.thumbnail && infoResult.thumbnail !== 'NA') {
        console.log('✅ SUCCESS: Got video thumbnail!');
      } else {
        console.log('❌ FAILED: No thumbnail extracted');
      }
    } else {
      console.log('❌ No video info extracted');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Wait for server to start
setTimeout(() => {
  testVideoInfo();
}, 15000);
