// Simple test to see what yt-dlp returns for title extraction
import { spawn } from 'child_process';

async function testYtDlpTitle() {
  try {
    console.log('🧪 Testing yt-dlp title extraction directly...');
    
    const url = 'https://youtu.be/M-waCQC4xDQ?feature=shared';
    const args = [
      '--print', '%(title)s',
      '--print', '%(extractor)s',
      '--print', '%(duration)s',
      '--print', '%(thumbnail)s',
      '--no-playlist',
      '--no-warnings',
      '--quiet',
      url
    ];
    
    console.log(`🔍 Running: yt-dlp ${args.join(' ')}`);
    
    const ytdlp = spawn('yt-dlp', args);
    let output = '';
    let errorOutput = '';
    
    ytdlp.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ytdlp.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    ytdlp.on('close', (code) => {
      console.log(`\n🏁 yt-dlp finished with code: ${code}`);
      console.log(`📝 Raw output: "${output.trim()}"`);
      console.log(`📝 Error output: "${errorOutput.trim()}"`);
      
      if (output.trim()) {
        const lines = output.trim().split('\n');
        console.log(`\n🔍 Parsed lines:`);
        lines.forEach((line, index) => {
          console.log(`  Line ${index}: "${line}"`);
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testYtDlpTitle();
