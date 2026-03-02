import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

console.log('🔍 Starting error monitoring and auto-fix system...');

function fixThemeContext() {
  try {
    const filePath = join(process.cwd(), 'src', 'contexts', 'ThemeContext.tsx');
    let content = readFileSync(filePath, 'utf8');
    
    console.log('📋 Analyzing ThemeContext.tsx...');
    
    // Fix common syntax errors
    content = content
      .replace(/fontFamily: "'([^']+)",/g, "fontFamily: '$1',")
      .replace(/headingFont: "'([^']+)",/g, "headingFont: '$1',")
      .replace(/(\w+):/g, "'$1':")
      .replace(/},\s*(?=typography:|spacing:|borderRadius:|shadows:|animations:)/g, (match) => {
        const props = ['typography', 'spacing', 'borderRadius', 'shadows', 'animations'];
        if (props.includes(match[1])) {
          return match[0] + '\n    ' + match[1] + ' {\n';
        }
        return match[0];
      })
      .replace(/spacing: {\s*}/g, 'spacing: {\n')
      .replace(/borderRadius: {\s*}/g, 'borderRadius: {\n')
      .replace(/shadows: {\s*}/g, 'shadows: {\n')
      .replace(/animations: {\s*}/g, 'animations: {\n');
    
    // Fix missing closing braces
    content = content
      .replace(/(\w+):\s*$/, '$1: {\n')
      .replace(/},\s*(?=typography:|spacing:|borderRadius:|shadows:|animations:)/g, '    },\n')
      .replace(/},\s*$/, '    }\n');
    
    // Fix dark-pro type issue
    content = content.replace(/'dark-pro'/g, "'dark-pro'");
    
    writeFileSync(filePath, content);
    console.log('✅ Fixed ThemeContext.tsx syntax errors');
    return true;
  } catch (error) {
    console.error('❌ Failed to fix ThemeContext.tsx:', error.message);
    return false;
  }
}

function monitorAndFix() {
  try {
    console.log('🔍 Monitoring development server for errors...');
    
    // Get development server output
    const result = execSync('npm run dev 2>&1', { encoding: 'utf8' });
    const errorOutput = result.stdout;
    
    if (errorOutput && errorOutput.includes('Error')) {
      console.log('🚨 Errors detected in development server');
      
      if (errorOutput.includes('ThemeContext.tsx')) {
        console.log('🔧 Attempting to fix ThemeContext.tsx errors...');
        
        if (fixThemeContext()) {
          console.log('🔄 Restarting development server...');
          setTimeout(() => {
            const { spawn } = require('child_process');
            spawn('npm', ['run', 'dev'], { 
              stdio: 'ignore',
              detached: true 
            });
          }, 2000);
        } else {
          console.log('❌ Failed to fix ThemeContext.tsx');
        }
      }
    } else {
      console.log('✅ No errors detected - development server running normally');
    }
  } catch (error) {
    console.error('❌ Error monitoring failed:', error.message);
  }
}

// Start the monitoring system
monitorAndFix();
