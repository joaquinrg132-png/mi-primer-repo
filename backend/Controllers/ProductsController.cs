using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuoteSysBackend.Data;
using QuoteSysBackend.Models;

namespace QuoteSysBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ProductsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/products
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Product>>> GetProducts([FromQuery] string? search)
        {
            var query = _context.Product.Include(p => p.Category).AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(p => p.Name.ToLower().Contains(search.ToLower()));
            }

            return await query.OrderByDescending(p => p.UpdatedAt).ToListAsync();
        }

        // POST: api/products
        [HttpPost]
        public async Task<ActionResult<Product>> PostProduct([FromForm] ProductCreateRequest request)
        {
            var category = await _context.Category.FirstOrDefaultAsync(c => c.Name == (request.CategoryName ?? "General"));

            if (category == null)
            {
                category = new Category { Name = request.CategoryName ?? "General" };
                _context.Category.Add(category);
                await _context.SaveChangesAsync();
            }

            string? fileUrl = null;

            if (request.File != null && request.File.Length > 0)
            {
                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                // Generar nombre de archivo único para evitar colisiones
                var uniqueFileName = $"{Guid.NewGuid()}_{request.File.FileName}";
                var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await request.File.CopyToAsync(fileStream);
                }

                // Ruta relativa para acceso web estático
                fileUrl = $"/uploads/{uniqueFileName}";
            }
            else
            {
                fileUrl = request.FileUrl;
            }

            // Generar descripción corporativa limpia si no existe
            var description = request.Description;
            if (string.IsNullOrEmpty(description))
            {
                description = $"Hoja de datos importada correspondiente a la sección {request.Name}. Contiene registros de cotización y estructura de precios de grado técnico para clientes corporativos.";
            }

            // Imagen por defecto profesional (mockup corporativo)
            var imageUrl = request.ImageUrl;
            if (string.IsNullOrEmpty(imageUrl))
            {
                // Devolveremos una de las imágenes premium que guardaremos en la carpeta /images/
                imageUrl = "/images/product_placeholder.svg";
            }

            var product = new Product
            {
                Name = request.Name,
                CategoryId = category.Id,
                FileUrl = fileUrl,
                SourceFileName = request.SourceFileName ?? request.File?.FileName ?? "Importado Directo",
                Description = description,
                ImageUrl = imageUrl,
                UpdatedBy = request.UserId ?? "system"
            };

            _context.Product.Add(product);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetProducts), new { id = product.Id }, product);
        }

        // POST: api/products/import-workbook
        [HttpPost("import-workbook")]
        public async Task<IActionResult> ImportWorkbook([FromForm] WorkbookImportRequest request)
        {
            if (request.File == null || request.File.Length == 0)
            {
                return BadRequest("No se proporcionó ningún archivo de Excel.");
            }

            if (string.IsNullOrEmpty(request.SheetsJson))
            {
                return BadRequest("No se proporcionó la lista de hojas seleccionadas.");
            }

            List<SheetImportItem>? sheets;
            try
            {
                sheets = System.Text.Json.JsonSerializer.Deserialize<List<SheetImportItem>>(request.SheetsJson, new System.Text.Json.JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
            }
            catch (Exception ex)
            {
                return BadRequest($"Error al procesar la lista de hojas: {ex.Message}");
            }

            if (sheets == null || sheets.Count == 0)
            {
                return BadRequest("La lista de hojas a importar está vacía.");
            }

            // 1. Guardar el archivo original e íntegro (preserva 100% de macros e imágenes)
            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            if (!Directory.Exists(uploadsFolder))
            {
                Directory.CreateDirectory(uploadsFolder);
            }

            var uniqueFileName = $"{Guid.NewGuid()}_{request.File.FileName}";
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await request.File.CopyToAsync(fileStream);
            }

            var fileUrl = $"/uploads/{uniqueFileName}";

            // 2. Extraer imagen de la celda H17 de cada hoja (columna 7, fila 16 en índice 0-based)
            var imagesFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "images");
            if (!Directory.Exists(imagesFolder)) Directory.CreateDirectory(imagesFolder);

            // Mapa: sheetName -> imageUrl extraída
            var sheetImages = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            try
            {
                using var zipStream = new System.IO.FileStream(filePath, System.IO.FileMode.Open, System.IO.FileAccess.Read);
                using var zip = new System.IO.Compression.ZipArchive(zipStream, System.IO.Compression.ZipArchiveMode.Read);

                // Leer workbook.xml para obtener la relación hoja -> rId
                var wbEntry = zip.GetEntry("xl/workbook.xml");
                // Leer rels del workbook para mapear rId -> sheet file
                var wbRelsEntry = zip.GetEntry("xl/_rels/workbook.xml.rels");
                var sheetFileMap = new Dictionary<string, string>(); // rId -> xl/worksheets/sheetN.xml
                if (wbRelsEntry != null)
                {
                    using var rdr = new System.IO.StreamReader(wbRelsEntry.Open());
                    var relsXml = await rdr.ReadToEndAsync();
                    var relMatches = System.Text.RegularExpressions.Regex.Matches(relsXml,
                        @"<Relationship[^>]*Id=""([^""]+)""[^>]*Target=""([^""]+)""");
                    foreach (System.Text.RegularExpressions.Match m in relMatches)
                        sheetFileMap[m.Groups[1].Value] = m.Groups[2].Value; // rId -> worksheets/sheetN.xml
                }

                // Leer workbook.xml para mapear nombre de hoja -> rId
                var sheetRidMap = new Dictionary<string, string>(); // sheetName -> rId
                if (wbEntry != null)
                {
                    using var rdr = new System.IO.StreamReader(wbEntry.Open());
                    var wbXml = await rdr.ReadToEndAsync();
                    var sheetMatches = System.Text.RegularExpressions.Regex.Matches(wbXml,
                        @"<sheet\s[^>]*name=""([^""]+)""[^>]*r:id=""([^""]+)""");
                    foreach (System.Text.RegularExpressions.Match m in sheetMatches)
                        sheetRidMap[m.Groups[1].Value] = m.Groups[2].Value;
                }

                foreach (var sheet in sheets)
                {
                    if (!sheetRidMap.TryGetValue(sheet.SheetName, out var rId)) continue;
                    if (!sheetFileMap.TryGetValue(rId, out var sheetRelPath)) continue;
                    // sheetRelPath es "worksheets/sheetN.xml" → necesitamos xl/worksheets/_rels/sheetN.xml.rels
                    var sheetFileName = Path.GetFileName(sheetRelPath);
                    var drawingRelsPath = $"xl/worksheets/_rels/{sheetFileName}.rels";
                    var drawingRelsEntry = zip.GetEntry(drawingRelsPath);
                    if (drawingRelsEntry == null) continue;

                    string drawingRelFile = string.Empty;
                    using (var rdr = new System.IO.StreamReader(drawingRelsEntry.Open()))
                    {
                        var xml = await rdr.ReadToEndAsync();
                        var m = System.Text.RegularExpressions.Regex.Match(xml,
                            @"Target=""\.\./(drawings/[^""]+)""");
                        if (m.Success) drawingRelFile = "xl/" + m.Groups[1].Value;
                    }
                    if (string.IsNullOrEmpty(drawingRelFile)) continue;

                    // Leer rels del drawing para mapear rId -> imagen
                    var drawingRelsFilePath = drawingRelFile.Replace("drawings/", "drawings/_rels/") + ".rels";
                    var drawingRelsFileEntry = zip.GetEntry(drawingRelsFilePath);
                    var imageRidMap = new Dictionary<string, string>(); // rId -> media/imageN.png
                    if (drawingRelsFileEntry != null)
                    {
                        using var rdr = new System.IO.StreamReader(drawingRelsFileEntry.Open());
                        var xml = await rdr.ReadToEndAsync();
                        var imgMatches = System.Text.RegularExpressions.Regex.Matches(xml,
                            @"<Relationship[^>]*Id=""([^""]+)""[^>]*Target=""\.\./(media/[^""]+)""");
                        foreach (System.Text.RegularExpressions.Match m in imgMatches)
                            imageRidMap[m.Groups[1].Value] = "xl/" + m.Groups[2].Value;
                    }

                    // Leer drawing XML y buscar imagen anclada en H17 (col=7, row=16)
                    var drawingEntry = zip.GetEntry(drawingRelFile);
                    if (drawingEntry == null) continue;

                    string drawingXml;
                    using (var rdr = new System.IO.StreamReader(drawingEntry.Open()))
                        drawingXml = await rdr.ReadToEndAsync();

                    // Buscar ancla twoCellAnchor o oneCellAnchor con col=7,row=16
                    var anchorPattern = System.Text.RegularExpressions.Regex.Matches(drawingXml,
                        @"<xdr:(?:twoCellAnchor|oneCellAnchor)[^>]*>([\s\S]*?)</xdr:(?:twoCellAnchor|oneCellAnchor)>",
                        System.Text.RegularExpressions.RegexOptions.Singleline);

                    string? bestImageRid = null;
                    int bestDistance = int.MaxValue;

                    foreach (System.Text.RegularExpressions.Match anchor in anchorPattern)
                    {
                        var block = anchor.Groups[1].Value;
                        // Extraer from col y row
                        var colM = System.Text.RegularExpressions.Regex.Match(block, @"<xdr:from>[\s\S]*?<xdr:col>(\d+)</xdr:col>[\s\S]*?<xdr:row>(\d+)</xdr:row>");
                        if (!colM.Success) continue;
                        int col = int.Parse(colM.Groups[1].Value);
                        int row = int.Parse(colM.Groups[2].Value);
                        int distance = Math.Abs(col - 7) + Math.Abs(row - 16); // H=7, row17=16

                        if (distance < bestDistance)
                        {
                            var ridM = System.Text.RegularExpressions.Regex.Match(block, @"r:embed=""([^""]+)""");
                            if (ridM.Success)
                            {
                                bestDistance = distance;
                                bestImageRid = ridM.Groups[1].Value;
                            }
                        }
                    }

                    if (bestImageRid != null && imageRidMap.TryGetValue(bestImageRid, out var mediaPath))
                    {
                        var mediaEntry = zip.GetEntry(mediaPath);
                        if (mediaEntry != null)
                        {
                            var ext = Path.GetExtension(mediaPath);
                            var imgFileName = $"{Guid.NewGuid()}{ext}";
                            var imgFilePath = Path.Combine(imagesFolder, imgFileName);
                            using var imgStream = mediaEntry.Open();
                            using var imgFile = new System.IO.FileStream(imgFilePath, System.IO.FileMode.Create);
                            await imgStream.CopyToAsync(imgFile);
                            sheetImages[sheet.SheetName] = $"/uploads/images/{imgFileName}";
                        }
                    }
                }
            }
            catch { /* Si la extracción de imagen falla, continúa sin imagen */ }

            // 3. Crear o actualizar un registro de producto en la base de datos por cada hoja seleccionada

            var processedCount = 0;
            foreach (var sheet in sheets)
            {
                var category = await _context.Category.FirstOrDefaultAsync(c => c.Name == (sheet.Category ?? "General"));
                if (category == null)
                {
                    category = new Category { Name = sheet.Category ?? "General" };
                    _context.Category.Add(category);
                    await _context.SaveChangesAsync();
                }

                // Identificar por la combinación sheetName + sourceFileName
                var matchSourceFileName = string.IsNullOrEmpty(request.TargetSourceFileName) 
                    ? request.File.FileName 
                    : request.TargetSourceFileName;

                var existingProduct = await _context.Product
                    .FirstOrDefaultAsync(p => p.SheetName == sheet.SheetName && p.SourceFileName == matchSourceFileName);
                
                // Fallback: si no se encuentra por pestaña, intentar por nombre exacto dentro del mismo libro
                if (existingProduct == null)
                    existingProduct = await _context.Product.FirstOrDefaultAsync(p => p.Name == sheet.ProductName && p.SourceFileName == matchSourceFileName);
                
                // Fallback global por nombre exacto (por si le cambiaron el nombre al archivo original pero no sincronizaron)
                if (existingProduct == null)
                    existingProduct = await _context.Product.FirstOrDefaultAsync(p => p.Name == sheet.ProductName);

                if (existingProduct != null)
                {
                    // Incrementar versión y actualizar datos del archivo (Control de versiones)
                    existingProduct.Version += 1;
                    existingProduct.Name = sheet.ProductName;
                    existingProduct.Characteristics = sheet.Characteristics;
                    existingProduct.Length = sheet.Length;
                    existingProduct.FileUrl = fileUrl;
                    existingProduct.SheetName = sheet.SheetName;
                    
                    // Solo preservar el SourceFileName original para no cambiar el nombre del libro
                    if (string.IsNullOrEmpty(existingProduct.SourceFileName))
                    {
                        existingProduct.SourceFileName = request.File.FileName;
                    }

                    existingProduct.CreatedAt = DateTime.SpecifyKind(existingProduct.CreatedAt, DateTimeKind.Utc);
                    existingProduct.UpdatedAt = DateTime.UtcNow;
                    existingProduct.UpdatedBy = request.UserId ?? "system";
                    // Actualizar imagen si se extrajo una nueva
                    if (sheetImages.TryGetValue(sheet.SheetName, out var updatedImg))
                        existingProduct.ImageUrl = updatedImg;

                    _context.Product.Update(existingProduct);
                }
                else
                {
                    // Crear nuevo registro (Versión 1)
                    var description = $"Ficha de datos correspondiente a la pestaña '{sheet.SheetName}' dentro del libro de trabajo '{request.File.FileName}'. Contiene la estructura de precios, tablas técnicas y macros de automatización asociadas.";
                    sheetImages.TryGetValue(sheet.SheetName, out var extractedImg);

                    var product = new Product
                    {
                        Name = sheet.ProductName,
                        Characteristics = sheet.Characteristics,
                        Length = sheet.Length,
                        CategoryId = category.Id,
                        FileUrl = fileUrl,
                        SourceFileName = request.File.FileName,
                        SheetName = sheet.SheetName,
                        Description = description,
                        ImageUrl = extractedImg ?? "/images/product_placeholder.svg",
                        Version = 1,
                        UpdatedBy = request.UserId ?? "system",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.Product.Add(product);
                }
                processedCount++;
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true, count = processedCount });
        }

        // GET: api/products/download-sheet?id={id}
        // Descarga el archivo Excel con la hoja del producto activa
        [HttpGet("download-sheet")]
        public async Task<IActionResult> DownloadSheet([FromQuery] string id)
        {
            var product = await _context.Product.FindAsync(id);
            if (product == null || string.IsNullOrEmpty(product.FileUrl))
                return NotFound("Producto o archivo no encontrado.");

            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", product.FileUrl.TrimStart('/'));
            if (!System.IO.File.Exists(filePath))
                return NotFound("El archivo físico no existe en el servidor.");

            // Leer el archivo como zip en memoria
            var originalBytes = await System.IO.File.ReadAllBytesAsync(filePath);

            // Si hay un sheetName, modificar el workbook.xml para activar esa hoja
            if (!string.IsNullOrEmpty(product.SheetName))
            {
                try
                {
                    using var ms = new System.IO.MemoryStream();
                    ms.Write(originalBytes, 0, originalBytes.Length);

                    using var zip = new System.IO.Compression.ZipArchive(ms, System.IO.Compression.ZipArchiveMode.Update, leaveOpen: true);

                    // Leer workbook.xml para obtener los índices de hojas
                    var wbEntry = zip.GetEntry("xl/workbook.xml");
                    if (wbEntry != null)
                    {
                        string wbXml;
                        using (var rdr = new System.IO.StreamReader(wbEntry.Open()))
                            wbXml = await rdr.ReadToEndAsync();

                        // Encontrar el índice (sheetId) de la hoja objetivo
                        var sheetMatch = System.Text.RegularExpressions.Regex.Match(
                            wbXml,
                            $@"<sheet[^>]*name=""{System.Text.RegularExpressions.Regex.Escape(product.SheetName)}""[^>]*r:id=""(rId\d+)"""
                        );

                        if (sheetMatch.Success)
                        {
                            // Encontrar la posición (tab index) de esta hoja — 0-based
                            var allSheets = System.Text.RegularExpressions.Regex.Matches(wbXml, @"<sheet[^/]*/>");
                            int targetTab = 0;
                            for (int i = 0; i < allSheets.Count; i++)
                            {
                                if (allSheets[i].Value.Contains($"name=\"{product.SheetName}\""))
                                { targetTab = i; break; }
                            }

                            // Actualizar o insertar activeTab en bookViews
                            string updatedXml;
                            if (wbXml.Contains("activeTab="))
                            {
                                updatedXml = System.Text.RegularExpressions.Regex.Replace(
                                    wbXml,
                                    @"activeTab=""\d+""",
                                    $"activeTab=\"{targetTab}\""
                                );
                            }
                            else
                            {
                                updatedXml = wbXml.Replace(
                                    "<workbookView",
                                    $"<workbookView activeTab=\"{targetTab}\""
                                );
                            }

                            // Escribir de vuelta al zip
                            wbEntry.Delete();
                            var newEntry = zip.CreateEntry("xl/workbook.xml");
                            using var writer = new System.IO.StreamWriter(newEntry.Open());
                            await writer.WriteAsync(updatedXml);
                        }
                    }

                    zip.Dispose();
                    var modifiedBytes = ms.ToArray();
                    var ext = Path.GetExtension(product.SourceFileName ?? "archivo.xlsm");
                    var downloadName = $"{product.Name.Replace(" ", "_")}{ext}";
                    return File(modifiedBytes, "application/vnd.ms-excel.sheet.macroenabled.12", downloadName);
                }
                catch
                {
                    // Si algo falla al modificar, devolver el archivo original
                }
            }

            // Fallback: devolver el archivo sin modificar
            var fallbackExt = Path.GetExtension(product.SourceFileName ?? "archivo.xlsm");
            var fallbackName = $"{product.Name.Replace(" ", "_")}{fallbackExt}";
            return PhysicalFile(filePath, "application/vnd.ms-excel.sheet.macroenabled.12", fallbackName);
        }

        // POST: api/products/bulk-delete
        [HttpPost("bulk-delete")]
        public async Task<IActionResult> BulkDelete([FromBody] List<string> ids)
        {
            if (ids == null || ids.Count == 0)
            {
                return BadRequest("No se proporcionaron IDs para eliminar.");
            }

            var products = await _context.Product.Where(p => ids.Contains(p.Id)).ToListAsync();
            
            foreach (var product in products)
            {
                if (!string.IsNullOrEmpty(product.FileUrl))
                {
                    var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", product.FileUrl.TrimStart('/'));
                    if (System.IO.File.Exists(filePath))
                    {
                        try { System.IO.File.Delete(filePath); } catch { }
                    }
                }
            }

            _context.Product.RemoveRange(products);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        // GET: api/products/download-book
        // Descarga el archivo de origen completo con el nombre correcto de SourceFileName
        [HttpGet("download-book")]
        public async Task<IActionResult> DownloadBook([FromQuery] string id)
        {
            var product = await _context.Product.FindAsync(id);
            if (product == null) return NotFound("Producto no encontrado.");
            if (string.IsNullOrEmpty(product.FileUrl)) return NotFound("Archivo no disponible.");

            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", product.FileUrl.TrimStart('/'));
            if (!System.IO.File.Exists(filePath)) return NotFound("El archivo ya no existe en el servidor.");

            var ext = Path.GetExtension(product.SourceFileName ?? "libro.xlsm");
            var downloadName = string.IsNullOrWhiteSpace(product.SourceFileName) 
                ? $"libro_completo{ext}" 
                : product.SourceFileName;

            // Asegurarnos de que el nombre del archivo termina con la extensión si el usuario la borró
            if (!downloadName.EndsWith(ext, StringComparison.OrdinalIgnoreCase))
            {
                downloadName += ext;
            }

            return PhysicalFile(filePath, "application/octet-stream", downloadName);
        }

        // PATCH: api/products/rename?id={id}
        // Renombra el nombre del producto desde la interfaz sin reimportar
        [HttpPatch("rename")]
        public async Task<IActionResult> RenameProduct([FromQuery] string id, [FromBody] RenameRequest request)
        {
            var product = await _context.Product.FindAsync(id);
            if (product == null) return NotFound("Producto no encontrado.");
            if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest("El nombre no puede estar vacío.");

            product.Name = request.Name.Trim();
            product.CreatedAt = DateTime.SpecifyKind(product.CreatedAt, DateTimeKind.Utc);
            product.UpdatedAt = DateTime.UtcNow;
            product.UpdatedBy = request.UserId ?? "system";
            _context.Product.Update(product);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, name = product.Name });
        }

        // PATCH: api/products/rename-book?oldName={oldName}
        // Renombra el nombre del libro (SourceFileName) para todas las hojas asociadas
        [HttpPatch("rename-book")]
        public async Task<IActionResult> RenameBook([FromQuery] string oldName, [FromBody] RenameRequest request)
        {
            if (string.IsNullOrWhiteSpace(oldName) || string.IsNullOrWhiteSpace(request.Name)) 
                return BadRequest("El nombre no puede estar vacío.");

            var products = await _context.Product.Where(p => p.SourceFileName == oldName).ToListAsync();
            if (!products.Any()) return NotFound("No se encontraron productos de este libro.");

            var newName = request.Name.Trim();
            // Evitar duplicar extensiones si el usuario ya la pone
            var ext = Path.GetExtension(oldName);
            if (!string.IsNullOrEmpty(ext) && !newName.EndsWith(ext, StringComparison.OrdinalIgnoreCase))
            {
                newName += ext;
            }

            foreach (var p in products)
            {
                p.SourceFileName = newName;
                p.CreatedAt = DateTime.SpecifyKind(p.CreatedAt, DateTimeKind.Utc);
                p.UpdatedAt = DateTime.UtcNow;
                p.UpdatedBy = request.UserId ?? "system";
            }
            
            _context.Product.UpdateRange(products);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, count = products.Count });
        }

        // DELETE: api/products?id={id}
        [HttpDelete]
        public async Task<IActionResult> DeleteProduct([FromQuery] string id)
        {
            var product = await _context.Product.FindAsync(id);
            if (product == null)
            {
                return NotFound();
            }

            // Opcional: Eliminar archivo físico de wwwroot si existe
            if (!string.IsNullOrEmpty(product.FileUrl))
            {
                var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", product.FileUrl.TrimStart('/'));
                if (System.IO.File.Exists(filePath))
                {
                    try
                    {
                        System.IO.File.Delete(filePath);
                    }
                    catch
                    {
                        // Continuar aunque falle el borrado físico
                    }
                }
            }

            _context.Product.Remove(product);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }
    }

    public class ProductCreateRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? CategoryName { get; set; }
        public string? FileUrl { get; set; }
        public string? UserId { get; set; }
        public string? SheetName { get; set; }  // Nombre original de la hoja en el Excel
        public string? SourceFileName { get; set; }
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
        public IFormFile? File { get; set; }    // Archivo de hoja separada
    }

    public class WorkbookImportRequest
    {
        public IFormFile? File { get; set; }
        public string SheetsJson { get; set; } = string.Empty;
        public string? UserId { get; set; }
        public string? TargetSourceFileName { get; set; }
    }

    public class SheetImportItem
    {
        public string SheetName { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public string? Characteristics { get; set; }
        public string? Length { get; set; }
        public string? Category { get; set; }
    }

    public class RenameRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? UserId { get; set; }
    }
}
