import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Download individual product sheet (returns the stored fileUrl as redirect or data)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });

    if (!product.fileUrl) {
      return NextResponse.json({ error: 'Este producto no tiene archivo' }, { status: 404 });
    }

    // If it's a base64 data URI, decode and serve as file
    if (product.fileUrl.startsWith('data:')) {
      const matches = product.fileUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        
        let ext = '.xlsx';
        if (product.sourceFileName) {
          const match = product.sourceFileName.match(/\.[0-9a-z]+$/i);
          if (match) ext = match[0];
        }
        const fileName = `${product.name.replace(/[^a-z0-9]/gi, '_')}${ext}`;

        let finalBuffer = buffer;
        try {
          if (product.sheetName) {
            const JSZip = (await import('jszip')).default;
            const zip = await JSZip.loadAsync(buffer);
            const workbookXmlFile = zip.file('xl/workbook.xml');
            
            if (workbookXmlFile) {
              let xml = await workbookXmlFile.async('string');
              const sheetsMatch = xml.match(/<sheets>([\s\S]*?)<\/sheets>/);
              if (sheetsMatch) {
                const sheetRegex = /<sheet\s+[^>]*name="([^"]+)"/gi;
                let match;
                let sheetIndex = -1;
                let currentIndex = 0;
                while ((match = sheetRegex.exec(sheetsMatch[1])) !== null) {
                  if (match[1].toLowerCase() === product.sheetName.toLowerCase()) {
                    sheetIndex = currentIndex;
                    break;
                  }
                  currentIndex++;
                }
                if (sheetIndex !== -1) {
                  if (xml.includes('activeTab=')) {
                    xml = xml.replace(/activeTab="\d+"/, `activeTab="${sheetIndex}"`);
                  } else {
                    xml = xml.replace(/<workbookView\s/, `<workbookView activeTab="${sheetIndex}" `);
                  }
                  zip.file('xl/workbook.xml', xml);
                  finalBuffer = await zip.generateAsync({ type: 'nodebuffer' });
                }
              }
            }
          }
        } catch (e) {
          console.error('Error modifying active tab', e);
        }

        return new Response(finalBuffer, {
          headers: {
            'Content-Type': mimeType,
            'Content-Disposition': `attachment; filename="${fileName}"`,
          }
        });
      }
    }

    // Otherwise redirect to the URL
    return NextResponse.redirect(product.fileUrl);
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Error al descargar' }, { status: 500 });
  }
}
