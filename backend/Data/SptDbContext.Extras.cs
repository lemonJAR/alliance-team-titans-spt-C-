using Microsoft.EntityFrameworkCore;
using SptApi.Models;

namespace SptApi.Data;

// Hand-written mappings that the scaffold doesn't know about.
// SptDbContext.cs declares `partial void OnModelCreatingPartial`; this file implements it.
public partial class SptDbContext
{
    partial void OnModelCreatingPartial(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Offering>(entity =>
        {
            entity.Property(e => e.Schedule)
                .HasMaxLength(120)
                .HasDefaultValueSql("'TBA'")
                .HasColumnName("schedule");
            entity.Property(e => e.Room)
                .HasMaxLength(60)
                .HasColumnName("room");
        });
    }
}