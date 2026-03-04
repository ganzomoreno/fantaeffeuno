const fs = require('fs');
const readline = require('readline');
const { execSync } = require('child_process');

try {
    // We can just use powershell from node, but cleaner
    const psh = `
    Add-Type -AssemblyName System.IO.Compression.FileSystem;
    $docx = 'C:\\Users\\azani\\OneDrive\\Desktop\\Vibecodingz\\fantaformula1\\FantaFormula1 - 2026.docx';
    $zip = [System.IO.Compression.ZipFile]::OpenRead($docx);
    $entry = $zip.GetEntry('word/document.xml');
    $stream = $entry.Open();
    $reader = New-Object IO.StreamReader($stream);
    $xml = $reader.ReadToEnd();
    $reader.Close();
    $zip.Dispose();
    $text = $xml -replace '<w:p[^>]*>', "\n" -replace '<[^>]+>', '';
    Write-Output $text
  `;
    fs.writeFileSync('C:\\Users\\azani\\OneDrive\\Desktop\\Vibecodingz\\fantaformula1\\read_docx.ps1', psh);
    const output = execSync('powershell -ExecutionPolicy Bypass -File C:\\Users\\azani\\OneDrive\\Desktop\\Vibecodingz\\fantaformula1\\read_docx.ps1').toString();
    fs.writeFileSync('C:\\Users\\azani\\OneDrive\\Desktop\\Vibecodingz\\fantaformula1\\rules.txt', output);
    console.log("Success");
} catch (e) {
    console.error(e.message);
}
