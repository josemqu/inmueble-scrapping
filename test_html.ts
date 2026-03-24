import fs from 'fs';

const main = async () => {
  const req = await fetch("https://roblescasascampos.com/propiedades/chalet-4-amb-parque-luro");
  const html = await req.text();
  fs.writeFileSync('rob_test.html', html);
  let startIdx = html.indexOf('<script');
  while (startIdx !== -1) {
    const endIdx = html.indexOf('</script>', startIdx);
    const script = html.slice(startIdx, endIdx + 9);
    if (script.includes('window.') || script.includes('__')) {
       // Check for JSON or date
       if (script.toLowerCase().includes('date') || script.toLowerCase().includes('created')) {
           console.log("Found script with date/created:", script.slice(0, 100));
       }
    }
    startIdx = html.indexOf('<script', endIdx);
  }
};
main();
