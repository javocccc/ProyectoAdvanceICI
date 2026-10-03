# Crea un DOCX editable a partir de GUIA_EQUIPO.md usando el formato OOXML.
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
$styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="21"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="44"/><w:color w:val="000000"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="102B61"/></w:rPr></w:style></w:styles>'
$sb = [System.Text.StringBuilder]::new()
[void]$sb.Append('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>')
foreach ($line in (Get-Content -LiteralPath (Join-Path $root 'GUIA_EQUIPO.md') -Encoding UTF8)) {
  if ([string]::IsNullOrWhiteSpace($line)) { continue }
  $text = $line.Replace('**','').Replace('`','')
  $style = 'Normal'
  $before = 0
  $after = 120
  $indent = ''
  $size = 21
  $bold = ''
  $color = '17243A'
  if ($text.StartsWith('# ')) {
    $text = $text.Substring(2); $style = 'Title'; $after = 300; $size = 44; $bold = '<w:b/>'; $color = '000000'
  } elseif ($text.StartsWith('## ')) {
    $text = $text.Substring(3); $style = 'Heading1'; $before = 260; $after = 150; $size = 28; $bold = '<w:b/>'; $color = '102B61'
  } elseif ($text.StartsWith('- ')) {
    $text = ([char]0x2022) + ' ' + $text.Substring(2); $indent = '<w:ind w:left="560" w:hanging="320"/>'
  } elseif ($text -match '^\d+\. ') {
    $indent = '<w:ind w:left="560" w:hanging="320"/>'
  }
  $escaped = [System.Security.SecurityElement]::Escape($text)
  [void]$sb.Append('<w:p><w:pPr><w:pStyle w:val="' + $style + '"/><w:spacing w:before="' + $before + '" w:after="' + $after + '"/>' + $indent + '</w:pPr><w:r><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="' + $size + '"/>' + $bold + '<w:color w:val="' + $color + '"/></w:rPr><w:t xml:space="preserve">' + $escaped + '</w:t></w:r></w:p>')
}
[void]$sb.Append('<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1304" w:right="1332" w:bottom="1191" w:left="1332" w:header="708" w:footer="708"/></w:sectPr></w:body></w:document>')
[System.IO.File]::WriteAllText((Join-Path $build '[Content_Types].xml'),$contentTypes,[System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText((Join-Path $relsDir '.rels'),$rels,[System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText((Join-Path $wordRelsDir 'document.xml.rels'),$wordRels,[System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText((Join-Path $wordDir 'styles.xml'),$styles,[System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText((Join-Path $wordDir 'document.xml'),$sb.ToString(),[System.Text.Encoding]::UTF8)
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
