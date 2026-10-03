# Crea el Word desde la guía y adjunta los seis archivos de código probados.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression

$root = (Resolve-Path '.').Path
$build = Join-Path $root '.docx-build'
$wordDir = Join-Path $build 'word'
$wordRelsDir = Join-Path $wordDir '_rels'
$relsDir = Join-Path $build '_rels'
New-Item -ItemType Directory -Force -Path $wordDir,$wordRelsDir,$relsDir | Out-Null

$contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'
$rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
$wordRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
$styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="21"/><w:color w:val="17243A"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="40"/><w:color w:val="000000"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="27"/><w:color w:val="000000"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="23"/><w:color w:val="000000"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="16"/><w:color w:val="24334B"/></w:rPr></w:style></w:styles>'

$script:sb = [System.Text.StringBuilder]::new()
[void]$script:sb.Append('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>')

function Add-Paragraph {
  param(
    [string]$Text,
    [string]$Style = 'Normal',
    [int]$Before = 0,
    [int]$After = 100,
    [int]$Size = 21,
    [string]$Font = 'Aptos',
    [string]$Color = '17243A',
    [switch]$Bold,
    [switch]$List,
    [switch]$Code,
    [switch]$PageBreak
  )
  $escaped = [System.Security.SecurityElement]::Escape($Text)
  $pPr = '<w:pStyle w:val="' + $Style + '"/><w:spacing w:before="' + $Before + '" w:after="' + $After + '"/>'
  if ($List) { $pPr += '<w:ind w:left="560" w:hanging="320"/>' }
  if ($PageBreak) { $pPr += '<w:pageBreakBefore/>' }
  if ($Code) { $pPr += '<w:shd w:fill="F4F6FA"/><w:spacing w:before="0" w:after="0" w:line="218" w:lineRule="auto"/>' }
  if ($Style -ne 'Normal' -and -not $Code) { $pPr += '<w:keepNext/>' }
  $rPr = '<w:rFonts w:ascii="' + $Font + '" w:hAnsi="' + $Font + '"/><w:sz w:val="' + $Size + '"/><w:color w:val="' + $Color + '"/>'
  if ($Bold) { $rPr += '<w:b/>' }
  [void]$script:sb.Append('<w:p><w:pPr>' + $pPr + '</w:pPr><w:r><w:rPr>' + $rPr + '</w:rPr><w:t xml:space="preserve">' + $escaped + '</w:t></w:r></w:p>')
}

function Add-CodeBlock {
  param([string[]]$Lines)
  [void]$script:sb.Append('<w:p><w:pPr><w:pStyle w:val="Code"/><w:spacing w:before="0" w:after="100" w:line="218" w:lineRule="auto"/><w:shd w:fill="F4F6FA"/></w:pPr>')
  for ($i = 0; $i -lt $Lines.Count; $i++) {
    $escaped = [System.Security.SecurityElement]::Escape($Lines[$i])
    [void]$script:sb.Append('<w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="16"/><w:color w:val="24334B"/></w:rPr><w:t xml:space="preserve">' + $escaped + '</w:t>')
    if ($i -lt $Lines.Count - 1) { [void]$script:sb.Append('<w:br/>') }
    [void]$script:sb.Append('</w:r>')
  }
  [void]$script:sb.Append('</w:p>')
}

foreach ($line in (Get-Content -LiteralPath (Join-Path $root 'GUIA_EQUIPO.md') -Encoding UTF8)) {
  if ([string]::IsNullOrWhiteSpace($line)) { continue }
  $text = $line.Replace('**','').Replace('`','')
  if ($text.StartsWith('# ')) {
    Add-Paragraph -Text $text.Substring(2) -Style 'Title' -After 260 -Size 40 -Color '000000' -Bold
  } elseif ($text.StartsWith('## ')) {
    Add-Paragraph -Text $text.Substring(3) -Style 'Heading1' -Before 250 -After 130 -Size 27 -Color '000000' -Bold
  } elseif ($text.StartsWith('### ')) {
    Add-Paragraph -Text $text.Substring(4) -Style 'Heading2' -Before 180 -After 100 -Size 23 -Color '000000' -Bold
  } elseif ($text.StartsWith('- ')) {
    Add-Paragraph -Text (([char]0x2022) + ' ' + $text.Substring(2)) -List
  } elseif ($text -match '^\d+\. ') {
    Add-Paragraph -Text $text -List
  } else {
    Add-Paragraph -Text $text
  }
}

Add-Paragraph -Text '10 Código completo para implementar' -Style 'Heading1' -Before 250 -After 130 -Size 27 -Color '000000' -Bold -PageBreak
Add-Paragraph -Text 'Cada archivo siguiente corresponde a la versión final compilada. Copie sus partes siguiendo los diez hitos de la sección de su integrante. Los archivos de guía/fuentes contienen el mismo texto para facilitar el copiado desde un editor.'

$fuentes = @(
  @{ Titulo = 'Matias  src/utils/rut.ts'; Archivo = 'guia/fuentes/matias/rut.ts'; NuevaPagina = $true },
  @{ Titulo = 'Matias  src/pages/NuevoExpedientePage.tsx'; Archivo = 'guia/fuentes/matias/NuevoExpedientePage.tsx'; NuevaPagina = $true },
  @{ Titulo = 'Matias  src/pages/NuevoExpedientePage.css'; Archivo = 'guia/fuentes/matias/NuevoExpedientePage.css'; NuevaPagina = $true },
  @{ Titulo = 'Fabian  src/services/actas.ts'; Archivo = 'guia/fuentes/fabian/actas.ts'; NuevaPagina = $true },
  @{ Titulo = 'Fabian  src/pages/ExpedienteDetallePage.tsx'; Archivo = 'guia/fuentes/fabian/ExpedienteDetallePage.tsx'; NuevaPagina = $true },
  @{ Titulo = 'Fabian  src/pages/ExpedienteDetallePage.css'; Archivo = 'guia/fuentes/fabian/ExpedienteDetallePage.css'; NuevaPagina = $true }
)
foreach ($fuente in $fuentes) {
  Add-Paragraph -Text $fuente.Titulo -Style 'Heading2' -Before 180 -After 130 -Size 23 -Color '000000' -Bold -PageBreak:$fuente.NuevaPagina
  $lineas = @(Get-Content -LiteralPath (Join-Path $root $fuente.Archivo) -Encoding UTF8)
  for ($inicio = 0; $inicio -lt $lineas.Count; $inicio += 35) {
    $fin = [Math]::Min($inicio + 34, $lineas.Count - 1)
    Add-CodeBlock -Lines @($lineas[$inicio..$fin])
  }
}

[void]$script:sb.Append('<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="900" w:right="900" w:bottom="900" w:left="900" w:header="600" w:footer="600"/></w:sectPr></w:body></w:document>')
[System.IO.File]::WriteAllText((Join-Path $build '[Content_Types].xml'),$contentTypes,[System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText((Join-Path $relsDir '.rels'),$rels,[System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText((Join-Path $wordRelsDir 'document.xml.rels'),$wordRels,[System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText((Join-Path $wordDir 'styles.xml'),$styles,[System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText((Join-Path $wordDir 'document.xml'),$script:sb.ToString(),[System.Text.Encoding]::UTF8)

$output = Join-Path $root 'Guia_trabajo_y_commits_Advance_ICI.docx'
if (Test-Path -LiteralPath $output) { Remove-Item -LiteralPath $output }
$zip = [System.IO.Compression.ZipFile]::Open($output,[System.IO.Compression.ZipArchiveMode]::Create)
try {
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,(Join-Path $build '[Content_Types].xml'),'[Content_Types].xml') | Out-Null
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,(Join-Path $relsDir '.rels'),'_rels/.rels') | Out-Null
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,(Join-Path $wordRelsDir 'document.xml.rels'),'word/_rels/document.xml.rels') | Out-Null
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,(Join-Path $wordDir 'document.xml'),'word/document.xml') | Out-Null
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,(Join-Path $wordDir 'styles.xml'),'word/styles.xml') | Out-Null
} finally { $zip.Dispose() }
Write-Output ('DOCX bytes: ' + (Get-Item -LiteralPath $output).Length)
