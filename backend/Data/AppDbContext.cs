using Microsoft.EntityFrameworkCore;
using QuoteSysBackend.Models;

namespace QuoteSysBackend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Product> Product { get; set; }
        public DbSet<Category> Category { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Mapear nombres de tablas como están en Postgres (generados por Prisma previamente)
            modelBuilder.Entity<Product>().ToTable("Product");
            modelBuilder.Entity<Category>().ToTable("Category");
        }
    }
}
