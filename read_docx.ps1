
    Add-Type -AssemblyName System.IO.Compression.FileSystem;
    $docx = 'C:\Users\azani\OneDrive\Desktop\Vibecodingz\fantaformula1\FantaFormula1 - 2026.docx';
    $zip = [System.IO.Compression.ZipFile]::OpenRead($docx);
    $entry = $zip.GetEntry('word/document.xml');
    $stream = $entry.Open();
    $reader = New-Object IO.StreamReader($stream);
    $xml = $reader.ReadToEnd();
    $reader.Close();
    $zip.Dispose();
    $text = $xml -replace '<w:p[^>]*>', "
" -replace '<[^>]+>', '';
    Write-Output $text
  