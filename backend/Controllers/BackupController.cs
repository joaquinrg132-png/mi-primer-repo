using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuoteSysBackend.Data;
using QuoteSysBackend.Models;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace QuoteSysBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BackupController : ControllerBase
    {
        private readonly AppDbContext _context;

        public BackupController(AppDbContext context)
        {
            _context = context;
        }

        public class BackupDto
        {
            public List<Category> Categories { get; set; } = new();
            public List<Product> Products { get; set; } = new();
        }

        [HttpGet("export")]
        public async Task<IActionResult> ExportDatabase()
        {
            var backup = new BackupDto
            {
                Categories = await _context.Category.AsNoTracking().ToListAsync(),
                Products = await _context.Product.AsNoTracking().ToListAsync()
            };

            var options = new JsonSerializerOptions 
            { 
                WriteIndented = true,
                ReferenceHandler = ReferenceHandler.IgnoreCycles 
            };
            
            var json = JsonSerializer.Serialize(backup, options);
            
            var bytes = System.Text.Encoding.UTF8.GetBytes(json);
            return File(bytes, "application/json", $"quotesys_backup_{DateTime.Now:yyyyMMdd_HHmmss}.json");
        }

        [HttpPost("import")]
        public async Task<IActionResult> ImportDatabase([FromBody] BackupDto backup)
        {
            if (backup == null || backup.Categories == null || backup.Products == null)
            {
                return BadRequest("Formato de respaldo inválido.");
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Limpiar base de datos (Catálogo)
                _context.Product.RemoveRange(_context.Product);
                _context.Category.RemoveRange(_context.Category);
                await _context.SaveChangesAsync();

                // Restaurar Categorías
                await _context.Category.AddRangeAsync(backup.Categories);
                await _context.SaveChangesAsync();

                // Restaurar Productos
                await _context.Product.AddRangeAsync(backup.Products);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                return Ok(new { success = true, message = "Base de datos restaurada correctamente." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { success = false, message = "Error restaurando la base de datos", error = ex.Message });
            }
        }
    }
}
