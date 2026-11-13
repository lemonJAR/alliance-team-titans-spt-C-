using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SptApi.Data;
using SptApi.Services;

var builder = WebApplication.CreateBuilder(args);

// ── Database ──
var cs = builder.Configuration.GetConnectionString("Default");
if (string.IsNullOrWhiteSpace(cs))
    throw new InvalidOperationException(
        "ConnectionStrings:Default is missing. Set it in appsettings.Development.json (local) or the " +
        "environment variable ConnectionStrings__Default (deployment).");
builder.Services.AddDbContext<SptDbContext>(o => o.UseMySql(cs, ServerVersion.AutoDetect(cs)));

// ── Our services ──
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<AuditService>();
builder.Services.AddScoped<EmailTokenService>();
builder.Services.AddSingleton<IEmailSender, ConsoleEmailSender>();   // swap for a real sender later

// ── JWT authentication ──
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
    throw new InvalidOperationException("Jwt:Key is missing or shorter than 32 characters. Set it in appsettings.Development.json (local) or the environment variable Jwt__Key (deployment).");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;   // keep claim names as written: sub, email, role
        // A valid signature is not enough: a deactivated user (or one whose account was deleted) must lose
        // access immediately instead of keeping a working token until it expires.
        o.Events = new JwtBearerEvents
        {
            OnTokenValidated = async ctx =>
            {
                var sub = ctx.Principal?.FindFirst("sub")?.Value;
                if (!int.TryParse(sub, out var userId)) { ctx.Fail("Invalid token."); return; }

                var db = ctx.HttpContext.RequestServices.GetRequiredService<SptDbContext>();
                var active = await db.Users.Where(u => u.Id == userId)
                    .Select(u => (bool?)(u.IsActive ?? true)).FirstOrDefaultAsync();
                if (active != true) ctx.Fail("Account is inactive or no longer exists.");
            }
        };
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = "sub",
            RoleClaimType = "role"
        };
    });
builder.Services.AddAuthorization();

// ── Controllers (snake_case JSON to match the frontend) ──
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.SnakeCaseLower;
        o.JsonSerializerOptions.Converters.Add(new UtcDateTimeConverter());          // timestamps leave the API as UTC ("...Z")
        o.JsonSerializerOptions.Converters.Add(new UtcNullableDateTimeConverter());
    });
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseAuthentication();   // must come before UseAuthorization
app.UseAuthorization();
app.MapControllers();

await DbSeeder.SeedAdminAsync(app.Services);

app.Run();