// Simple test to check MP3 download status
async function checkMP3Download() {
  try {
    console.log('🔍 Checking MP3 download status...');
    
    // Check the downloads list
    const response = await fetch('http://localhost:5000/api/downloads');
    const data = await response.json();
    
    console.log('📋 Current downloads:', data.downloads.length);
    
    // Find MP3 downloads
    const mp3Downloads = data.downloads.filter(d => d.format === 'mp3');
    console.log('🎵 MP3 downloads found:', mp3Downloads.length);
    
    mp3Downloads.forEach(download => {
      console.log(`\n🎵 MP3 Download ID: ${download.id}`);
      console.log(`   Status: ${download.status}`);
      console.log(`   Progress: ${download.progress}%`);
      console.log(`   URL: ${download.url}`);
      console.log(`   Format: ${download.format}`);
      console.log(`   Quality: ${download.quality}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

checkMP3Download();
