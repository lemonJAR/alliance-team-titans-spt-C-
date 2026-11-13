using System.Text.Json;
using System.Text.Json.Serialization;

namespace SptApi.Services;

// MySQL returns DateTime values with Kind = Unspecified, so System.Text.Json writes them without a "Z".
// Browsers then read them as LOCAL time and show the wrong hour. Every timestamp in this system is stored
// in UTC, so mark them as UTC on the way out ("2026-11-12T08:00:00Z") and the browser converts correctly.
public class UtcDateTimeConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        reader.GetDateTime().ToUniversalTime();

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        var utc = value.Kind == DateTimeKind.Local ? value.ToUniversalTime() : DateTime.SpecifyKind(value, DateTimeKind.Utc);
        writer.WriteStringValue(utc);
    }
}

public class UtcNullableDateTimeConverter : JsonConverter<DateTime?>
{
    public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        reader.TokenType == JsonTokenType.Null ? null : reader.GetDateTime().ToUniversalTime();

    public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
    {
        if (value is null) { writer.WriteNullValue(); return; }
        var v = value.Value;
        var utc = v.Kind == DateTimeKind.Local ? v.ToUniversalTime() : DateTime.SpecifyKind(v, DateTimeKind.Utc);
        writer.WriteStringValue(utc);
    }
}