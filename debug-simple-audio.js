// Simple audio test script
// Run this in console to test if the file protocol works

console.log('🧪 Simple Audio Protocol Test');
console.log('==============================');

if (window.electronAPI) {
  window.electronAPI.getTracks().then(tracks => {
    if (tracks.length > 0) {
      const testTrack = tracks[0];
      console.log('🎵 Testing track:', testTrack.title);
      console.log('📁 File path:', testTrack.path);
      
      // Build the same URL the app uses
      const buildFileUrl = (p) => {
        const normalized = p.replace(/\\/g, '/');
        const isWindowsDrive = /^[A-Za-z]:\//.test(normalized);
        let pathPortion = encodeURI(normalized);
        
        if (isWindowsDrive) {
          if (!pathPortion.startsWith('/')) pathPortion = '/' + pathPortion;
          return `spicezify-file://${pathPortion}`;
        }
        
        if (normalized.startsWith('/')) {
          return `spicezify-file://${pathPortion}`;
        }
        
        return `spicezify-file:///${pathPortion}`;
      };
      
      const url = buildFileUrl(testTrack.path);
      console.log('🌐 Generated URL:', url);
      
      // Test if we can create and play audio manually
      const testAudio = document.createElement('audio');
      testAudio.controls = true;
      testAudio.preload = 'auto';
      testAudio.src = url;
      
      console.log('🔊 Created test audio element');
      console.log('   - src:', testAudio.src);
      console.log('   - readyState:', testAudio.readyState);
      
      testAudio.addEventListener('loadstart', () => console.log('✅ loadstart'));
      testAudio.addEventListener('loadeddata', () => console.log('✅ loadeddata'));
      testAudio.addEventListener('canplay', () => console.log('✅ canplay'));
      testAudio.addEventListener('canplaythrough', () => console.log('✅ canplaythrough'));
      testAudio.addEventListener('error', (e) => {
        console.log('❌ error:', e.target.error);
      });
      
      // Add to page temporarily so you can see/test it
      testAudio.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 9999;';
      document.body.appendChild(testAudio);
      
      console.log('🎮 Added test audio player to top-right of page');
      console.log('   - Try clicking play on it!');
      
      // Auto-remove after 30 seconds
      setTimeout(() => {
        if (document.body.contains(testAudio)) {
          document.body.removeChild(testAudio);
          console.log('🧹 Removed test audio player');
        }
      }, 30000);
      
    } else {
      console.log('❌ No tracks found');
    }
  });
} else {
  console.log('❌ ElectronAPI not available');
}
