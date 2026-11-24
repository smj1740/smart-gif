param(
    [Parameter(Mandatory = $true)][string]$SdkRoot,
    [Parameter(Mandatory = $true)][string]$JavaHome
)

$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$SdkRoot = (Resolve-Path -LiteralPath $SdkRoot).Path
$JavaHome = (Resolve-Path -LiteralPath $JavaHome).Path
$env:JAVA_HOME = $JavaHome
$tools = Join-Path $SdkRoot 'build-tools/35.0.0'
$platform = Join-Path $SdkRoot 'platforms/android-35/android.jar'
$build = Join-Path $PSScriptRoot '.build'
$assets = Join-Path $build 'assets'
$classes = Join-Path $build 'classes'
$dex = Join-Path $build 'dex'
$unsigned = Join-Path $build 'unsigned.apk'
$aligned = Join-Path $build 'aligned.apk'
$apk = Join-Path $project 'Smart-GIF-Android.apk'
$key = Join-Path $build 'debug.keystore'

function Invoke-BuildTool([string]$Executable, [string[]]$Arguments) {
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Build command failed: $Executable ($LASTEXITCODE)" }
}

New-Item -ItemType Directory -Force -Path $assets,$classes,$dex | Out-Null
foreach ($name in @('editor.css','editor.js','editor-engine.js','assets','lib')) {
    Copy-Item -LiteralPath (Join-Path $project $name) -Destination $assets -Recurse -Force
}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'android-save.js') -Destination $assets -Force
$html = [IO.File]::ReadAllText((Join-Path $project 'index.html'))
$html = $html.Replace('<script src="editor.js"></script>',
    '<script src="android-save.js"></script><script src="editor.js"></script>')
[IO.File]::WriteAllText((Join-Path $assets 'index.html'), $html, [Text.UTF8Encoding]::new($false))

Invoke-BuildTool (Join-Path $JavaHome 'bin/javac.exe') @(
    '-encoding','UTF-8','--release','8','-classpath',$platform,'-d',$classes,
    (Join-Path $PSScriptRoot 'MainActivity.java'))
$compiled = @(Get-ChildItem -LiteralPath $classes -Recurse -Filter '*.class' | ForEach-Object FullName)
Invoke-BuildTool (Join-Path $tools 'd8.bat') (@('--min-api','24','--lib',$platform,'--output',$dex) + $compiled)
Push-Location -LiteralPath $project
try {
    Invoke-BuildTool (Join-Path $tools 'aapt2.exe') @(
        'link','-I',(Resolve-Path -Relative -LiteralPath $platform),
        '--manifest','android/AndroidManifest.xml','-o','android/.build/unsigned.apk')
} finally {
    Pop-Location
}
Invoke-BuildTool (Join-Path $JavaHome 'bin/jar.exe') @(
    'uf',$unsigned,'-C',$dex,'classes.dex','-C',$build,'assets')
Push-Location -LiteralPath $build
try {
    Invoke-BuildTool (Join-Path $tools 'zipalign.exe') @('-f','4','unsigned.apk','aligned.apk')
} finally {
    Pop-Location
}
if (!(Test-Path -LiteralPath $key)) {
    Invoke-BuildTool (Join-Path $JavaHome 'bin/keytool.exe') @(
        '-genkeypair','-keystore',$key,'-storepass','android','-keypass','android',
        '-alias','androiddebugkey','-keyalg','RSA','-keysize','2048','-validity','10000',
        '-dname','CN=Android Debug,O=Android,C=US')
}
Invoke-BuildTool (Join-Path $tools 'apksigner.bat') @(
    'sign','--ks',$key,'--ks-key-alias','androiddebugkey','--ks-pass','pass:android',
    '--key-pass','pass:android','--out',$apk,$aligned)
Invoke-BuildTool (Join-Path $tools 'apksigner.bat') @('verify','--verbose',$apk)
Get-Item -LiteralPath $apk
