const { PrismaClient } = require('@prisma/client');
const JSZip = require('jszip');

const prisma = new PrismaClient();

async function run() {
  const product = await prisma.product.findFirst({
    where: { fileUrl: { not: null } },
    orderBy: { createdAt: 'desc' }
  });

  if (!product) {
    console.log('No product found with fileUrl');
    return;
  }
  console.log(`Product: ${product.name}`);

  const matches = product.fileUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    console.log('No base64 match');
    return;
  }
  
  const buffer = Buffer.from(matches[2], 'base64');
  const zip = await JSZip.loadAsync(buffer);
  
  // Find all drawings
  const files = Object.keys(zip.files);
  const drawingFiles = files.filter(f => f.startsWith('xl/drawings/drawing') && f.endsWith('.xml'));
  
  console.log(`Found ${drawingFiles.length} drawing files.`);
  
  for (const file of drawingFiles) {
    console.log(`\n--- ${file} ---`);
    const xml = await zip.file(file).async('string');
    // Extract anchors
    const anchors = xml.match(/<xdr:[a-zA-Z]+CellAnchor>[\s\S]*?<\/xdr:[a-zA-Z]+CellAnchor>/gi);
    if (!anchors) {
      console.log('No anchors found.');
      continue;
    }
    
    console.log(`Found ${anchors.length} anchors.`);
    for (const anchor of anchors) {
      let colMatch = anchor.match(/<xdr:col>(\d+)<\/xdr:col>/);
      let rowMatch = anchor.match(/<xdr:row>(\d+)<\/xdr:row>/);
      let embedMatch = anchor.match(/r:embed="([^"]+)"/);
      console.log(`Anchor at Col ${colMatch ? colMatch[1] : '?'} Row ${rowMatch ? rowMatch[1] : '?'} -> Embed: ${embedMatch ? embedMatch[1] : 'none'}`);
    }
  }
  await prisma.$disconnect();
}
run();
