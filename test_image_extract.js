const JSZip = require('jszip');

async function test() {
  const zip = new JSZip();
  zip.file('xl/workbook.xml', `<workbook><sheets><sheet name="Hoja1" r:id="rId1"/></sheets></workbook>`);
  zip.file('xl/_rels/workbook.xml.rels', `<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>`);
  zip.file('xl/worksheets/sheet1.xml', `<worksheet><drawing r:id="rIdDrawing"/></worksheet>`);
  zip.file('xl/worksheets/_rels/sheet1.xml.rels', `<Relationships><Relationship Id="rIdDrawing" Target="../drawings/drawing1.xml"/></Relationships>`);
  zip.file('xl/drawings/drawing1.xml', `<xdr:wsDr><xdr:twoCellAnchor><xdr:from><xdr:col>7</xdr:col><xdr:row>16</xdr:row></xdr:from><xdr:pic><xdr:blipFill><a:blip r:embed="rIdImg1"/></xdr:blipFill></xdr:pic></xdr:twoCellAnchor></xdr:wsDr>`);
  zip.file('xl/drawings/_rels/drawing1.xml.rels', `<Relationships><Relationship Id="rIdImg1" Target="../media/image1.jpeg"/></Relationships>`);
  zip.file('xl/media/image1.jpeg', 'FAKE_JPEG_DATA');

  const sheetName = 'Hoja1';
  let imageUrl = null;
  
  try {
    const wbXml = await zip.file('xl/workbook.xml').async('string');
    const sheetRegex = new RegExp(`<sheet[^>]*name="${sheetName}"[^>]*r:id="([^"]+)"`, 'i');
    const sheetMatch = wbXml.match(sheetRegex);
    if (sheetMatch) {
      const sheetRId = sheetMatch[1];
      const wbRels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
      const relRegex = new RegExp(`<Relationship[^>]*Id="${sheetRId}"[^>]*Target="([^"]+)"`, 'i');
      const relMatch = wbRels.match(relRegex);
      if (relMatch) {
        let sheetTarget = relMatch[1];
        if (sheetTarget.startsWith('/xl/')) sheetTarget = sheetTarget.replace('/xl/', '');
        const sheetXml = await zip.file('xl/' + sheetTarget).async('string');
        const drawingMatch = sheetXml.match(/<drawing r:id="([^"]+)"/i);
        if (drawingMatch) {
          const drawingRId = drawingMatch[1];
          const sheetTargetParts = sheetTarget.split('/');
          const sheetFileName = sheetTargetParts.pop();
          const sheetTargetDir = sheetTargetParts.join('/');
          const sheetRelsPath = `xl/${sheetTargetDir}/_rels/${sheetFileName}.rels`;
          
          const sheetRelsXml = await zip.file(sheetRelsPath).async('string');
          const drawingRelMatch = sheetRelsXml.match(new RegExp(`<Relationship[^>]*Id="${drawingRId}"[^>]*Target="([^"]+)"`, 'i'));
          
          if (drawingRelMatch) {
            let drawingTarget = drawingRelMatch[1]; // e.g. ../drawings/drawing1.xml
            // resolve relative path from xl/worksheets/
            let absDrawingTarget = `xl/${sheetTargetDir}/${drawingTarget}`.replace(/worksheets\/\.\.\//, '');
            
            const drawingXml = await zip.file(absDrawingTarget).async('string');
            // Find anchor with col 7 (H)
            const anchorMatches = drawingXml.match(/<xdr:[a-zA-Z]+CellAnchor>[\s\S]*?<\/xdr:[a-zA-Z]+CellAnchor>/gi);
            if (anchorMatches) {
              for (const anchor of anchorMatches) {
                if (anchor.includes('<xdr:col>7</xdr:col>')) {
                  const embedMatch = anchor.match(/r:embed="([^"]+)"/i);
                  if (embedMatch) {
                    const embedId = embedMatch[1];
                    const drawingParts = absDrawingTarget.split('/');
                    const drawingFileName = drawingParts.pop();
                    const drawingDir = drawingParts.join('/');
                    const drawingRelsPath = `${drawingDir}/_rels/${drawingFileName}.rels`;
                    
                    const drawingRelsXml = await zip.file(drawingRelsPath).async('string');
                    const imgRelMatch = drawingRelsXml.match(new RegExp(`<Relationship[^>]*Id="${embedId}"[^>]*Target="([^"]+)"`, 'i'));
                    if (imgRelMatch) {
                      const imgTarget = imgRelMatch[1]; // ../media/image1.jpeg
                      const absImgTarget = `${drawingDir}/${imgTarget}`.replace(/drawings\/\.\.\//, '');
                      const imgFile = zip.file(absImgTarget);
                      if (imgFile) {
                        const imgBase64 = await imgFile.async('base64');
                        let ext = absImgTarget.split('.').pop().toLowerCase();
                        if (ext === 'jpeg') ext = 'jpg';
                        imageUrl = `data:image/${ext};base64,${imgBase64}`;
                        console.log('Found Image:', imageUrl.substring(0, 50));
                      }
                    }
                  }
                  break;
                }
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
}
test();
