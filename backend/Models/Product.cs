using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuoteSysBackend.Models
{
    public class Product
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Required]
        [Column("categoryId")]
        public string CategoryId { get; set; } = string.Empty;

        [ForeignKey("CategoryId")]
        public Category? Category { get; set; }

        [Column("fileUrl")]
        public string? FileUrl { get; set; }

        [Column("sourceFileName")]
        public string? SourceFileName { get; set; }

        [Column("sheetName")]
        public string? SheetName { get; set; }

        [Column("characteristics")]
        public string? Characteristics { get; set; }

        [Column("length")]
        public string? Length { get; set; }

        [Column("description")]
        public string? Description { get; set; }

        [Column("imageUrl")]
        public string? ImageUrl { get; set; }

        [Column("version")]
        public int Version { get; set; } = 1;

        [Column("updatedBy")]
        public string? UpdatedBy { get; set; }

        [Column("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
