# Vade local server — run: powershell -ExecutionPolicy Bypass -File serve.ps1
# Site: http://localhost:8080

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8080

$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.json' = 'application/json'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.gif'  = 'image/gif'
    '.ico'  = 'image/x-icon'
    '.woff2'= 'font/woff2'
    '.woff' = 'font/woff'
    '.txt'  = 'text/plain; charset=utf-8'
    '.sql'  = 'text/plain; charset=utf-8'
    '.md'   = 'text/plain; charset=utf-8'
}

$rootFull = [System.IO.Path]::GetFullPath($root)

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
$listener.Start()
Write-Host ""
Write-Host "  Vade server running" -ForegroundColor Green
Write-Host "  http://localhost:$port" -ForegroundColor Cyan
Write-Host "  Folder: $root"
Write-Host "  Ctrl+C to stop"
Write-Host ""

while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $requestLine = $reader.ReadLine()
        while ($null -ne ($line = $reader.ReadLine()) -and $line -ne '') {}

        if (-not $requestLine) { $client.Close(); continue }

        $parts = $requestLine.Split(' ')
        $path = if ($parts.Length -gt 1) { $parts[1] } else { '/' }
        $path = [System.Uri]::UnescapeDataString($path)
        if ($path.Contains('?')) { $path = $path.Split('?')[0] }
        if ($path.EndsWith('/') -or $path -eq '') { $path = $path + 'index.html' }

        $rel = $path.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        $full = [System.IO.Path]::GetFullPath((Join-Path $rootFull $rel))
        $inside = $full.StartsWith($rootFull + [System.IO.Path]::DirectorySeparatorChar) -or $full -eq $rootFull

        if ($inside -and (Test-Path -LiteralPath $full -PathType Leaf)) {
            $bytes = [System.IO.File]::ReadAllBytes($full)
            $ext = [System.IO.Path]::GetExtension($full).ToLower()
            $ctype = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
            $status = '200 OK'
        } else {
            $bytes = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
            $ctype = 'text/plain'
            $status = '404 Not Found'
        }

        $header = "HTTP/1.1 $status`r`nContent-Type: $ctype`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`nCache-Control: no-store`r`n`r`n"
        $hb = [System.Text.Encoding]::ASCII.GetBytes($header)
        $stream.Write($hb, 0, $hb.Length)
        $stream.Write($bytes, 0, $bytes.Length)
        $stream.Flush()
        $reader.Close()
    } catch {
        # drop broken connections silently
    } finally {
        $client.Close()
    }
}
