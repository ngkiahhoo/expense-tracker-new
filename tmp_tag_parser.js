const fs = require('fs');
const text = fs.readFileSync('src/app/assets/page.tsx', 'utf8');
const lines = text.split(/\r?\n/);
const tagRe = /<(\/)?([A-Za-z][A-Za-z0-9]*)([^>]*)>/g;
const selfClosing = ['input','img','br','hr','meta','link'];
const stack = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let m;
  tagRe.lastIndex = 0;
  while ((m = tagRe.exec(line)) !== null) {
    const [full, closing, tag] = m;
    if (closing) {
      const top = stack.pop();
      if (!top || top.tag !== tag) {
        console.log('Mismatch at line', i+1, 'found close', tag, 'expected', top ? top.tag : '<empty>');
        console.log('Top of stack:', stack.slice(-5));
        console.log('Line content:', line);
        process.exit(0);
      }
    } else if (full.endsWith('/>') || selfClosing.includes(tag)) {
      // ignore
    } else {
      stack.push({ tag, line: i+1, text: full });
    }
  }
}
if (stack.length) {
  console.log('Unclosed tags at end:', stack.slice(-20));
} else {
  console.log('No mismatches');
}
