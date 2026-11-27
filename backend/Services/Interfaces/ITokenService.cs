using SptApi.Models;

namespace SptApi.Services;

public interface ITokenService
{
    string CreateToken(User user);
}
