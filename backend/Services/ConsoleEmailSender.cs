namespace SptApi.Services;

// Development sender: prints the email in the backend terminal instead of sending it.
// To send real emails later, write an SmtpEmailSender : IEmailSender and register it in Program.cs instead.
public class ConsoleEmailSender : IEmailSender
{
    public Task SendAsync(string to, string subject, string body)
    {
        Console.WriteLine();
        Console.WriteLine("================ EMAIL (development - not really sent) ================");
        Console.WriteLine($"To:      {to}");
        Console.WriteLine($"Subject: {subject}");
        Console.WriteLine();
        Console.WriteLine(body);
        Console.WriteLine("========================================================================");
        Console.WriteLine();
        return Task.CompletedTask;
    }
}
