FROM mcr.microsoft.com/dotnet/aspnet:9.0-bookworm-slim AS base
WORKDIR /app
EXPOSE 8080

ENV TZ="Asia/Ulaanbaatar"

FROM mcr.microsoft.com/dotnet/sdk:9.0-bookworm-slim AS publish
WORKDIR /src
COPY ["volleyhub-api/volleyhub-api.csproj", "volleyhub-api/"]
RUN dotnet restore "volleyhub-api/volleyhub-api.csproj"
COPY . .
WORKDIR "/src/volleyhub-api"

RUN dotnet publish "volleyhub-api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "volleyhub-api.dll"]
