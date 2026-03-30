import axios from 'axios';

const url = 'https://in.pinterest.com/pin/492649954780713/';

async function testPinterest() {
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    });
    const html = res.data;
    
    // Look for og:image or pin:image
    const ogImage = html.match(/property="og:image"\s+content="([^"]+)"/);
    const pinImage = html.match(/name="pinterest:image:src"\s+content="([^"]+)"/);
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    
    console.log('OG Image:', ogImage ? ogImage[1] : 'Not found');
    console.log('Pin Image:', pinImage ? pinImage[1] : 'Not found');
    console.log('Title:', titleMatch ? titleMatch[1] : 'Not found');
    
    // Test for JSON-LD
    const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    if (jsonLdMatches) {
      jsonLdMatches.forEach((script, i) => {
        try {
          const content = script.replace(/<script type="application\/ld\+json">/, '').replace(/<\/script>/, '');
          const data = JSON.parse(content);
          console.log(`JSON-LD ${i}: type=${data['@type']}`);
          if (data.image) {
            console.log('Found image in JSON-LD:', typeof data.image === 'string' ? data.image : JSON.stringify(data.image));
          }
        } catch (e) {}
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPinterest();
