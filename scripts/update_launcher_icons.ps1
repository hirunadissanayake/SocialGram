param(
    [string]$SourcePath = "assets/images/SocialGram1-removebg-preview.png",
    [double]$ContentScale = 1.0,
    [int]$AlphaThreshold = 8
)

if (-not (Test-Path $SourcePath)) {
    throw "Source image not found: $SourcePath"
}

Add-Type -AssemblyName System.Drawing

function Get-ContentBounds {
    param(
        [System.Drawing.Bitmap]$Image,
        [int]$Threshold
    )

    $minX = $Image.Width
    $minY = $Image.Height
    $maxX = -1
    $maxY = -1

    for ($x = 0; $x -lt $Image.Width; $x++) {
        for ($y = 0; $y -lt $Image.Height; $y++) {
            $pixel = $Image.GetPixel($x, $y)
            if ($pixel.A -gt $Threshold) {
                if ($x -lt $minX) { $minX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }

    if ($maxX -lt 0 -or $maxY -lt 0) {
        return [System.Drawing.Rectangle]::new(0, 0, $Image.Width, $Image.Height)
    }

    return [System.Drawing.Rectangle]::new($minX, $minY, $maxX - $minX + 1, $maxY - $minY + 1)
}

function New-Canvas {
    param(
        [int]$Size
    )

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    $gfx.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $gfx.Clear([System.Drawing.Color]::Transparent)
    return ,$bmp,$gfx
}

$densityMap = [ordered]@{
    "mdpi"   = 48
    "hdpi"   = 72
    "xhdpi"  = 96
    "xxhdpi" = 144
    "xxxhdpi"= 192
}

$source = [System.Drawing.Bitmap]::new($SourcePath)

try {
    $cropRect = Get-ContentBounds -Image $source -Threshold $AlphaThreshold
    if ($cropRect.Width -ne $source.Width -or $cropRect.Height -ne $source.Height) {
        $cropped = $source.Clone($cropRect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    } else {
        $cropped = $source.Clone()
    }

    try {
        foreach ($density in $densityMap.Keys) {
            $size = $densityMap[$density]
            $dir = "android/app/src/main/res/mipmap-$density"
            if (-not (Test-Path $dir)) {
                New-Item -ItemType Directory -Path $dir | Out-Null
            }

            $maxDim = [double][Math]::Max($cropped.Width, $cropped.Height)
            $scale = ($size * $ContentScale) / $maxDim
            if ($scale -le 0) { $scale = $size / $maxDim }

            $drawWidth = [int][Math]::Round($cropped.Width * $scale)
            $drawHeight = [int][Math]::Round($cropped.Height * $scale)
            if ($drawWidth -lt 1) { $drawWidth = 1 }
            if ($drawHeight -lt 1) { $drawHeight = 1 }

            $offsetX = [int][Math]::Round(($size - $drawWidth) / 2)
            $offsetY = [int][Math]::Round(($size - $drawHeight) / 2)
            $destRect = [System.Drawing.Rectangle]::new($offsetX, $offsetY, $drawWidth, $drawHeight)

            $canvas,$gfx = New-Canvas -Size $size
            $gfx.DrawImage($cropped, $destRect)
            $gfx.Dispose()

            $roundCanvas,$roundGfx = New-Canvas -Size $size
            $path = New-Object System.Drawing.Drawing2D.GraphicsPath
            $path.AddEllipse(0, 0, $size, $size)
            $roundGfx.SetClip($path)
            $roundGfx.DrawImage($cropped, $destRect)
            $path.Dispose()
            $roundGfx.Dispose()

            $icPath = Join-Path $dir "ic_launcher.png"
            $canvas.Save($icPath, [System.Drawing.Imaging.ImageFormat]::Png)
            $canvas.Dispose()

            $roundPath = Join-Path $dir "ic_launcher_round.png"
            $roundCanvas.Save($roundPath, [System.Drawing.Imaging.ImageFormat]::Png)
            $roundCanvas.Dispose()
        }
    }
    finally {
        $cropped.Dispose()
    }
}
finally {
    $source.Dispose()
}
